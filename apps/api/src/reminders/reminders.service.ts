import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { EmailService } from '../email/email.service'
import { DEFAULT_REMINDER_TEMPLATES } from './reminders.seed'
import type { ReminderListQueryDto, CreateReminderDto, UpdateTemplateDto } from './dto/reminders.dto'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private email:  EmailService,
  ) {}

  // ─── TEMPLATES (tenant-wide, no property scope) ─────────────

  async listTemplates(user: AuthUser) {
    return this.prisma.reminderTemplate.findMany({
      where:   { tenantId: user.tenantId },
      orderBy: { level: 'asc' },
      include: { _count: { select: { reminders: true } } },
    })
  }

  async seedDefaultTemplates(user: AuthUser) {
    const existing = await this.prisma.reminderTemplate.count({
      where: { tenantId: user.tenantId },
    })
    if (existing > 0) return { message: 'Šablony již existují', count: existing }

    const created = await this.prisma.$transaction(
      DEFAULT_REMINDER_TEMPLATES.map((t) =>
        this.prisma.reminderTemplate.create({
          data: { tenantId: user.tenantId, ...t },
        })
      )
    )
    return { message: 'Výchozí šablony vytvořeny', count: created.length }
  }

  async updateTemplate(user: AuthUser, id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.reminderTemplate.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!template) throw new NotFoundException('Šablona nenalezena')
    return this.prisma.reminderTemplate.update({
      where: { id },
      data:  dto,
    })
  }

  // ─── DEBTORS (property-scoped) ──────────────────────────────

  async listDebtors(user: AuthUser) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)

    const residents = await this.prisma.resident.findMany({
      where:   { tenantId: user.tenantId, hasDebt: true, isActive: true, ...scopeWhere } as any,
      orderBy: { lastName: 'asc' },
      include: {
        property: { select: { id: true, name: true } },
        unit:     { select: { id: true, name: true } },
        reminders: {
          orderBy: { createdAt: 'desc' },
          take:    1,
        },
      },
    })

    return residents.map((r) => {
      const lastReminder  = r.reminders[0]
      const daysSince     = lastReminder
        ? Math.floor(
            (Date.now() - lastReminder.createdAt.getTime()) / 86_400_000
          )
        : null

      return {
        ...r,
        createdAt:    r.createdAt.toISOString(),
        updatedAt:    r.updatedAt.toISOString(),
        lastReminder: lastReminder ?? null,
        agingBucket:  this.getAgingBucket(daysSince),
        daysSinceLastReminder: daysSince,
      }
    })
  }

  private getAgingBucket(days: number | null): string {
    if (days === null) return 'no_reminder'
    if (days <= 30)    return '0_30'
    if (days <= 60)    return '31_60'
    if (days <= 90)    return '61_90'
    return '90_plus'
  }

  // ─── REMINDERS (property-scoped via resident) ───────────────

  async listReminders(user: AuthUser, query: ReminderListQueryDto) {
    const { residentId, status, level, page = 1, limit = 20 } = query
    const skip = (page - 1) * limit

    const reminderScope = await this.scope.scopeByRelation(user, 'resident')

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...reminderScope,
      ...(residentId ? { residentId } : {}),
      ...(status     ? { status }     : {}),
      ...(level      ? { level }      : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.reminder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip,
        include: {
          resident: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              property: { select: { id: true, name: true } },
            },
          },
          template: { select: { id: true, name: true } },
        },
      }),
      this.prisma.reminder.count({ where }),
    ])

    return {
      data: items.map((r) => ({
        ...r,
        amount:    Number(r.amount),
        dueDate:   r.dueDate.toISOString(),
        sentAt:    r.sentAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async createReminder(user: AuthUser, dto: CreateReminderDto) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, tenantId: user.tenantId },
    })
    if (!resident) throw new NotFoundException('Resident nenalezen')

    await this.scope.verifyEntityAccess(user, resident.propertyId)

    const reminder = await this.prisma.reminder.create({
      data: {
        tenantId:   user.tenantId,
        residentId: dto.residentId,
        templateId: dto.templateId ?? null,
        level:      dto.level as any,
        status:     'draft',
        amount:     dto.amount,
        dueDate:    new Date(dto.dueDate),
        note:       dto.note ?? null,
      },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true } },
        template: { select: { id: true, name: true } },
      },
    })

    await this.prisma.resident.update({
      where: { id: dto.residentId },
      data:  { hasDebt: true },
    })

    return {
      ...reminder,
      amount:    Number(reminder.amount),
      dueDate:   reminder.dueDate.toISOString(),
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
    }
  }

  async bulkCreateReminders(user: AuthUser, dto: {
    residentIds: string[]
    level:       string
    templateId?: string
    amount?:     number
    dueDate:     string
  }) {
    const results = await Promise.allSettled(
      dto.residentIds.map((residentId) =>
        this.createReminder(user, {
          residentId,
          level: dto.level,
          templateId: dto.templateId,
          amount: dto.amount ?? 0,
          dueDate: dto.dueDate,
        })
      )
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed    = results.filter((r) => r.status === 'rejected').length

    return { succeeded, failed, total: dto.residentIds.length }
  }

  async markAsSent(user: AuthUser, id: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        resident: { select: { firstName: true, lastName: true, email: true, propertyId: true } },
        template: true,
      },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')

    await this.scope.verifyEntityAccess(user, reminder.resident.propertyId)

    const updated = await this.prisma.reminder.update({
      where: { id },
      data:  { status: 'sent', sentAt: new Date() },
    })

    // Odeslat email pokud resident ma email
    if (reminder.resident.email) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
      })

      const vars: Record<string, string> = {
        firstName:  reminder.resident.firstName,
        lastName:   reminder.resident.lastName,
        tenantName: tenant?.name ?? '',
        amount:     Number(reminder.amount).toLocaleString('cs-CZ'),
        dueDate:    reminder.dueDate.toLocaleDateString('cs-CZ'),
      }
      const render = (t: string) =>
        t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`)

      const subject = render(reminder.template?.subject ?? 'Upominka platby')
      const body    = render(reminder.template?.body    ?? subject)

      await this.email.sendReminder({
        to:         reminder.resident.email,
        firstName:  reminder.resident.firstName,
        lastName:   reminder.resident.lastName,
        tenantName: tenant?.name ?? '',
        subject,
        body,
        amount:     Number(reminder.amount),
        dueDate:    reminder.dueDate.toISOString(),
        level:      reminder.level,
      })
    }

    return updated
  }

  async markAsPaid(user: AuthUser, id: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { resident: { select: { id: true, propertyId: true } } },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')

    await this.scope.verifyEntityAccess(user, reminder.resident.propertyId)

    const updated = await this.prisma.reminder.update({
      where: { id },
      data:  { status: 'paid' },
    })

    const activeCount = await this.prisma.reminder.count({
      where: {
        residentId: reminder.residentId,
        status:     { in: ['draft', 'sent'] },
      },
    })
    if (activeCount === 0) {
      await this.prisma.resident.update({
        where: { id: reminder.residentId },
        data:  { hasDebt: false },
      })
    }

    return updated
  }

  async renderTemplate(user: AuthUser, templateId: string, residentId: string) {
    const [template, resident, tenant] = await Promise.all([
      this.prisma.reminderTemplate.findFirst({
        where: { id: templateId, tenantId: user.tenantId },
      }),
      this.prisma.resident.findFirst({
        where: { id: residentId, tenantId: user.tenantId },
      }),
      this.prisma.tenant.findUnique({ where: { id: user.tenantId } }),
    ])

    if (!template) throw new NotFoundException('Šablona nenalezena')
    if (!resident) throw new NotFoundException('Resident nenalezen')

    await this.scope.verifyEntityAccess(user, resident.propertyId)

    const vars: Record<string, string> = {
      firstName:  resident.firstName,
      lastName:   resident.lastName,
      tenantName: tenant?.name ?? '',
      amount:     '0',
      dueDate:    new Date(
        Date.now() + template.dueDays * 86_400_000
      ).toLocaleDateString('cs-CZ'),
    }

    const render = (text: string) =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)

    return {
      subject: render(template.subject),
      body:    render(template.body),
      vars,
    }
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class RecurringPlansService {
  private readonly logger = new Logger(RecurringPlansService.name)

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  // ─── CRUD ───────────────────────────────────────────────────

  async list(user: AuthUser, query?: { assetId?: string; isActive?: string }) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const where: any = { tenantId: user.tenantId, ...scopeWhere }
    if (query?.assetId) where.assetId = query.assetId
    if (query?.isActive === 'true') where.isActive = true
    if (query?.isActive === 'false') where.isActive = false

    return this.prisma.recurringActivityPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { generatedTickets: true } },
      },
    })
  }

  async getById(user: AuthUser, id: string) {
    const plan = await this.prisma.recurringActivityPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { generatedTickets: true } },
      },
    })
    if (!plan) throw new NotFoundException('Plán nenalezen')
    return plan
  }

  async create(user: AuthUser, dto: {
    title: string
    description?: string
    category?: string
    propertyId?: string
    assetId?: string
    scheduleMode?: string
    frequencyUnit?: string
    frequencyInterval?: number
    dayOfWeek?: number
    dayOfMonth?: number
    monthOfYear?: number
    leadDays?: number
    priority?: string
    assigneeUserId?: string
    nextPlannedAt?: string
  }) {
    if (dto.propertyId) await this.scope.verifyPropertyAccess(user, dto.propertyId)

    const nextPlanned = dto.nextPlannedAt ? new Date(dto.nextPlannedAt) : this.computeNextOccurrence({
      scheduleMode: dto.scheduleMode ?? 'calendar',
      frequencyUnit: dto.frequencyUnit ?? 'day',
      frequencyInterval: dto.frequencyInterval ?? 1,
      dayOfWeek: dto.dayOfWeek, dayOfMonth: dto.dayOfMonth, monthOfYear: dto.monthOfYear,
    }, new Date())

    return this.prisma.recurringActivityPlan.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        description: dto.description,
        category: dto.category ?? 'maintenance',
        propertyId: dto.propertyId || null,
        assetId: dto.assetId || null,
        scheduleMode: dto.scheduleMode ?? 'calendar',
        frequencyUnit: dto.frequencyUnit ?? 'day',
        frequencyInterval: dto.frequencyInterval ?? 1,
        dayOfWeek: dto.dayOfWeek ?? null,
        dayOfMonth: dto.dayOfMonth ?? null,
        monthOfYear: dto.monthOfYear ?? null,
        leadDays: dto.leadDays ?? 0,
        priority: dto.priority ?? 'medium',
        assigneeUserId: dto.assigneeUserId || null,
        nextPlannedAt: nextPlanned,
      },
      include: {
        property: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })
  }

  async update(user: AuthUser, id: string, dto: Record<string, unknown>) {
    await this.getById(user, id)
    const data: any = {}
    for (const key of ['title', 'description', 'category', 'propertyId', 'assetId', 'scheduleMode',
      'frequencyUnit', 'frequencyInterval', 'dayOfWeek', 'dayOfMonth', 'monthOfYear',
      'leadDays', 'priority', 'assigneeUserId', 'isActive', 'nextPlannedAt'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key] === '' ? null : dto[key]
    }
    if (data.nextPlannedAt && typeof data.nextPlannedAt === 'string') data.nextPlannedAt = new Date(data.nextPlannedAt)

    // SECURITY: tenantId in WHERE prevents cross-tenant writes (Wave 2)
    return this.prisma.recurringActivityPlan.update({ where: { id, tenantId: user.tenantId }, data })
  }

  async remove(user: AuthUser, id: string) {
    await this.getById(user, id)
    // SECURITY: tenantId in WHERE prevents cross-tenant writes (Wave 2)
    await this.prisma.recurringActivityPlan.delete({ where: { id, tenantId: user.tenantId } })
  }

  // ─── GENERATION ─────────────────────────────────────────────

  async generatePendingTickets(): Promise<{ checked: number; generated: number; skipped: number }> {
    const now = new Date()
    const plans = await this.prisma.recurringActivityPlan.findMany({
      where: { isActive: true, nextPlannedAt: { lte: now } },
      include: { property: { select: { id: true } } },
    })

    let generated = 0
    let skipped = 0

    for (const plan of plans) {
      try {
        const effectiveDate = plan.nextPlannedAt!
        const genKey = `rp-${plan.id}-${effectiveDate.toISOString().slice(0, 10)}`

        // Idempotency: check if ticket already exists for this key
        const existing = await this.prisma.helpdeskTicket.findUnique({
          where: { generationKey: genKey },
          select: { id: true },
        })

        if (existing) {
          skipped++
          // Still advance nextPlannedAt if needed
          await this.advancePlan(plan)
          continue
        }

        // Get next ticket number
        const last = await this.prisma.helpdeskTicket.findFirst({
          where: { tenantId: plan.tenantId },
          orderBy: { number: 'desc' },
          select: { number: true },
        })
        const number = (last?.number ?? 0) + 1

        // Create helpdesk ticket
        await this.prisma.helpdeskTicket.create({
          data: {
            tenantId: plan.tenantId,
            number,
            title: plan.title,
            description: plan.description,
            category: 'general' as any,
            priority: (plan.priority as any) ?? 'medium',
            propertyId: plan.propertyId,
            assetId: plan.assetId,
            assigneeId: plan.assigneeUserId,
            recurringPlanId: plan.id,
            generationKey: genKey,
            plannedForDate: effectiveDate,
            requestOrigin: 'recurring_plan',
            resolutionDueAt: effectiveDate,
          },
        })

        generated++

        // Advance plan
        await this.advancePlan(plan)

        this.logger.log(`Generated ticket for plan ${plan.id} (${plan.title}), date: ${effectiveDate.toISOString().slice(0, 10)}`)
      } catch (err) {
        this.logger.error(`Generation failed for plan ${plan.id}: ${err}`)
      }
    }

    return { checked: plans.length, generated, skipped }
  }

  private async advancePlan(plan: any) {
    if (plan.scheduleMode === 'from_completion') {
      // For from-completion mode, don't auto-advance — wait for completion callback
      return
    }

    const next = this.computeNextOccurrence({
      scheduleMode: plan.scheduleMode,
      frequencyUnit: plan.frequencyUnit,
      frequencyInterval: plan.frequencyInterval,
      dayOfWeek: plan.dayOfWeek,
      dayOfMonth: plan.dayOfMonth,
      monthOfYear: plan.monthOfYear,
    }, plan.nextPlannedAt!)

    await this.prisma.recurringActivityPlan.update({
      where: { id: plan.id },
      data: { nextPlannedAt: next, lastGeneratedAt: new Date() },
    })
  }

  async markCompleted(planId: string, completedAt: Date) {
    const plan = await this.prisma.recurringActivityPlan.findUnique({
      where: { id: planId },
    })
    if (!plan || !plan.isActive) return

    const data: any = { lastCompletedAt: completedAt }

    if (plan.scheduleMode === 'from_completion') {
      data.nextPlannedAt = this.computeNextOccurrence({
        scheduleMode: plan.scheduleMode,
        frequencyUnit: plan.frequencyUnit,
        frequencyInterval: plan.frequencyInterval,
        dayOfWeek: plan.dayOfWeek,
        dayOfMonth: plan.dayOfMonth,
        monthOfYear: plan.monthOfYear,
      }, completedAt)
    }

    await this.prisma.recurringActivityPlan.update({ where: { id: planId }, data })
  }

  // ─── RECURRENCE COMPUTATION ─────────────────────────────────

  computeNextOccurrence(plan: {
    scheduleMode: string; frequencyUnit: string; frequencyInterval: number;
    dayOfWeek?: number | null; dayOfMonth?: number | null; monthOfYear?: number | null;
  }, fromDate: Date): Date {
    const d = new Date(fromDate)

    switch (plan.frequencyUnit) {
      case 'day':
        d.setDate(d.getDate() + plan.frequencyInterval)
        break
      case 'week':
        d.setDate(d.getDate() + 7 * plan.frequencyInterval)
        break
      case 'month':
        d.setMonth(d.getMonth() + plan.frequencyInterval)
        if (plan.dayOfMonth) d.setDate(Math.min(plan.dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
        break
      case 'year':
        d.setFullYear(d.getFullYear() + plan.frequencyInterval)
        if (plan.monthOfYear) d.setMonth(plan.monthOfYear - 1)
        if (plan.dayOfMonth) d.setDate(Math.min(plan.dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
        break
    }

    return d
  }
}

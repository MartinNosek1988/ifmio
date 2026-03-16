import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

@Injectable()
export class KontoRemindersService {
  constructor(private prisma: PrismaService) {}

  async generateReminders(
    tenantId: string,
    propertyId: string,
    options: { minAmount?: number; minDaysOverdue?: number }
  ) {
    const minAmount = options.minAmount ?? 100
    const minDays = options.minDaysOverdue ?? 15

    // Get debtor accounts
    const accounts = await this.prisma.ownerAccount.findMany({
      where: { tenantId, propertyId, currentBalance: { gte: minAmount } },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
        entries: {
          where: { type: 'DEBIT' },
          orderBy: { postingDate: 'asc' },
          take: 1,
          select: { postingDate: true },
        },
      },
    })

    const now = new Date()
    const created: any[] = []

    for (const acc of accounts) {
      // Check oldest debit date
      const oldestDebit = acc.entries[0]
      if (!oldestDebit) continue
      const daysOverdue = Math.floor((now.getTime() - oldestDebit.postingDate.getTime()) / 86_400_000)
      if (daysOverdue < minDays) continue

      // Check for existing active reminder (DRAFT or SENT)
      const existingActive = await this.prisma.kontoReminder.findFirst({
        where: { accountId: acc.id, status: { in: ['DRAFT', 'SENT'] } },
      })
      if (existingActive) continue

      // Determine reminder level
      const prevCount = await this.prisma.kontoReminder.count({
        where: { accountId: acc.id },
      })
      const level = Math.min(prevCount + 1, 3)

      // Generate text and due date based on level
      const deadlineDays = level === 1 ? 15 : level === 2 ? 10 : 7
      const dueDate = new Date(now.getTime() + deadlineDays * 86_400_000)

      const residentName = acc.resident.isLegalEntity && acc.resident.companyName
        ? acc.resident.companyName
        : `${acc.resident.firstName} ${acc.resident.lastName}`

      const text = this.generateReminderText(
        level, residentName, acc.unit.name, acc.property.name,
        new Decimal(acc.currentBalance), oldestDebit.postingDate, dueDate,
      )

      const reminder = await this.prisma.kontoReminder.create({
        data: {
          tenantId,
          propertyId,
          accountId: acc.id,
          residentId: acc.residentId,
          unitId: acc.unitId,
          reminderNumber: level,
          amount: acc.currentBalance,
          dueDate,
          status: 'DRAFT',
          generatedText: text,
        },
        include: {
          resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
          unit: { select: { id: true, name: true } },
        },
      })

      created.push({
        ...reminder,
        amount: Number(reminder.amount),
        dueDate: reminder.dueDate.toISOString(),
        createdAt: reminder.createdAt.toISOString(),
        updatedAt: reminder.updatedAt.toISOString(),
      })
    }

    return created
  }

  private generateReminderText(
    level: number,
    residentName: string,
    unitName: string,
    propertyName: string,
    amount: Decimal,
    oldestDebtDate: Date,
    dueDate: Date,
  ): string {
    const fmtAmount = Number(amount).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })
    const fmtOldest = oldestDebtDate.toLocaleDateString('cs-CZ')
    const fmtDue = dueDate.toLocaleDateString('cs-CZ')

    if (level === 1) {
      return `Vážený/á ${residentName},\n\ndovolujeme si Vás upozornit, že na Vašem kontě pro jednotku ${unitName} v objektu ${propertyName} evidujeme nedoplatek ve výši ${fmtAmount} Kč.\n\nNejstarší neuhrazený předpis je ze dne ${fmtOldest}.\n\nProsíme o úhradu do ${fmtDue}.\n\nS pozdravem,\nspráva objektu`
    }
    if (level === 2) {
      return `Vážený/á ${residentName},\n\nopětovně Vás upozorňujeme na neuhrazený nedoplatek ve výši ${fmtAmount} Kč na Vašem kontě pro jednotku ${unitName} v objektu ${propertyName}.\n\nNejstarší neuhrazený předpis je ze dne ${fmtOldest}.\n\nUpozorňujeme, že v případě dalšího prodlení může být dluh navýšen o úrok z prodlení. Prosíme o úhradu nejpozději do ${fmtDue}.\n\nS pozdravem,\nspráva objektu`
    }
    return `Vážený/á ${residentName},\n\nTOTO JE POSLEDNÍ UPOMÍNKA. Na Vašem kontě pro jednotku ${unitName} v objektu ${propertyName} nadále evidujeme nedoplatek ve výši ${fmtAmount} Kč.\n\nNejstarší neuhrazený předpis je ze dne ${fmtOldest}.\n\nPokud nebude dluh uhrazen do ${fmtDue}, budeme nuceni přistoupit k vymáhání pohledávky právní cestou, včetně uplatnění nákladů řízení.\n\nS pozdravem,\nspráva objektu`
  }

  async markAsSent(tenantId: string, reminderId: string, method: string) {
    const reminder = await this.prisma.kontoReminder.findFirst({
      where: { id: reminderId, tenantId },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')
    if (reminder.status !== 'DRAFT') throw new BadRequestException('Odeslat lze pouze upomínku ve stavu DRAFT')

    return this.prisma.kontoReminder.update({
      where: { id: reminderId },
      data: { status: 'SENT', sentAt: new Date(), sentMethod: method as any },
    })
  }

  async markAsResolved(tenantId: string, reminderId: string) {
    const reminder = await this.prisma.kontoReminder.findFirst({
      where: { id: reminderId, tenantId },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')
    if (!['DRAFT', 'SENT', 'ACKNOWLEDGED'].includes(reminder.status)) {
      throw new BadRequestException(`Upomínku ve stavu "${reminder.status}" nelze označit jako vyřešenou`)
    }
    return this.prisma.kontoReminder.update({
      where: { id: reminderId },
      data: { status: 'RESOLVED' },
    })
  }

  async cancelReminder(tenantId: string, reminderId: string) {
    const reminder = await this.prisma.kontoReminder.findFirst({
      where: { id: reminderId, tenantId },
    })
    if (!reminder) throw new NotFoundException('Upomínka nenalezena')
    if (!['DRAFT', 'SENT'].includes(reminder.status)) {
      throw new BadRequestException(`Upomínku ve stavu "${reminder.status}" nelze zrušit`)
    }
    return this.prisma.kontoReminder.update({
      where: { id: reminderId },
      data: { status: 'CANCELLED' },
    })
  }

  async getPropertyReminders(
    tenantId: string,
    propertyId: string,
    filters?: { status?: string; accountId?: string }
  ) {
    const where: any = { tenantId, propertyId }
    if (filters?.status) where.status = filters.status
    if (filters?.accountId) where.accountId = filters.accountId

    const items = await this.prisma.kontoReminder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
      },
    })

    return items.map(r => ({
      ...r,
      amount: Number(r.amount),
      dueDate: r.dueDate.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }

  async getAccountReminders(tenantId: string, accountId: string) {
    const items = await this.prisma.kontoReminder.findMany({
      where: { tenantId, accountId },
      orderBy: { createdAt: 'desc' },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true } },
        unit: { select: { id: true, name: true } },
      },
    })
    return items.map(r => ({
      ...r,
      amount: Number(r.amount),
      dueDate: r.dueDate.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }
}

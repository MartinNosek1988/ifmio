import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'
import type { CreatePortalTicketDto, SubmitMeterReadingDto } from './dto/portal.dto'

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────

  async resolveUserUnits(user: AuthUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { partyId: true },
    })
    if (!dbUser?.partyId) return []

    const partyId = dbUser.partyId

    const [ownerships, tenancies] = await Promise.all([
      this.prisma.unitOwnership.findMany({
        where: { partyId, isActive: true },
        include: {
          unit: {
            include: {
              property: { select: { id: true, name: true, address: true } },
            },
          },
        },
      }),
      this.prisma.tenancy.findMany({
        where: { partyId, isActive: true },
        include: {
          unit: {
            include: {
              property: { select: { id: true, name: true, address: true } },
            },
          },
        },
      }),
    ])

    const unitMap = new Map<string, Record<string, unknown>>()
    for (const o of ownerships) {
      if (o.unit) unitMap.set(o.unit.id, {
        ...o.unit,
        relation: 'owner',
        sharePercent: o.sharePercent,
        validFrom: o.validFrom,
        validTo: o.validTo,
      })
    }
    for (const t of tenancies) {
      if (t.unit && !unitMap.has(t.unit.id)) unitMap.set(t.unit.id, {
        ...t.unit,
        relation: 'tenant',
        rentAmount: t.rentAmount,
        validFrom: t.validFrom,
        validTo: t.validTo,
      })
    }

    return Array.from(unitMap.values())
  }

  async resolveUserUnitIds(user: AuthUser): Promise<string[]> {
    const units = await this.resolveUserUnits(user)
    return units.map(u => u.id as string)
  }

  async resolveUserPropertyIds(user: AuthUser): Promise<string[]> {
    const units = await this.resolveUserUnits(user)
    return [...new Set(units.map(u => u.propertyId as string).filter(Boolean))]
  }

  // ─── Endpoints ──────────────────────────────────────────────

  async getMyUnits(user: AuthUser) {
    return this.resolveUserUnits(user)
  }

  async getMyPrescriptions(user: AuthUser) {
    const unitIds = await this.resolveUserUnitIds(user)
    if (!unitIds.length) return []

    return this.prisma.prescription.findMany({
      where: {
        tenantId: user.tenantId,
        unitId: { in: unitIds },
        status: 'active',
      },
      include: {
        items: true,
        unit: { select: { id: true, name: true } },
      },
      orderBy: { validFrom: 'desc' },
    })
  }

  async getMySettlements(user: AuthUser) {
    const unitIds = await this.resolveUserUnitIds(user)
    if (!unitIds.length) return []

    return this.prisma.settlementItem.findMany({
      where: {
        unitId: { in: unitIds },
        settlement: { tenantId: user.tenantId },
      },
      include: {
        unit: { select: { id: true, name: true } },
        settlement: {
          select: {
            id: true, name: true,
            periodFrom: true, periodTo: true,
            status: true,
          },
        },
      },
      orderBy: { settlement: { periodFrom: 'desc' } },
    })
  }

  async getMyTickets(user: AuthUser) {
    return this.prisma.helpdeskTicket.findMany({
      where: {
        tenantId: user.tenantId,
        requesterUserId: user.id,
        deletedAt: null,
      },
      select: {
        id: true, number: true, title: true, description: true,
        status: true, priority: true, category: true,
        createdAt: true, updatedAt: true,
        assignee: { select: { name: true } },
        unit: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createTicket(user: AuthUser, dto: CreatePortalTicketDto) {
    const unitIds = await this.resolveUserUnitIds(user)

    if (dto.unitId && !unitIds.includes(dto.unitId)) {
      throw new ForbiddenException('Jednotka nepatří tomuto uživateli')
    }

    const lastTicket = await this.prisma.helpdeskTicket.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { number: 'desc' },
      select: { number: true },
    })
    const number = (lastTicket?.number ?? 0) + 1

    return this.prisma.helpdeskTicket.create({
      data: {
        tenantId: user.tenantId,
        number,
        title: dto.title,
        description: dto.description,
        category: (dto.category as any) ?? 'general',
        priority: (dto.priority as any) ?? 'medium',
        status: 'open',
        unitId: dto.unitId,
        requesterUserId: user.id,
        requestOrigin: 'portal',
      },
    })
  }

  async getMyMeters(user: AuthUser) {
    const unitIds = await this.resolveUserUnitIds(user)
    if (!unitIds.length) return []

    return this.prisma.meter.findMany({
      where: {
        tenantId: user.tenantId,
        unitId: { in: unitIds },
        isActive: true,
      },
      include: {
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 3,
        },
        unitRel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async submitMeterReading(user: AuthUser, meterId: string, dto: SubmitMeterReadingDto) {
    const unitIds = await this.resolveUserUnitIds(user)

    const meter = await this.prisma.meter.findFirst({
      where: {
        id: meterId,
        tenantId: user.tenantId,
        unitId: { in: unitIds },
        isActive: true,
      },
    })
    if (!meter) throw new ForbiddenException('Měřič není dostupný')

    const lastReading = await this.prisma.meterReading.findFirst({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
    })

    const value = Number(dto.value)
    const consumption = lastReading ? value - Number(lastReading.value) : null

    const reading = await this.prisma.meterReading.create({
      data: {
        meterId,
        readingDate: new Date(dto.readingDate),
        value,
        consumption,
        note: dto.note,
        source: 'portal',
        readBy: user.name,
      },
    })

    // Update meter's cached last reading
    await this.prisma.meter.update({
      where: { id: meterId },
      data: { lastReading: value, lastReadingDate: new Date(dto.readingDate) },
    })

    return reading
  }

  async getMyDocuments(user: AuthUser) {
    const unitIds = await this.resolveUserUnitIds(user)
    const propertyIds = await this.resolveUserPropertyIds(user)
    if (!unitIds.length && !propertyIds.length) return []

    const orConditions: Array<Record<string, unknown>> = []
    if (propertyIds.length) orConditions.push({ entityType: 'property', entityId: { in: propertyIds } })
    if (unitIds.length) orConditions.push({ entityType: 'unit', entityId: { in: unitIds } })

    const links = await this.prisma.documentLink.findMany({
      where: { OR: orConditions },
      include: {
        document: {
          include: {
            tags: { select: { tag: true } },
          },
        },
      },
    })

    return links
      .filter(l => l.document.isPublic)
      .map(l => ({
        id: l.document.id,
        name: l.document.name,
        originalName: l.document.originalName,
        mimeType: l.document.mimeType,
        size: l.document.size,
        category: l.document.category,
        description: l.document.description,
        tags: l.document.tags.map(t => t.tag),
        entityType: l.entityType,
        entityId: l.entityId,
        createdAt: l.document.createdAt,
      }))
  }

  async getMyKonto(user: AuthUser) {
    const unitIds = await this.resolveUserUnitIds(user)
    if (!unitIds.length) return { accounts: [], totalBalance: 0 }

    const accounts = await this.prisma.ownerAccount.findMany({
      where: {
        tenantId: user.tenantId,
        unitId: { in: unitIds },
      },
      include: {
        unit: { select: { id: true, name: true } },
        entries: {
          orderBy: { postingDate: 'desc' },
          take: 20,
        },
      },
    })

    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0)

    return {
      accounts: accounts.map(a => ({
        id: a.id,
        unitId: a.unitId,
        unitName: a.unit.name,
        currentBalance: Number(a.currentBalance),
        lastPostingAt: a.lastPostingAt,
        entries: a.entries.map(e => ({
          id: e.id,
          type: e.type,
          amount: Number(e.amount),
          balance: Number(e.balance),
          sourceType: e.sourceType,
          description: e.description,
          postingDate: e.postingDate,
        })),
      })),
      totalBalance,
    }
  }

  async getMyVotings(user: AuthUser) {
    // Find user's partyId
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { partyId: true },
    })
    if (!dbUser?.partyId) return []

    const ballots = await this.prisma.perRollamBallot.findMany({
      where: {
        partyId: dbUser.partyId,
        voting: { status: 'PUBLISHED' },
      },
      include: {
        voting: {
          include: {
            items: { select: { id: true, title: true, description: true } },
          },
        },
        responses: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return ballots.map(b => ({
      ballotId: b.id,
      votingId: b.voting.id,
      title: b.voting.title,
      description: b.voting.description,
      deadline: b.voting.deadline,
      status: b.voting.status,
      items: b.voting.items,
      hasResponded: b.responses.length > 0,
      accessToken: b.accessToken,
      createdAt: b.voting.createdAt,
    }))
  }

  async getMyESignRequests(user: AuthUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    })
    if (!dbUser?.email) return []

    const signatories = await this.prisma.eSignSignatory.findMany({
      where: {
        email: dbUser.email,
        tokenExpiresAt: { gt: new Date() },
      },
      include: {
        request: {
          select: { id: true, documentTitle: true, documentType: true, status: true, expiresAt: true, createdAt: true },
        },
      },
      orderBy: { tokenExpiresAt: 'desc' },
    })

    return signatories.map(s => ({
      signatoryId: s.id,
      requestId: s.request.id,
      documentTitle: s.request.documentTitle,
      documentType: s.request.documentType,
      requestStatus: s.request.status,
      signatoryStatus: s.status,
      expiresAt: s.request.expiresAt,
      signedAt: s.signedAt,
      accessToken: s.token,
      createdAt: s.request.createdAt,
    }))
  }
}

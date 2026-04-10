import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import QRCode from 'qrcode'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'
import type { CreatePortalTicketDto, SubmitMeterReadingDto, SendPortalMessageDto } from './dto/portal.dto'

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

  async getMyContacts(user: AuthUser) {
    // Get tenant settings (property management company info)
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    })

    // Get user's properties
    const unitIds = await this.resolveUserUnitIds(user)
    const units = await this.prisma.unit.findMany({
      where: { id: { in: unitIds } },
      select: { propertyId: true },
    })
    const propertyIds = [...new Set(units.map(u => u.propertyId))]

    // Get properties with contact info
    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true, name: true, address: true, city: true,
        contactName: true, contactEmail: true, contactPhone: true,
      },
    })

    return {
      manager: settings ? {
        orgName: settings.orgName,
        email: settings.orgEmail ?? settings.emailFrom,
        phone: settings.orgPhone,
        address: [settings.orgStreet, settings.orgCity, settings.orgZip].filter(Boolean).join(', ') || null,
      } : null,
      properties: properties.map(p => ({
        id: p.id,
        name: p.name,
        address: p.address ? `${p.address}, ${p.city}` : p.city,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
      })),
    }
  }

  async getPrescriptionQr(user: AuthUser, prescriptionId: string) {
    const unitIds = await this.resolveUserUnitIds(user)

    const prescription = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, unitId: { in: unitIds } },
      include: {
        unit: {
          select: {
            propertyId: true,
            property: {
              select: {
                bankAccounts: {
                  where: { isActive: true, isDefault: true },
                  take: 1,
                  select: { iban: true, accountNumber: true, bankCode: true },
                },
              },
            },
          },
        },
      },
    })

    if (!prescription) return { qrDataUrl: null, qrString: null }

    const bankAccount = prescription.unit?.property?.bankAccounts?.[0]
    const iban = bankAccount?.iban
    if (!iban) return { qrDataUrl: null, qrString: null }

    const amount = Number(prescription.amount ?? 0)
    if (amount <= 0) return { qrDataUrl: null, qrString: null }

    const parts = ['SPD*1.0', `ACC:${iban.replace(/\s/g, '')}`, `AM:${amount.toFixed(2)}`, 'CC:CZK']
    if (prescription.variableSymbol) parts.push(`X-VS:${prescription.variableSymbol}`)
    const msg = `Predpis ${prescription.description ?? ''}`.slice(0, 60)
    parts.push(`MSG:${msg}`)

    const qrString = parts.join('*')
    const qrDataUrl = await QRCode.toDataURL(qrString, { width: 200, margin: 1 })

    return { qrDataUrl, qrString }
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

  // ─── Unit Detail ────────────────────────────────────────────

  async getUnitDetail(user: AuthUser, unitId: string) {
    const unitIds = await this.resolveUserUnitIds(user)
    if (!unitIds.includes(unitId)) throw new NotFoundException('Jednotka nenalezena')

    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: {
          select: {
            id: true, name: true, address: true, city: true,
            cadastralArea: true, landRegistrySheet: true,
          },
        },
        rooms: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, area: true, roomType: true, coefficient: true, calculatedArea: true },
        },
        equipment: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, status: true, quantity: true, serialNumber: true, purchaseDate: true, description: true },
        },
        occupancies: {
          where: { isActive: true },
          include: {
            resident: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    })

    if (!unit) throw new NotFoundException('Jednotka nenalezena')
    return unit
  }

  // ─── Messaging ──────────────────────────────────────────────

  private async resolveUserResidentId(user: AuthUser): Promise<string | null> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { partyId: true },
    })
    if (!dbUser?.partyId) return null

    const resident = await this.prisma.resident.findFirst({
      where: { tenantId: user.tenantId, partyId: dbUser.partyId, isActive: true },
      select: { id: true },
    })
    return resident?.id ?? null
  }

  async getMyMessages(user: AuthUser) {
    const residentId = await this.resolveUserResidentId(user)
    if (!residentId) return []

    return this.prisma.portalMessage.findMany({
      where: { tenantId: user.tenantId, residentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async sendMyMessage(user: AuthUser, dto: SendPortalMessageDto) {
    const residentId = await this.resolveUserResidentId(user)
    if (!residentId) throw new BadRequestException('Nepodařilo se identifikovat vlastníka')

    const unitIds = await this.resolveUserUnitIds(user)
    const unit = unitIds.length > 0 ? await this.prisma.unit.findFirst({
      where: { id: { in: unitIds } },
      select: { propertyId: true },
    }) : null

    return this.prisma.portalMessage.create({
      data: {
        tenantId: user.tenantId,
        residentId,
        propertyId: unit?.propertyId ?? null,
        subject: dto.subject,
        body: dto.body,
        direction: 'inbound',
      },
    })
  }

  async markMessageRead(user: AuthUser, messageId: string) {
    const residentId = await this.resolveUserResidentId(user)
    if (!residentId) throw new BadRequestException('Nepodařilo se identifikovat vlastníka')

    const msg = await this.prisma.portalMessage.findFirst({
      where: { id: messageId, tenantId: user.tenantId, residentId },
    })
    if (!msg) throw new NotFoundException('Zpráva nenalezena')

    return this.prisma.portalMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    })
  }

  async getUnreadMessageCount(user: AuthUser): Promise<number> {
    const residentId = await this.resolveUserResidentId(user)
    if (!residentId) return 0

    return this.prisma.portalMessage.count({
      where: { tenantId: user.tenantId, residentId, direction: 'outbound', isRead: false },
    })
  }
}

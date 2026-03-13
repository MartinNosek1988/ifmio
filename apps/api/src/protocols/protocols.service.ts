import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type {
  CreateProtocolDto, UpdateProtocolDto, CompleteProtocolDto,
  CreateProtocolLineDto, UpdateProtocolLineDto,
  GenerateProtocolDto, ProtocolListQueryDto,
} from './dto/protocols.dto'
import type { AuthUser } from '@ifmio/shared-types'

const PROTOCOL_INCLUDE = {
  lines: { orderBy: { sortOrder: 'asc' as const } },
  property: { select: { id: true, name: true } },
}

@Injectable()
export class ProtocolsService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════
  // PROTOCOL CRUD
  // ═══════════════════════════════════════════════════════════════════

  async list(user: AuthUser, query: ProtocolListQueryDto) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.sourceId ? { sourceId: query.sourceId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.protocolType ? { protocolType: query.protocolType } : {}),
      ...(query.satisfaction ? { satisfaction: query.satisfaction } : {}),
      ...(query.search ? {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { title: { contains: query.search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.protocol.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          ...PROTOCOL_INCLUDE,
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.protocol.count({ where }),
    ])

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async get(user: AuthUser, id: string) {
    const protocol = await this.prisma.protocol.findFirst({
      where: { id, tenantId: user.tenantId },
      include: PROTOCOL_INCLUDE,
    })
    if (!protocol) throw new NotFoundException('Protokol nenalezen')
    return protocol
  }

  async getBySource(user: AuthUser, sourceType: string, sourceId: string) {
    return this.prisma.protocol.findMany({
      where: { tenantId: user.tenantId, sourceType: sourceType as any, sourceId },
      include: PROTOCOL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(user: AuthUser, dto: CreateProtocolDto) {
    const number = await this.generateNumber(user.tenantId, dto.sourceType)

    return this.prisma.protocol.create({
      data: {
        tenantId: user.tenantId,
        sourceType: dto.sourceType as any,
        sourceId: dto.sourceId,
        protocolType: (dto.protocolType ?? 'work_report') as any,
        number,
        propertyId: dto.propertyId,
        title: dto.title,
        description: dto.description,
        requesterName: dto.requesterName,
        dispatcherName: dto.dispatcherName,
        resolverName: dto.resolverName,
        categoryLabel: dto.categoryLabel,
        activityLabel: dto.activityLabel,
        spaceLabel: dto.spaceLabel,
        tenantUnitLabel: dto.tenantUnitLabel,
        submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        transportKm: dto.transportKm,
        transportMode: dto.transportMode,
        transportDescription: dto.transportDescription,
        publicNote: dto.publicNote,
        internalNote: dto.internalNote,
        supplierSnapshot: (dto.supplierSnapshot as any) ?? undefined,
        customerSnapshot: (dto.customerSnapshot as any) ?? undefined,
      },
      include: PROTOCOL_INCLUDE,
    })
  }

  async update(user: AuthUser, id: string, dto: UpdateProtocolDto) {
    const existing = await this.get(user, id)

    if (dto.satisfaction === 'dissatisfied' && !dto.satisfactionComment && !existing.satisfactionComment) {
      throw new BadRequestException('Komentář je povinný při nespokojenosti')
    }

    const data: Record<string, unknown> = { ...dto }
    for (const key of ['handoverAt', 'supplierSignedAt', 'customerSignedAt', 'submittedAt', 'dueAt', 'completedAt']) {
      if ((dto as any)[key]) data[key] = new Date((dto as any)[key])
    }
    if (dto.satisfaction) data.satisfaction = dto.satisfaction as any
    if (dto.status) data.status = dto.status as any

    return this.prisma.protocol.update({
      where: { id },
      data,
      include: PROTOCOL_INCLUDE,
    })
  }

  async complete(user: AuthUser, id: string, dto: CompleteProtocolDto) {
    await this.get(user, id)

    if (dto.satisfaction === 'dissatisfied' && !dto.satisfactionComment) {
      throw new BadRequestException('Komentář je povinný při nespokojenosti')
    }

    const data: Record<string, unknown> = {
      status: 'completed' as const,
      completedAt: new Date(),
      handoverAt: dto.handoverAt ? new Date(dto.handoverAt) : new Date(),
      ...(dto.satisfaction ? { satisfaction: dto.satisfaction as any } : {}),
      ...(dto.satisfactionComment ? { satisfactionComment: dto.satisfactionComment } : {}),
      ...(dto.supplierSignatureName ? { supplierSignatureName: dto.supplierSignatureName, supplierSignedAt: new Date() } : {}),
      ...(dto.customerSignatureName ? { customerSignatureName: dto.customerSignatureName, customerSignedAt: new Date() } : {}),
    }

    return this.prisma.protocol.update({
      where: { id },
      data,
      include: PROTOCOL_INCLUDE,
    })
  }

  async confirm(user: AuthUser, id: string) {
    const protocol = await this.get(user, id)
    if (protocol.status !== 'completed') {
      throw new BadRequestException('Protokol musí být ve stavu "dokončený" pro potvrzení')
    }
    return this.prisma.protocol.update({
      where: { id },
      data: { status: 'confirmed' },
      include: PROTOCOL_INCLUDE,
    })
  }

  async delete(user: AuthUser, id: string) {
    await this.get(user, id)
    await this.prisma.protocol.delete({ where: { id } })
  }

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE FROM SOURCE
  // ═══════════════════════════════════════════════════════════════════

  async generateFromSource(user: AuthUser, dto: GenerateProtocolDto) {
    if (dto.sourceType === 'helpdesk') {
      return this.generateFromTicket(user, dto.sourceId, dto.protocolType)
    }
    if (dto.sourceType === 'revision') {
      return this.generateFromRevisionEvent(user, dto.sourceId, dto.protocolType)
    }
    throw new BadRequestException(`Nepodporovaný sourceType: ${dto.sourceType}`)
  }

  private async generateFromTicket(user: AuthUser, ticketId: string, protocolType?: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { name: true } },
        resident: { select: { firstName: true, lastName: true } },
        assignee: { select: { name: true } },
        items: true,
      },
    })
    if (!ticket) throw new NotFoundException('Ticket nenalezen')

    const number = await this.generateNumber(user.tenantId, 'helpdesk')

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    })

    const protocol = await this.prisma.protocol.create({
      data: {
        tenantId: user.tenantId,
        sourceType: 'helpdesk',
        sourceId: ticketId,
        protocolType: (protocolType ?? 'work_report') as any,
        number,
        propertyId: ticket.propertyId ?? undefined,
        title: ticket.title,
        description: ticket.description ?? ticket.title,
        categoryLabel: ticket.category ?? undefined,
        spaceLabel: ticket.property?.name ?? undefined,
        tenantUnitLabel: ticket.unit?.name ?? undefined,
        submittedAt: ticket.createdAt,
        dueAt: ticket.resolutionDueAt ?? undefined,
        requesterName: ticket.resident
          ? `${ticket.resident.firstName} ${ticket.resident.lastName}`
          : undefined,
        resolverName: ticket.assignee?.name,
        supplierSnapshot: settings ? {
          name: settings.orgName,
          street: settings.orgStreet,
          city: settings.orgCity,
          zip: settings.orgZip,
          ico: settings.companyNumber,
          dic: settings.vatNumber,
        } : undefined,
      },
    })

    if (ticket.items.length > 0) {
      await this.prisma.protocolLine.createMany({
        data: ticket.items.map((item, i) => ({
          protocolId: protocol.id,
          lineType: 'labor',
          name: item.description,
          unit: item.unit ?? 'ks',
          quantity: Number(item.quantity),
          sortOrder: i,
        })),
      })
    }

    return this.get(user, protocol.id)
  }

  private async generateFromRevisionEvent(user: AuthUser, eventId: string, protocolType?: string) {
    const event = await this.prisma.revisionEvent.findFirst({
      where: { id: eventId, tenantId: user.tenantId },
      include: {
        revisionPlan: {
          include: {
            revisionSubject: { select: { name: true, location: true, manufacturer: true, model: true } },
            revisionType: { select: { name: true, code: true } },
            property: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!event) throw new NotFoundException('Událost revize nenalezena')

    const number = await this.generateNumber(user.tenantId, 'revision')
    const plan = event.revisionPlan

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    })

    return this.prisma.protocol.create({
      data: {
        tenantId: user.tenantId,
        sourceType: 'revision',
        sourceId: eventId,
        protocolType: (protocolType ?? 'revision_report') as any,
        number,
        propertyId: plan.propertyId ?? undefined,
        title: plan.revisionType?.name ?? 'Revizní protokol',
        spaceLabel: plan.property?.name ?? undefined,
        submittedAt: event.performedAt ?? undefined,
        description: [
          `Revize: ${plan.revisionType?.name ?? ''}`,
          `Předmět: ${plan.revisionSubject?.name ?? ''}`,
          plan.revisionSubject?.location ? `Umístění: ${plan.revisionSubject.location}` : null,
          event.summary,
        ].filter(Boolean).join('\n'),
        resolverName: event.performedBy ?? event.vendorName,
        supplierSnapshot: event.vendorName ? { name: event.vendorName } : (settings ? {
          name: settings.orgName,
          ico: settings.companyNumber,
        } : undefined),
      },
      include: PROTOCOL_INCLUDE,
    })
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROTOCOL LINES
  // ═══════════════════════════════════════════════════════════════════

  async addLine(user: AuthUser, protocolId: string, dto: CreateProtocolLineDto) {
    await this.get(user, protocolId)

    const maxSort = await this.prisma.protocolLine.aggregate({
      where: { protocolId },
      _max: { sortOrder: true },
    })

    return this.prisma.protocolLine.create({
      data: {
        protocolId,
        lineType: dto.lineType ?? 'labor',
        name: dto.name,
        unit: dto.unit,
        quantity: dto.quantity ?? 1,
        description: dto.description,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      },
    })
  }

  async updateLine(user: AuthUser, protocolId: string, lineId: string, dto: UpdateProtocolLineDto) {
    await this.get(user, protocolId)
    const line = await this.prisma.protocolLine.findFirst({
      where: { id: lineId, protocolId },
    })
    if (!line) throw new NotFoundException('Řádek protokolu nenalezen')

    return this.prisma.protocolLine.update({
      where: { id: lineId },
      data: dto,
    })
  }

  async deleteLine(user: AuthUser, protocolId: string, lineId: string) {
    await this.get(user, protocolId)
    const line = await this.prisma.protocolLine.findFirst({
      where: { id: lineId, protocolId },
    })
    if (!line) throw new NotFoundException('Řádek protokolu nenalezen')
    await this.prisma.protocolLine.delete({ where: { id: lineId } })
  }

  async reorderLines(user: AuthUser, protocolId: string, items: { lineId: string; sortOrder: number }[]) {
    await this.get(user, protocolId)
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.protocolLine.update({
          where: { id: item.lineId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    )
    return this.get(user, protocolId)
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private async generateNumber(tenantId: string, sourceType: string): Promise<string> {
    const prefixMap: Record<string, string> = {
      helpdesk: 'PROT-HD',
      revision: 'PROT-REV',
      work_order: 'PROT-WO',
    }
    const prefix = prefixMap[sourceType] ?? 'PROT'

    const count = await this.prisma.protocol.count({
      where: { tenantId, sourceType: sourceType as any },
    })

    return `${prefix}-${String(count + 1).padStart(4, '0')}`
  }
}

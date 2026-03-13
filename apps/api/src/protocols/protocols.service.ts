import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type {
  CreateProtocolDto, UpdateProtocolDto, CompleteProtocolDto,
  CreateProtocolLineDto, UpdateProtocolLineDto,
  GenerateProtocolDto, ProtocolListQueryDto,
} from './dto/protocols.dto'
import type { AuthUser } from '@ifmio/shared-types'

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
      ...(query.search ? {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
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
          lines: { orderBy: { sortOrder: 'asc' } },
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
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!protocol) throw new NotFoundException('Protokol nenalezen')
    return protocol
  }

  async getBySource(user: AuthUser, sourceType: string, sourceId: string) {
    return this.prisma.protocol.findMany({
      where: { tenantId: user.tenantId, sourceType: sourceType as any, sourceId },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
      },
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
        description: dto.description,
        requesterName: dto.requesterName,
        dispatcherName: dto.dispatcherName,
        resolverName: dto.resolverName,
        transportKm: dto.transportKm,
        transportMode: dto.transportMode,
        supplierSnapshot: (dto.supplierSnapshot as any) ?? undefined,
        customerSnapshot: (dto.customerSnapshot as any) ?? undefined,
      },
      include: { lines: true },
    })
  }

  async update(user: AuthUser, id: string, dto: UpdateProtocolDto) {
    const existing = await this.get(user, id)

    // Validation: dissatisfied requires comment
    if (dto.satisfaction === 'dissatisfied' && !dto.satisfactionComment && !existing.satisfactionComment) {
      throw new BadRequestException('Komentář je povinný při nespokojenosti')
    }

    const data: Record<string, unknown> = { ...dto }
    if (dto.handoverAt) data.handoverAt = new Date(dto.handoverAt)
    if (dto.supplierSignedAt) data.supplierSignedAt = new Date(dto.supplierSignedAt)
    if (dto.customerSignedAt) data.customerSignedAt = new Date(dto.customerSignedAt)
    if (dto.satisfaction) data.satisfaction = dto.satisfaction as any
    if (dto.status) data.status = dto.status as any

    return this.prisma.protocol.update({
      where: { id },
      data,
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    })
  }

  async complete(user: AuthUser, id: string, dto: CompleteProtocolDto) {
    await this.get(user, id)

    if (dto.satisfaction === 'dissatisfied' && !dto.satisfactionComment) {
      throw new BadRequestException('Komentář je povinný při nespokojenosti')
    }

    const data: Record<string, unknown> = {
      status: 'completed' as const,
      handoverAt: dto.handoverAt ? new Date(dto.handoverAt) : new Date(),
      ...(dto.satisfaction ? { satisfaction: dto.satisfaction as any } : {}),
      ...(dto.satisfactionComment ? { satisfactionComment: dto.satisfactionComment } : {}),
      ...(dto.supplierSignatureName ? { supplierSignatureName: dto.supplierSignatureName, supplierSignedAt: new Date() } : {}),
      ...(dto.customerSignatureName ? { customerSignatureName: dto.customerSignatureName, customerSignedAt: new Date() } : {}),
    }

    return this.prisma.protocol.update({
      where: { id },
      data,
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
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
        property: { select: { name: true } },
        unit: { select: { name: true } },
        resident: { select: { firstName: true, lastName: true } },
        assignee: { select: { name: true } },
        items: true,
      },
    })
    if (!ticket) throw new NotFoundException('Ticket nenalezen')

    const number = await this.generateNumber(user.tenantId, 'helpdesk')

    // Get tenant settings for supplier snapshot
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
        description: ticket.description ?? ticket.title,
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

    // Copy ticket items as protocol lines
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
            property: { select: { name: true } },
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
      include: { lines: true },
    })
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROTOCOL LINES
  // ═══════════════════════════════════════════════════════════════════

  async addLine(user: AuthUser, protocolId: string, dto: CreateProtocolLineDto) {
    await this.get(user, protocolId)

    // Auto-calculate sortOrder if not provided
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

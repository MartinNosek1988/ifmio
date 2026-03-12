import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { HelpdeskListQueryDto, CreateTicketDto, UpdateTicketDto, CreateItemDto, CreateProtocolDto } from './dto/helpdesk.dto'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class HelpdeskService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  private async nextTicketNumber(tenantId: string): Promise<number> {
    const last = await this.prisma.helpdeskTicket.findFirst({
      where:   { tenantId },
      orderBy: { number: 'desc' },
      select:  { number: true },
    })
    return (last?.number ?? 0) + 1
  }

  async listTickets(user: AuthUser, query: HelpdeskListQueryDto) {
    const { status, priority, propertyId, search } = query
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...scopeWhere,
      ...(status     ? { status }     : {}),
      ...(priority   ? { priority }   : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(search ? {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip,
        include: {
          property: { select: { id: true, name: true } },
          unit:     { select: { id: true, name: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, name: true } },
          _count:   { select: { items: true } },
        },
      }),
      this.prisma.helpdeskTicket.count({ where }),
    ])

    return {
      data: items.map((t) => ({
        ...t,
        createdAt:  t.createdAt.toISOString(),
        updatedAt:  t.updatedAt.toISOString(),
        resolvedAt: t.resolvedAt?.toISOString() ?? null,
      })),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findOne(user: AuthUser, id: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where:   { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true } },
        unit:     { select: { id: true, name: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, name: true } },
        items:    { orderBy: { createdAt: 'asc' } },
        protocol: true,
      },
    })
    if (!ticket) throw new NotFoundException(`Ticket ${id} nenalezen`)
    await this.scope.verifyEntityAccess(user, ticket.propertyId)
    return {
      ...ticket,
      items: ticket.items.map((i) => ({
        ...i,
        quantity:   Number(i.quantity),
        unitPrice:  Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      createdAt:  ticket.createdAt.toISOString(),
      updatedAt:  ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    }
  }

  async createTicket(user: AuthUser, dto: CreateTicketDto) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId)
    }
    const number = await this.nextTicketNumber(user.tenantId)
    const ticket = await this.prisma.helpdeskTicket.create({
      data: {
        tenantId:    user.tenantId,
        number,
        title:       dto.title,
        description: dto.description,
        category:    (dto.category ?? 'general') as any,
        priority:    (dto.priority ?? 'medium') as any,
        propertyId:  dto.propertyId ?? null,
        unitId:      dto.unitId    ?? null,
        residentId:  dto.residentId ?? null,
      },
    })
    return { ...ticket, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString() }
  }

  async updateTicket(user: AuthUser, id: string, dto: UpdateTicketDto) {
    await this.findOne(user, id)
    const data: Record<string, unknown> = { ...dto }
    if (dto.status === 'resolved' && !dto.resolvedAt) {
      data.resolvedAt = new Date()
    }
    const ticket = await this.prisma.helpdeskTicket.update({
      where: { id }, data,
    })
    return { ...ticket, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString() }
  }

  async deleteTicket(user: AuthUser, id: string) {
    await this.findOne(user, id)
    await this.prisma.helpdeskTicket.delete({ where: { id } })
  }

  // Items
  async addItem(user: AuthUser, ticketId: string, dto: CreateItemDto) {
    await this.findOne(user, ticketId)
    const totalPrice = (dto.quantity ?? 1) * (dto.unitPrice ?? 0)
    return this.prisma.helpdeskItem.create({
      data: {
        ticketId,
        description: dto.description,
        unit:        dto.unit ?? null,
        quantity:    dto.quantity ?? 1,
        unitPrice:   dto.unitPrice ?? 0,
        totalPrice,
      },
    })
  }

  async removeItem(user: AuthUser, ticketId: string, itemId: string) {
    await this.findOne(user, ticketId)
    await this.prisma.helpdeskItem.delete({ where: { id: itemId } })
  }

  // Protocol
  async createOrUpdateProtocol(user: AuthUser, ticketId: string, dto: CreateProtocolDto) {
    await this.findOne(user, ticketId)

    const ticket = await this.prisma.helpdeskTicket.findUnique({
      where:  { id: ticketId },
      select: { number: true },
    })

    const number = `PROT-${String(ticket!.number).padStart(4, '0')}`

    const data: Record<string, unknown> = { ...dto }
    return this.prisma.helpdeskProtocol.upsert({
      where:  { ticketId },
      create: { ticketId, number, ...data } as any,
      update: data as any,
    })
  }

  async getProtocol(user: AuthUser, ticketId: string) {
    await this.findOne(user, ticketId)
    const protocol = await this.prisma.helpdeskProtocol.findUnique({
      where:   { ticketId },
      include: {
        ticket: {
          include: {
            items:    true,
            property: { select: { name: true } },
            unit:     { select: { name: true } },
            resident: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })
    if (!protocol) throw new NotFoundException('Protokol nenalezen')
    return protocol
  }
}

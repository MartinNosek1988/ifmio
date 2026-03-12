import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types';

function serialize(item: any) {
  return {
    ...item,
    laborCost: item.laborCost ? Number(item.laborCost) : null,
    materialCost: item.materialCost ? Number(item.materialCost) : null,
    totalCost: item.totalCost ? Number(item.totalCost) : null,
    deadline: item.deadline?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async list(
    user: AuthUser,
    query: { status?: string; priority?: string; propertyId?: string; search?: string },
  ) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const where: any = { tenantId: user.tenantId, ...scopeWhere }

    if (query.status && query.status !== 'all') where.status = query.status
    if (query.priority && query.priority !== 'all') where.priority = query.priority
    if (query.propertyId) where.propertyId = query.propertyId
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { assignee: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const items = await this.prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, area: true } },
        comments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return items.map(serialize)
  }

  async getStats(user: AuthUser) {
    const tenantId = user.tenantId
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const base = { tenantId, ...scopeWhere }
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)

    const [total, open, completedToday, overdue] = await Promise.all([
      this.prisma.workOrder.count({ where: base as any }),
      this.prisma.workOrder.count({
        where: { ...base, status: { in: ['nova', 'v_reseni'] } } as any,
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          status: { in: ['vyresena', 'uzavrena'] },
          completedAt: { gte: todayStart, lt: todayEnd },
        } as any,
      }),
      this.prisma.workOrder.count({
        where: {
          ...base,
          status: { in: ['nova', 'v_reseni'] },
          deadline: { lt: now },
        } as any,
      }),
    ])

    return { total, open, completedToday, overdue }
  }

  async getById(user: AuthUser, id: string) {
    const item = await this.prisma.workOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, name: true, area: true, floor: true } },
        comments: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!item) throw new NotFoundException('Work order nenalezen')
    await this.scope.verifyEntityAccess(user, item.propertyId)
    return serialize(item)
  }

  async create(user: AuthUser, dto: {
    title: string
    description?: string
    workType?: string
    priority?: string
    propertyId?: string
    unitId?: string
    assignee?: string
    requester?: string
    deadline?: string
    estimatedHours?: number
    laborCost?: number
    materialCost?: number
    note?: string
  }) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId)
    }
    const totalCost = (dto.laborCost ?? 0) + (dto.materialCost ?? 0)

    const item = await this.prisma.workOrder.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        description: dto.description,
        workType: (dto.workType as any) ?? 'corrective',
        priority: (dto.priority as any) ?? 'normalni',
        propertyId: dto.propertyId || null,
        unitId: dto.unitId || null,
        assignee: dto.assignee,
        requester: dto.requester,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        estimatedHours: dto.estimatedHours,
        laborCost: dto.laborCost,
        materialCost: dto.materialCost,
        totalCost: totalCost > 0 ? totalCost : null,
        note: dto.note,
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        comments: true,
      },
    })

    return serialize(item)
  }

  async update(user: AuthUser, id: string, dto: {
    title?: string
    description?: string
    workType?: string
    priority?: string
    propertyId?: string
    unitId?: string
    assignee?: string
    requester?: string
    deadline?: string
    estimatedHours?: number
    actualHours?: number
    laborCost?: number
    materialCost?: number
    note?: string
  }) {
    const existing = await this.getById(user, id)

    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.workType !== undefined) data.workType = dto.workType
    if (dto.priority !== undefined) data.priority = dto.priority
    if (dto.propertyId !== undefined) data.propertyId = dto.propertyId || null
    if (dto.unitId !== undefined) data.unitId = dto.unitId || null
    if (dto.assignee !== undefined) data.assignee = dto.assignee
    if (dto.requester !== undefined) data.requester = dto.requester
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null
    if (dto.estimatedHours !== undefined) data.estimatedHours = dto.estimatedHours
    if (dto.actualHours !== undefined) data.actualHours = dto.actualHours
    if (dto.laborCost !== undefined) data.laborCost = dto.laborCost
    if (dto.materialCost !== undefined) data.materialCost = dto.materialCost
    if (dto.note !== undefined) data.note = dto.note

    // Recalculate total cost if either cost field changed
    if (dto.laborCost !== undefined || dto.materialCost !== undefined) {
      const labor = dto.laborCost ?? (existing.laborCost ?? 0)
      const material = dto.materialCost ?? (existing.materialCost ?? 0)
      data.totalCost = labor + material
    }

    const item = await this.prisma.workOrder.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        comments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return serialize(item)
  }

  async changeStatus(user: AuthUser, id: string, status: string) {
    await this.getById(user, id)

    const data: any = { status }
    if (status === 'vyresena' || status === 'uzavrena') {
      data.completedAt = new Date()
    }
    if (status === 'nova' || status === 'v_reseni') {
      data.completedAt = null
    }

    const item = await this.prisma.workOrder.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        comments: { orderBy: { createdAt: 'desc' } },
      },
    })

    return serialize(item)
  }

  async addComment(user: AuthUser, id: string, text: string) {
    await this.getById(user, id)

    // Get user name for author
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    })

    const comment = await this.prisma.workOrderComment.create({
      data: {
        workOrderId: id,
        author: dbUser?.name ?? 'System',
        text,
      },
    })

    return {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    }
  }

  async remove(user: AuthUser, id: string) {
    await this.getById(user, id)
    await this.prisma.workOrder.delete({ where: { id } })
    return { success: true }
  }
}

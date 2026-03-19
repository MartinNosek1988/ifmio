import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'
import type { CreateKanbanTaskDto, UpdateKanbanTaskDto, MoveCardDto, KanbanQueryDto } from './dto/kanban.dto'
import type { KanbanStatus, KanbanPriority, TicketStatus } from '@prisma/client'

// ─── Status mapping ──────────────────────────────────────────

const HELPDESK_TO_KANBAN: Record<string, string> = {
  open: 'todo', in_progress: 'in_progress', resolved: 'review', closed: 'done',
}

const WO_TO_KANBAN: Record<string, string> = {
  nova: 'backlog', v_reseni: 'in_progress', vyresena: 'done', uzavrena: 'done', zrusena: 'done',
}

const KANBAN_TO_HELPDESK: Record<string, string> = {
  backlog: 'open', todo: 'open', in_progress: 'in_progress', review: 'resolved', done: 'closed',
}

const KANBAN_TO_WO: Record<string, string> = {
  backlog: 'nova', todo: 'nova', in_progress: 'v_reseni', review: 'vyresena', done: 'vyresena',
}

const PRIORITY_MAP_HD: Record<string, string> = {
  low: 'low', medium: 'medium', high: 'high', urgent: 'urgent',
}
const PRIORITY_MAP_WO: Record<string, string> = {
  nizka: 'low', normalni: 'medium', vysoka: 'high', kriticka: 'urgent',
}

export interface KanbanCard {
  id: string
  source: 'helpdesk' | 'workorder' | 'task'
  sourceId: string
  title: string
  description?: string
  status: string
  priority: string
  assignee?: { id: string; name: string }
  property?: { id: string; name: string }
  dueDate?: string
  tags: string[]
  sourceNumber?: string
  createdAt: string
  sortOrder: number
}

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService) {}

  async getBoard(user: AuthUser, query: KanbanQueryDto): Promise<Record<string, KanbanCard[]>> {
    const tenantId = user.tenantId
    const assigneeFilter = this.getAssigneeFilter(user, query)

    const [tickets, workOrders, tasks] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where: { tenantId, deletedAt: null, ...assigneeFilter.helpdesk, ...(query.propertyId ? { propertyId: query.propertyId } : {}) },
        include: { assignee: { select: { id: true, name: true } }, property: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.workOrder.findMany({
        where: { tenantId, ...assigneeFilter.workorder, ...(query.propertyId ? { propertyId: query.propertyId } : {}) },
        include: { assigneeUser: { select: { id: true, name: true } }, property: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.kanbanTask.findMany({
        where: { tenantId, ...assigneeFilter.task, ...(query.propertyId ? { propertyId: query.propertyId } : {}) },
        include: { assignee: { select: { id: true, name: true } }, property: { select: { id: true, name: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ])

    const cards: KanbanCard[] = [
      ...tickets.map((t): KanbanCard => ({
        id: `hd-${t.id}`, source: 'helpdesk', sourceId: t.id,
        title: t.title, description: t.description ?? undefined,
        status: HELPDESK_TO_KANBAN[t.status] ?? 'todo',
        priority: PRIORITY_MAP_HD[t.priority] ?? 'medium',
        assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : undefined,
        property: t.property ? { id: t.property.id, name: t.property.name } : undefined,
        tags: ['helpdesk'], sourceNumber: `HD-${String(t.number).padStart(4, '0')}`,
        createdAt: t.createdAt.toISOString(), sortOrder: 0,
      })),
      ...workOrders.map((w): KanbanCard => ({
        id: `wo-${w.id}`, source: 'workorder', sourceId: w.id,
        title: (w as any).title ?? (w as any).description?.slice(0, 60) ?? 'Work Order',
        description: (w as any).description ?? undefined,
        status: WO_TO_KANBAN[w.status] ?? 'backlog',
        priority: PRIORITY_MAP_WO[(w as any).priority] ?? 'medium',
        assignee: (w as any).assigneeUser ? { id: (w as any).assigneeUser.id, name: (w as any).assigneeUser.name } : undefined,
        property: w.property ? { id: w.property.id, name: w.property.name } : undefined,
        tags: w.status === 'zrusena' ? ['workorder', 'cancelled'] : ['workorder'],
        sourceNumber: `WO-${String((w as any).number ?? '').padStart(4, '0')}`,
        createdAt: w.createdAt.toISOString(), sortOrder: 0,
      })),
      ...tasks.map((t): KanbanCard => ({
        id: `task-${t.id}`, source: 'task', sourceId: t.id,
        title: t.title, description: t.description ?? undefined,
        status: t.status, priority: t.priority,
        assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : undefined,
        property: t.property ? { id: t.property.id, name: t.property.name } : undefined,
        dueDate: t.dueDate?.toISOString(), tags: t.tags,
        createdAt: t.createdAt.toISOString(), sortOrder: t.sortOrder,
      })),
    ]

    // Group by status columns
    const columns: Record<string, KanbanCard[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] }
    for (const card of cards) {
      const col = columns[card.status]
      if (col) col.push(card)
      else columns.done.push(card) // fallback
    }
    // Limit done column to 20
    columns.done = columns.done.slice(0, 20)

    return columns
  }

  private getAssigneeFilter(user: AuthUser, query: KanbanQueryDto) {
    const isAdmin = ['tenant_owner', 'tenant_admin'].includes(user.role)
    const isManager = user.role === 'property_manager'

    if (isAdmin && query.view !== 'my' && !query.assigneeId) {
      return { helpdesk: {}, workorder: {}, task: {} }
    }
    if (query.assigneeId) {
      return {
        helpdesk: { assigneeId: query.assigneeId },
        workorder: { assigneeUserId: query.assigneeId },
        task: { assigneeId: query.assigneeId },
      }
    }
    if (query.view === 'my' || (!isAdmin && !isManager)) {
      return {
        helpdesk: { assigneeId: user.id },
        workorder: { assigneeUserId: user.id },
        task: { assigneeId: user.id },
      }
    }
    return { helpdesk: {}, workorder: {}, task: {} }
  }

  async createTask(user: AuthUser, dto: CreateKanbanTaskDto) {
    return this.prisma.kanbanTask.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        description: dto.description,
        propertyId: dto.propertyId,
        assigneeId: dto.assigneeId,
        priority: (dto.priority ?? 'medium') as KanbanPriority,
        status: (dto.status ?? 'backlog') as KanbanStatus,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        tags: dto.tags ?? [],
        createdById: user.id,
      },
      include: { assignee: { select: { id: true, name: true } }, property: { select: { id: true, name: true } } },
    })
  }

  async updateTask(user: AuthUser, id: string, dto: UpdateKanbanTaskDto) {
    const task = await this.prisma.kanbanTask.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!task) throw new NotFoundException('Úkol nenalezen')

    const data: Record<string, unknown> = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.propertyId !== undefined) data.propertyId = dto.propertyId
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId
    if (dto.priority !== undefined) data.priority = dto.priority
    if (dto.status !== undefined) data.status = dto.status
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null
    if (dto.tags !== undefined) data.tags = dto.tags
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder

    return this.prisma.kanbanTask.update({ where: { id }, data })
  }

  async deleteTask(user: AuthUser, id: string) {
    const task = await this.prisma.kanbanTask.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!task) throw new NotFoundException('Úkol nenalezen')
    await this.prisma.kanbanTask.delete({ where: { id } })
  }

  async moveCard(user: AuthUser, dto: MoveCardDto) {
    switch (dto.source) {
      case 'helpdesk': {
        const newStatus = KANBAN_TO_HELPDESK[dto.newStatus] ?? 'open'
        await this.prisma.helpdeskTicket.update({
          where: { id: dto.sourceId },
          data: {
            status: newStatus as TicketStatus,
            ...(newStatus === 'resolved' ? { resolvedAt: new Date() } : {}),
          },
        })
        break
      }
      case 'workorder': {
        const newStatus = KANBAN_TO_WO[dto.newStatus] ?? 'nova'
        await this.prisma.workOrder.update({
          where: { id: dto.sourceId },
          data: {
            status: newStatus as any,
            ...(newStatus === 'vyresena' ? { completedAt: new Date() } : {}),
          },
        })
        break
      }
      case 'task': {
        await this.prisma.kanbanTask.update({
          where: { id: dto.sourceId },
          data: { status: dto.newStatus as KanbanStatus, sortOrder: dto.newOrder ?? 0 },
        })
        break
      }
    }
    return { success: true }
  }

  async getStats(user: AuthUser) {
    const tenantId = user.tenantId
    const [todoCount, inProgressCount] = await Promise.all([
      this.prisma.kanbanTask.count({ where: { tenantId, status: 'todo' } }),
      this.prisma.kanbanTask.count({ where: { tenantId, status: 'in_progress' } }),
    ])
    return { active: todoCount + inProgressCount }
  }
}

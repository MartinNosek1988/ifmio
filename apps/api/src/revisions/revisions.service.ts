import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { ProtocolsService } from '../protocols/protocols.service'
import { NotificationsService } from '../notifications/notifications.service'
import { computeNextAction } from './revision-escalation.service'
import type {
  CreateRevisionSubjectDto, UpdateRevisionSubjectDto,
  CreateRevisionTypeDto, UpdateRevisionTypeDto,
  CreateRevisionPlanDto, UpdateRevisionPlanDto, RevisionPlanListQueryDto,
  CreateRevisionEventDto, UpdateRevisionEventDto,
} from './dto/revisions.dto'
import type { AuthUser } from '@ifmio/shared-types'

const DAY_MS = 86_400_000

export type ComplianceStatus =
  | 'compliant'
  | 'due_soon'
  | 'overdue'
  | 'overdue_critical'
  | 'performed_pending_protocol'
  | 'performed_pending_signature'
  | 'performed_unconfirmed'

type ProtocolComplianceState = 'missing' | 'pending_signature' | 'unconfirmed'

@Injectable()
export class RevisionsService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private protocols: ProtocolsService,
    private notifications: NotificationsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // REVISION SUBJECTS
  // ═══════════════════════════════════════════════════════════════════

  async listSubjects(user: AuthUser) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    return this.prisma.revisionSubject.findMany({
      where: { tenantId: user.tenantId, ...scopeWhere },
      include: { property: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async getSubject(user: AuthUser, id: string) {
    const subject = await this.prisma.revisionSubject.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true } },
        plans: { include: { revisionType: { select: { id: true, name: true, color: true } } } },
      },
    })
    if (!subject) throw new NotFoundException('Předmět revize nenalezen')
    await this.scope.verifyEntityAccess(user, subject.propertyId)
    return subject
  }

  async createSubject(user: AuthUser, dto: CreateRevisionSubjectDto) {
    if (dto.propertyId) await this.scope.verifyPropertyAccess(user, dto.propertyId)
    return this.prisma.revisionSubject.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        propertyId: dto.propertyId ?? null,
        category: dto.category ?? 'obecne',
        description: dto.description,
        location: dto.location,
        assetTag: dto.assetTag,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
      },
    })
  }

  async updateSubject(user: AuthUser, id: string, dto: UpdateRevisionSubjectDto) {
    await this.getSubject(user, id)
    return this.prisma.revisionSubject.update({ where: { id }, data: dto })
  }

  async deleteSubject(user: AuthUser, id: string) {
    await this.getSubject(user, id)
    await this.prisma.revisionSubject.delete({ where: { id } })
  }

  // ═══════════════════════════════════════════════════════════════════
  // REVISION TYPES
  // ═══════════════════════════════════════════════════════════════════

  async listTypes(user: AuthUser) {
    return this.prisma.revisionType.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async createType(user: AuthUser, dto: CreateRevisionTypeDto) {
    try {
      return await this.prisma.revisionType.create({
        data: {
          tenantId: user.tenantId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          defaultIntervalDays: dto.defaultIntervalDays ?? 365,
          defaultReminderDaysBefore: dto.defaultReminderDaysBefore ?? 30,
          color: dto.color,
          requiresProtocol: dto.requiresProtocol ?? false,
          defaultProtocolType: dto.defaultProtocolType,
          requiresSupplierSignature: dto.requiresSupplierSignature ?? false,
          requiresCustomerSignature: dto.requiresCustomerSignature ?? false,
          graceDaysAfterEvent: dto.graceDaysAfterEvent ?? 14,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Kód typu revize již existuje')
      }
      throw error
    }
  }

  async updateType(user: AuthUser, id: string, dto: UpdateRevisionTypeDto) {
    const type = await this.prisma.revisionType.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!type) throw new NotFoundException('Typ revize nenalezen')
    return this.prisma.revisionType.update({ where: { id }, data: dto })
  }

  async deleteType(user: AuthUser, id: string) {
    const type = await this.prisma.revisionType.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!type) throw new NotFoundException('Typ revize nenalezen')
    await this.prisma.revisionType.delete({ where: { id } })
  }

  // ═══════════════════════════════════════════════════════════════════
  // REVISION PLANS
  // ═══════════════════════════════════════════════════════════════════

  async listPlans(user: AuthUser, query: RevisionPlanListQueryDto) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const skip = (page - 1) * limit

    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...scopeWhere,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.revisionTypeId ? { revisionTypeId: query.revisionTypeId } : {}),
      ...(query.subjectId ? { revisionSubjectId: query.subjectId } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { revisionSubject: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      } : {}),
    }

    // Compliance filter
    if (query.complianceStatus) {
      const statusFilter = { status: 'active' }
      if (query.complianceStatus === 'overdue' || query.complianceStatus === 'overdue_critical') {
        Object.assign(where, { ...statusFilter, nextDueAt: { lt: now } })
      } else if (query.complianceStatus === 'due_soon') {
        Object.assign(where, {
          ...statusFilter,
          nextDueAt: { gte: now },
          // We need to check reminder window per-plan, so we'll filter in memory
          // For efficiency, fetch plans due within 90 days and filter
        })
        // Simplified: treat "due soon" as next 30 days max
        Object.assign(where, {
          ...statusFilter,
          nextDueAt: { gte: now, lte: new Date(now.getTime() + 90 * DAY_MS) },
        })
      } else if (query.complianceStatus === 'compliant') {
        Object.assign(where, {
          ...statusFilter,
          nextDueAt: { gte: now },
        })
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.revisionPlan.findMany({
        where,
        orderBy: { nextDueAt: 'asc' },
        take: limit,
        skip,
        include: {
          property: { select: { id: true, name: true } },
          revisionSubject: { select: { id: true, name: true } },
          revisionType: { select: { id: true, name: true, color: true, requiresProtocol: true, requiresSupplierSignature: true, requiresCustomerSignature: true } },
          responsibleUser: { select: { id: true, name: true } },
          _count: { select: { events: true } },
        },
      }),
      this.prisma.revisionPlan.count({ where }),
    ])

    // Enrich with compliance status (protocol-aware)
    const data = await Promise.all(items.map(async (plan) => {
      const protocolState = plan.revisionType.requiresProtocol
        ? await this.getProtocolComplianceState(user.tenantId, plan.id, plan.revisionType)
        : null
      return {
        ...plan,
        complianceStatus: this.getComplianceStatus(plan, now, protocolState),
      }
    }))

    // Post-filter by computed compliance status (exact match)
    const filteredData = query.complianceStatus
      ? data.filter((p) => p.complianceStatus === query.complianceStatus)
      : data

    return {
      data: filteredData,
      total: query.complianceStatus ? filteredData.length : total,
      page, limit,
      totalPages: Math.ceil((query.complianceStatus ? filteredData.length : total) / limit),
    }
  }

  async getPlan(user: AuthUser, id: string) {
    const plan = await this.prisma.revisionPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true } },
        revisionSubject: { select: { id: true, name: true, location: true, manufacturer: true, model: true } },
        revisionType: { select: { id: true, name: true, code: true, color: true, requiresProtocol: true, defaultProtocolType: true, requiresSupplierSignature: true, requiresCustomerSignature: true, graceDaysAfterEvent: true } },
        responsibleUser: { select: { id: true, name: true } },
        events: {
          orderBy: { performedAt: { sort: 'desc', nulls: 'last' } },
          take: 20,
        },
      },
    })
    if (!plan) throw new NotFoundException('Plán revize nenalezen')
    await this.scope.verifyEntityAccess(user, plan.propertyId)
    const now = new Date()
    const protocolState = plan.revisionType.requiresProtocol
      ? await this.getProtocolComplianceState(user.tenantId, plan.id, plan.revisionType)
      : null
    const complianceStatus = this.getComplianceStatus(plan, now, protocolState)

    // Compute next action with protocol info for guidance
    let protocolInfo: { id: string; status: string } | null = null
    if (protocolState && plan.events.length > 0) {
      const latestEvent = plan.events[0]
      const proto = await this.prisma.protocol.findFirst({
        where: { tenantId: user.tenantId, sourceType: 'revision', sourceId: latestEvent.id },
        select: { id: true, status: true },
      })
      if (proto) protocolInfo = proto
    }

    return {
      ...plan,
      complianceStatus,
      nextAction: computeNextAction(complianceStatus, protocolInfo),
    }
  }

  async createPlan(user: AuthUser, dto: CreateRevisionPlanDto) {
    if (dto.propertyId) await this.scope.verifyPropertyAccess(user, dto.propertyId)

    // Verify subject and type belong to tenant
    const [subject, type] = await Promise.all([
      this.prisma.revisionSubject.findFirst({
        where: { id: dto.revisionSubjectId, tenantId: user.tenantId },
      }),
      this.prisma.revisionType.findFirst({
        where: { id: dto.revisionTypeId, tenantId: user.tenantId },
      }),
    ])
    if (!subject) throw new NotFoundException('Předmět revize nenalezen')
    if (!type) throw new NotFoundException('Typ revize nenalezen')

    const lastPerformedAt = dto.lastPerformedAt ? new Date(dto.lastPerformedAt) : null
    let nextDueAt: Date

    if (dto.nextDueAt) {
      nextDueAt = new Date(dto.nextDueAt)
    } else if (lastPerformedAt) {
      nextDueAt = new Date(lastPerformedAt.getTime() + dto.intervalDays * DAY_MS)
    } else {
      // Default: due from today + interval
      nextDueAt = new Date(Date.now() + dto.intervalDays * DAY_MS)
    }

    return this.prisma.revisionPlan.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId ?? subject.propertyId,
        revisionSubjectId: dto.revisionSubjectId,
        revisionTypeId: dto.revisionTypeId,
        title: dto.title,
        description: dto.description,
        intervalDays: dto.intervalDays,
        reminderDaysBefore: dto.reminderDaysBefore ?? type.defaultReminderDaysBefore,
        vendorName: dto.vendorName,
        responsibleUserId: dto.responsibleUserId,
        lastPerformedAt,
        nextDueAt,
        isMandatory: dto.isMandatory ?? true,
      },
      include: {
        revisionSubject: { select: { id: true, name: true } },
        revisionType: { select: { id: true, name: true } },
      },
    })
  }

  async updatePlan(user: AuthUser, id: string, dto: UpdateRevisionPlanDto) {
    const existing = await this.getPlan(user, id)
    const data: Record<string, unknown> = { ...dto }

    // Recalculate nextDueAt if interval changed
    if (dto.intervalDays && dto.intervalDays !== existing.intervalDays) {
      if (existing.lastPerformedAt) {
        data.nextDueAt = new Date(
          new Date(existing.lastPerformedAt).getTime() + dto.intervalDays * DAY_MS,
        )
      }
    }

    // Mark as customized if auto-generated plan has scheduling fields changed
    if ((existing as any).generatedFromAssetType && !(existing as any).isCustomized) {
      const schedulingFields = ['intervalDays', 'reminderDaysBefore', 'isMandatory'] as const
      const changed = schedulingFields.some((f) => dto[f] !== undefined && dto[f] !== (existing as any)[f])
      if (changed) data.isCustomized = true
    }

    return this.prisma.revisionPlan.update({ where: { id }, data })
  }

  async deletePlan(user: AuthUser, id: string) {
    await this.getPlan(user, id)
    await this.prisma.revisionPlan.delete({ where: { id } })
  }

  async getPlanHistory(user: AuthUser, id: string) {
    await this.getPlan(user, id)
    const events = await this.prisma.revisionEvent.findMany({
      where: { revisionPlanId: id, tenantId: user.tenantId },
      orderBy: { performedAt: { sort: 'desc', nulls: 'last' } },
    })

    // Enrich with linked protocol info
    const eventIds = events.map((e) => e.id)
    const protocols = eventIds.length > 0
      ? await this.prisma.protocol.findMany({
          where: { tenantId: user.tenantId, sourceType: 'revision', sourceId: { in: eventIds } },
          select: { id: true, sourceId: true, number: true, status: true },
        })
      : []
    const protocolMap = new Map(protocols.map((p) => [p.sourceId, p]))

    return events.map((e) => {
      const proto = protocolMap.get(e.id)
      return {
        ...e,
        protocol: proto ? { id: proto.id, number: proto.number, status: proto.status } : null,
      }
    })
  }

  // ═══════════════════════════════════════════════════════════════════
  // REVISION EVENTS
  // ═══════════════════════════════════════════════════════════════════

  async listEvents(user: AuthUser, planId?: string) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    return this.prisma.revisionEvent.findMany({
      where: {
        tenantId: user.tenantId,
        ...scopeWhere,
        ...(planId ? { revisionPlanId: planId } : {}),
      },
      include: {
        revisionPlan: { select: { id: true, title: true } },
        property: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async getEvent(user: AuthUser, id: string) {
    const event = await this.prisma.revisionEvent.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        revisionPlan: {
          select: { id: true, title: true },
        },
        property: { select: { id: true, name: true } },
      },
    })
    if (!event) throw new NotFoundException('Událost revize nenalezena')
    await this.scope.verifyEntityAccess(user, event.propertyId)
    return event
  }

  async createEvent(user: AuthUser, dto: CreateRevisionEventDto) {
    const plan = await this.getPlan(user, dto.revisionPlanId)

    const event = await this.prisma.revisionEvent.create({
      data: {
        tenantId: user.tenantId,
        propertyId: plan.propertyId,
        revisionPlanId: dto.revisionPlanId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        resultStatus: (dto.resultStatus ?? 'planned') as any,
        summary: dto.summary,
        notes: dto.notes,
        vendorName: dto.vendorName,
        performedBy: dto.performedBy,
        protocolDocumentId: dto.protocolDocumentId,
      },
    })

    // If event has performedAt, recalculate plan
    if (dto.performedAt) {
      await this.recalculatePlan(plan.id, new Date(dto.performedAt), plan.intervalDays)
    }

    return event
  }

  async updateEvent(user: AuthUser, id: string, dto: UpdateRevisionEventDto) {
    const existing = await this.getEvent(user, id)
    const event = await this.prisma.revisionEvent.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        resultStatus: dto.resultStatus as any,
      },
    })

    // Recalculate plan if performedAt changed
    if (dto.performedAt && dto.performedAt !== existing.performedAt?.toISOString()) {
      const plan = await this.prisma.revisionPlan.findUnique({
        where: { id: existing.revisionPlanId },
        select: { id: true, intervalDays: true },
      })
      if (plan) {
        await this.recalculatePlan(plan.id, new Date(dto.performedAt), plan.intervalDays)
      }
    }

    return event
  }

  async deleteEvent(user: AuthUser, id: string) {
    await this.getEvent(user, id)
    await this.prisma.revisionEvent.delete({ where: { id } })
  }

  /** Shortcut: record a performed event and recalculate plan in one step.
   *  Auto-creates protocol if RevisionType.requiresProtocol is true. */
  async recordEvent(user: AuthUser, planId: string, dto: CreateRevisionEventDto) {
    dto.revisionPlanId = planId
    if (!dto.performedAt) dto.performedAt = new Date().toISOString()
    if (!dto.resultStatus) dto.resultStatus = 'passed'
    const event = await this.createEvent(user, dto)

    // Auto-create protocol if type requires it
    const plan = await this.prisma.revisionPlan.findFirst({
      where: { id: planId, tenantId: user.tenantId },
      include: {
        revisionType: { select: { requiresProtocol: true, defaultProtocolType: true, name: true } },
        property: { select: { name: true } },
      },
    })

    if (plan?.revisionType.requiresProtocol) {
      // Check dedup — don't create if protocol already exists for this event
      const existing = await this.prisma.protocol.findFirst({
        where: { tenantId: user.tenantId, sourceType: 'revision', sourceId: event.id },
        select: { id: true },
      })

      if (!existing) {
        try {
          const protocol = await this.protocols.generateFromSource(user, {
            sourceType: 'revision',
            sourceId: event.id,
            protocolType: plan.revisionType.defaultProtocolType ?? 'revision_report',
          })
          // Dismiss any pending "missing protocol" notification for this event
          await this.notifications.dismissByEntityId(
            user.tenantId,
            `revision_protocol_missing:${event.id}`,
          )
          return { ...event, autoProtocol: { id: protocol.id, number: protocol.number, status: protocol.status } }
        } catch {
          // Protocol creation failed — event still recorded, notification will fire from cron
        }
      }
    }

    return event
  }

  // ═══════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════

  async getDashboard(user: AuthUser, days: number) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const now = new Date()
    const since = new Date(now)
    since.setDate(since.getDate() - days)

    const tenantWhere = { tenantId: user.tenantId, ...scopeWhere }
    const activeWhere = { ...tenantWhere, status: 'active' as const }

    const allPlans = await this.prisma.revisionPlan.findMany({
      where: activeWhere,
      select: {
        id: true, nextDueAt: true, reminderDaysBefore: true, revisionTypeId: true, propertyId: true,
        revisionType: { select: { requiresProtocol: true, requiresSupplierSignature: true, requiresCustomerSignature: true } },
      },
    })

    let compliant = 0
    let dueSoon = 0
    let overdue = 0
    let overdueCritical = 0
    let pendingProtocol = 0
    let pendingSignature = 0
    let unconfirmed = 0

    for (const plan of allPlans) {
      const protocolState = plan.revisionType.requiresProtocol
        ? await this.getProtocolComplianceState(user.tenantId, plan.id, plan.revisionType)
        : null
      const cs = this.getComplianceStatus(plan, now, protocolState)
      if (cs === 'compliant') compliant++
      else if (cs === 'due_soon') dueSoon++
      else if (cs === 'overdue') overdue++
      else if (cs === 'overdue_critical') overdueCritical++
      else if (cs === 'performed_pending_protocol') pendingProtocol++
      else if (cs === 'performed_pending_signature') pendingSignature++
      else if (cs === 'performed_unconfirmed') unconfirmed++
    }

    const performedInPeriod = await this.prisma.revisionEvent.count({
      where: { ...tenantWhere, performedAt: { gte: since } },
    })

    // By type
    const types = await this.prisma.revisionType.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true },
    })
    const byType = types.map((t) => {
      const typePlans = allPlans.filter((p) => p.revisionTypeId === t.id)
      return {
        revisionTypeId: t.id,
        name: t.name,
        total: typePlans.length,
        overdue: typePlans.filter((p) => this.getComplianceStatus(p, now) === 'overdue').length,
        dueSoon: typePlans.filter((p) => this.getComplianceStatus(p, now) === 'due_soon').length,
      }
    }).filter((t) => t.total > 0)

    // By property
    const propIds = [...new Set(allPlans.map((p) => p.propertyId).filter(Boolean))] as string[]
    const properties = propIds.length > 0
      ? await this.prisma.property.findMany({
          where: { id: { in: propIds } },
          select: { id: true, name: true },
        })
      : []
    const propMap = new Map(properties.map((p) => [p.id, p.name]))
    const byProperty = propIds.map((pid) => {
      const propPlans = allPlans.filter((p) => p.propertyId === pid)
      return {
        propertyId: pid,
        name: propMap.get(pid) ?? '—',
        total: propPlans.length,
        overdue: propPlans.filter((p) => this.getComplianceStatus(p, now) === 'overdue').length,
        dueSoon: propPlans.filter((p) => this.getComplianceStatus(p, now) === 'due_soon').length,
      }
    }).filter((p) => p.total > 0)

    // Upcoming (next 30 days)
    const upcoming = await this.prisma.revisionPlan.findMany({
      where: {
        ...activeWhere,
        nextDueAt: { gte: now, lte: new Date(now.getTime() + 30 * DAY_MS) },
      },
      orderBy: { nextDueAt: 'asc' },
      take: 10,
      include: {
        property: { select: { id: true, name: true } },
        revisionSubject: { select: { id: true, name: true } },
        revisionType: { select: { id: true, name: true } },
      },
    })

    // Top risk (overdue, sorted by how overdue)
    const topRisk = await this.prisma.revisionPlan.findMany({
      where: { ...activeWhere, nextDueAt: { lt: now } },
      orderBy: { nextDueAt: 'asc' },
      take: 10,
      include: {
        property: { select: { id: true, name: true } },
        revisionSubject: { select: { id: true, name: true } },
        revisionType: { select: { id: true, name: true } },
      },
    })

    return {
      kpi: {
        totalPlans: allPlans.length,
        compliant,
        dueSoon,
        overdue,
        overdueCritical,
        pendingProtocol,
        pendingSignature,
        unconfirmed,
        performedInPeriod,
      },
      byType,
      byProperty,
      upcoming,
      topRisk,
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private getComplianceStatus(
    plan: { nextDueAt: Date; reminderDaysBefore?: number },
    now: Date,
    protocolState?: ProtocolComplianceState | null,
  ): ComplianceStatus {
    const due = new Date(plan.nextDueAt).getTime()
    const nowMs = now.getTime()

    // Time-based check first
    if (due < nowMs) {
      // Check if critically overdue (> 30 days past due)
      if (due < nowMs - 30 * DAY_MS) return 'overdue_critical'
      return 'overdue'
    }

    // If on time but protocol requirements not met
    if (protocolState) {
      if (protocolState === 'missing') return 'performed_pending_protocol'
      if (protocolState === 'pending_signature') return 'performed_pending_signature'
      if (protocolState === 'unconfirmed') return 'performed_unconfirmed'
    }

    const reminderMs = (plan.reminderDaysBefore ?? 30) * DAY_MS
    if (due <= nowMs + reminderMs) return 'due_soon'
    return 'compliant'
  }

  /**
   * Determine protocol compliance state for a plan's latest event.
   * Returns null if the type doesn't require a protocol.
   */
  private async getProtocolComplianceState(
    tenantId: string,
    planId: string,
    revisionType: { requiresProtocol: boolean; requiresSupplierSignature: boolean; requiresCustomerSignature: boolean },
  ): Promise<ProtocolComplianceState | null> {
    if (!revisionType.requiresProtocol) return null

    // Find latest performed event for this plan
    const latestEvent = await this.prisma.revisionEvent.findFirst({
      where: { revisionPlanId: planId, performedAt: { not: null } },
      orderBy: { performedAt: 'desc' },
      select: { id: true },
    })
    if (!latestEvent) return null

    // Check if protocol exists for this event
    const protocol = await this.prisma.protocol.findFirst({
      where: { tenantId, sourceType: 'revision', sourceId: latestEvent.id },
      select: { status: true, supplierSignatureName: true, customerSignatureName: true },
    })

    if (!protocol) return 'missing'

    if (protocol.status === 'draft') return 'unconfirmed'

    // Check signature requirements
    if (revisionType.requiresSupplierSignature && !protocol.supplierSignatureName) return 'pending_signature'
    if (revisionType.requiresCustomerSignature && !protocol.customerSignatureName) return 'pending_signature'

    if (protocol.status === 'completed') return 'unconfirmed'

    return null // confirmed = fully compliant
  }

  private async recalculatePlan(planId: string, performedAt: Date, intervalDays: number) {
    const nextDueAt = new Date(performedAt.getTime() + intervalDays * DAY_MS)
    await this.prisma.revisionPlan.update({
      where: { id: planId },
      data: { lastPerformedAt: performedAt, nextDueAt },
    })
  }
}

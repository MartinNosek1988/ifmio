import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types'
import type {
  CreateBoardMessageDto,
  UpdateBoardMessageDto,
  ReviewBoardMessageDto,
} from './dto/board-message.dto'
import type { UserRole } from '../common/decorators/roles.decorator'

const NOT_DELETED = { deletedAt: null }
const USER_SELECT = { id: true, name: true, email: true } as const

/** Roles that can publish directly without approval */
const ADMIN_ROLES: UserRole[] = ['tenant_owner', 'tenant_admin']

@Injectable()
export class BoardMessagesService {
  private readonly logger = new Logger(BoardMessagesService.name)

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  // ─── List (admin) ──────────────────────────────────────────────

  async findAll(
    user: AuthUser,
    propertyId: string,
    filters: { status?: string; search?: string },
    pagination: { page?: number; limit?: number },
  ) {
    await this.scope.verifyPropertyAccess(user, propertyId)

    const page = Math.max(1, pagination.page ?? 1)
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20))

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      propertyId,
      ...NOT_DELETED,
    }
    if (filters.status) where.status = filters.status
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.boardMessage.findMany({
        where,
        include: {
          author: { select: USER_SELECT },
          _count: { select: { readReceipts: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.boardMessage.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  // ─── Detail ────────────────────────────────────────────────────

  async findOne(user: AuthUser, id: string) {
    const msg = await this.prisma.boardMessage.findFirst({
      where: { id, tenantId: user.tenantId, ...NOT_DELETED },
      include: {
        author: { select: USER_SELECT },
        reviewer: { select: USER_SELECT },
        readReceipts: {
          include: { user: { select: USER_SELECT } },
          orderBy: { readAt: 'desc' },
        },
      },
    })
    if (!msg) throw new NotFoundException('Zpráva nenalezena')
    await this.scope.verifyPropertyAccess(user, msg.propertyId)
    return msg
  }

  // ─── Create ────────────────────────────────────────────────────

  async create(user: AuthUser, dto: CreateBoardMessageDto) {
    await this.scope.verifyPropertyAccess(user, dto.propertyId)

    const isAdmin = ADMIN_ROLES.includes(user.role)
    let status = 'DRAFT'
    let submittedAt: Date | undefined

    if (dto.submitForApproval) {
      if (isAdmin) {
        status = 'PUBLISHED'
      } else {
        status = 'PENDING_APPROVAL'
        submittedAt = new Date()
      }
    }

    return this.prisma.boardMessage.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId,
        title: dto.title,
        body: dto.body,
        visibility: dto.visibility ?? 'all',
        tags: dto.tags ?? [],
        isPinned: dto.isPinned ?? false,
        status,
        submittedAt,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        authorId: user.id,
        attachmentIds: dto.attachmentIds ?? [],
      },
      include: { author: { select: USER_SELECT } },
    })
  }

  // ─── Update ────────────────────────────────────────────────────

  async update(user: AuthUser, id: string, dto: UpdateBoardMessageDto) {
    const msg = await this.findOneOrFail(user, id)

    if (!['DRAFT', 'REJECTED'].includes(msg.status)) {
      throw new BadRequestException('Zprávu lze upravit pouze ve stavu DRAFT nebo REJECTED')
    }

    const isAdmin = ADMIN_ROLES.includes(user.role)
    let status = msg.status
    let submittedAt = msg.submittedAt

    if (dto.submitForApproval) {
      if (isAdmin) {
        status = 'PUBLISHED'
      } else {
        status = 'PENDING_APPROVAL'
        submittedAt = new Date()
      }
    }

    return this.prisma.boardMessage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        ...(dto.validFrom !== undefined && { validFrom: new Date(dto.validFrom) }),
        ...(dto.validUntil !== undefined && { validUntil: new Date(dto.validUntil) }),
        ...(dto.attachmentIds !== undefined && { attachmentIds: dto.attachmentIds }),
        status,
        submittedAt,
        rejectionNote: null, // clear on re-edit
      },
      include: { author: { select: USER_SELECT } },
    })
  }

  // ─── Review (approve / reject) ────────────────────────────────

  async review(user: AuthUser, id: string, dto: ReviewBoardMessageDto) {
    const msg = await this.findOneOrFail(user, id)

    if (msg.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Zpráva není ve stavu PENDING_APPROVAL')
    }

    const updated = await this.prisma.boardMessage.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        rejectionNote: dto.decision === 'REJECTED' ? dto.rejectionNote : null,
      },
      include: { author: { select: USER_SELECT } },
    })

    // Notify author about review result
    await this.prisma.notification.create({
      data: {
        tenantId: user.tenantId,
        userId: msg.authorId,
        type: dto.decision === 'PUBLISHED' ? 'board_message_approved' : 'board_message_rejected',
        title: dto.decision === 'PUBLISHED'
          ? `Zpráva "${msg.title}" byla schválena`
          : `Zpráva "${msg.title}" byla zamítnuta`,
        body: dto.decision === 'REJECTED' && dto.rejectionNote
          ? `Důvod: ${dto.rejectionNote}`
          : `Zpráva byla ${dto.decision === 'PUBLISHED' ? 'publikována' : 'zamítnuta'}.`,
        entityId: id,
        entityType: 'BoardMessage',
        url: `/properties/${msg.propertyId}?tab=board`,
      },
    })

    return updated
  }

  // ─── Publish (DRAFT → PUBLISHED) ──────────────────────────────

  async publish(user: AuthUser, id: string) {
    const msg = await this.findOneOrFail(user, id)

    if (msg.status !== 'DRAFT') {
      throw new BadRequestException('Publikovat lze pouze zprávu ve stavu DRAFT')
    }

    return this.prisma.boardMessage.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: { author: { select: USER_SELECT } },
    })
  }

  // ─── Archive (PUBLISHED → ARCHIVED) ───────────────────────────

  async archive(user: AuthUser, id: string) {
    const msg = await this.findOneOrFail(user, id)

    if (msg.status !== 'PUBLISHED') {
      throw new BadRequestException('Archivovat lze pouze zprávu ve stavu PUBLISHED')
    }

    return this.prisma.boardMessage.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: { author: { select: USER_SELECT } },
    })
  }

  // ─── Soft delete ───────────────────────────────────────────────

  async remove(user: AuthUser, id: string) {
    await this.findOneOrFail(user, id)

    await this.prisma.boardMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  // ─── Mark as read ──────────────────────────────────────────────

  async markAsRead(user: AuthUser, messageId: string) {
    const msg = await this.prisma.boardMessage.findFirst({
      where: { id: messageId, tenantId: user.tenantId, ...NOT_DELETED },
    })
    if (!msg) throw new NotFoundException('Zpráva nenalezena')

    return this.prisma.boardMessageReadReceipt.upsert({
      where: { messageId_userId: { messageId, userId: user.id } },
      create: {
        tenantId: user.tenantId,
        messageId,
        userId: user.id,
      },
      update: { readAt: new Date() },
    })
  }

  // ─── Read stats ────────────────────────────────────────────────

  async getReadStats(user: AuthUser, messageId: string) {
    const msg = await this.findOneOrFail(user, messageId)

    const receipts = await this.prisma.boardMessageReadReceipt.findMany({
      where: { messageId },
      include: { user: { select: USER_SELECT } },
      orderBy: { readAt: 'desc' },
    })

    return {
      messageId: msg.id,
      totalRead: receipts.length,
      receipts,
    }
  }

  // ─── Pending count ─────────────────────────────────────────────

  async getPendingCount(user: AuthUser, propertyId: string) {
    await this.scope.verifyPropertyAccess(user, propertyId)

    const count = await this.prisma.boardMessage.count({
      where: {
        tenantId: user.tenantId,
        propertyId,
        status: 'PENDING_APPROVAL',
        ...NOT_DELETED,
      },
    })

    return { count }
  }

  // ─── Portal feed (PUBLISHED only) ─────────────────────────────

  async getPortalFeed(user: AuthUser, pagination: { page?: number; limit?: number; mine?: boolean }) {
    // Return user's own non-published messages
    if (pagination.mine) {
      return this.getMyPortalMessages(user, pagination)
    }

    const page = Math.max(1, pagination.page ?? 1)
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20))

    // Resolve user's property IDs through unit ownerships/tenancies
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { partyId: true },
    })

    if (!dbUser?.partyId) return { data: [], total: 0, page, limit, totalPages: 0 }

    const [ownerships, tenancies] = await Promise.all([
      this.prisma.unitOwnership.findMany({
        where: { partyId: dbUser.partyId, isActive: true },
        select: { unit: { select: { propertyId: true } } },
      }),
      this.prisma.tenancy.findMany({
        where: { partyId: dbUser.partyId, isActive: true },
        select: { unit: { select: { propertyId: true } } },
      }),
    ])

    const propertyIds = [
      ...new Set([
        ...ownerships.map(o => o.unit.propertyId),
        ...tenancies.map(t => t.unit.propertyId),
      ]),
    ]

    if (propertyIds.length === 0) return { data: [], total: 0, page, limit, totalPages: 0 }

    const now = new Date()
    const where = {
      tenantId: user.tenantId,
      propertyId: { in: propertyIds },
      status: 'PUBLISHED',
      ...NOT_DELETED,
      OR: [
        { visibility: 'all' },
        { visibility: user.role === 'unit_owner' ? 'owners' : 'tenants' },
      ],
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      ],
    }

    const [data, total] = await Promise.all([
      this.prisma.boardMessage.findMany({
        where,
        include: {
          author: { select: USER_SELECT },
          property: { select: { id: true, name: true } },
          readReceipts: {
            where: { userId: user.id },
            select: { readAt: true },
            take: 1,
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.boardMessage.count({ where }),
    ])

    const mapped = data.map(({ readReceipts, ...rest }) => ({
      ...rest,
      isRead: readReceipts.length > 0,
      readAt: readReceipts[0]?.readAt ?? null,
    }))

    return { data: mapped, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  // ─── Portal: find one (only PUBLISHED) ─────────────────────────

  async findOneForPortal(user: AuthUser, id: string) {
    const msg = await this.prisma.boardMessage.findFirst({
      where: { id, tenantId: user.tenantId, status: 'PUBLISHED', ...NOT_DELETED },
      include: {
        author: { select: USER_SELECT },
        property: { select: { id: true, name: true } },
        readReceipts: {
          where: { userId: user.id },
          select: { readAt: true },
          take: 1,
        },
      },
    })
    if (!msg) throw new NotFoundException('Zpráva nenalezena')

    const { readReceipts, ...rest } = msg
    return {
      ...rest,
      isRead: readReceipts.length > 0,
      readAt: readReceipts[0]?.readAt ?? null,
    }
  }

  // ─── Portal: create (→ PENDING_APPROVAL) ───────────────────────

  async createFromPortal(user: AuthUser, dto: CreateBoardMessageDto) {
    // Verify the user has a relation to this property via unit ownership/tenancy
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { partyId: true },
    })
    if (!dbUser?.partyId) throw new ForbiddenException('Nemáte přiřazenou osobu')

    const unitInProperty = await this.prisma.unitOwnership.findFirst({
      where: {
        partyId: dbUser.partyId,
        isActive: true,
        unit: { propertyId: dto.propertyId },
      },
    })
    const tenancyInProperty = !unitInProperty
      ? await this.prisma.tenancy.findFirst({
          where: {
            partyId: dbUser.partyId,
            isActive: true,
            unit: { propertyId: dto.propertyId },
          },
        })
      : null

    if (!unitInProperty && !tenancyInProperty) {
      throw new ForbiddenException('Nemáte přístup k této nemovitosti')
    }

    const created = await this.prisma.boardMessage.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId,
        title: dto.title,
        body: dto.body,
        visibility: dto.visibility ?? 'all',
        tags: dto.tags ?? [],
        isPinned: false, // portal users cannot pin
        status: 'PENDING_APPROVAL',
        submittedAt: new Date(),
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        authorId: user.id,
        attachmentIds: dto.attachmentIds ?? [],
      },
      include: { author: { select: USER_SELECT } },
    })

    // Notify admins about the new pending message
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: { in: ADMIN_ROLES },
        isActive: true,
      },
      select: { id: true },
    })

    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map(admin => ({
          tenantId: user.tenantId,
          userId: admin.id,
          type: 'board_message_pending',
          title: `Nová zpráva čeká na schválení: "${dto.title}"`,
          body: `Uživatel ${created.author?.name ?? 'Neznámý'} odeslal zprávu ke schválení.`,
          entityId: created.id,
          entityType: 'BoardMessage',
          url: `/properties/${dto.propertyId}?tab=board`,
        })),
      })
    }

    return created
  }

  // ─── Portal: my messages (non-published) ────────────────────────

  private async getMyPortalMessages(user: AuthUser, pagination: { page?: number; limit?: number }) {
    const page = Math.max(1, pagination.page ?? 1)
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20))

    const where = {
      tenantId: user.tenantId,
      authorId: user.id,
      status: { in: ['DRAFT', 'PENDING_APPROVAL', 'REJECTED'] },
      ...NOT_DELETED,
    }

    const [data, total] = await Promise.all([
      this.prisma.boardMessage.findMany({
        where,
        include: { author: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.boardMessage.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  // ─── Portal: update own message ────────────────────────────────

  async updateFromPortal(user: AuthUser, id: string, dto: UpdateBoardMessageDto) {
    const msg = await this.prisma.boardMessage.findFirst({
      where: { id, tenantId: user.tenantId, authorId: user.id, ...NOT_DELETED },
    })
    if (!msg) throw new NotFoundException('Zpráva nenalezena')

    if (!['DRAFT', 'REJECTED'].includes(msg.status)) {
      throw new BadRequestException('Zprávu lze upravit pouze ve stavu DRAFT nebo REJECTED')
    }

    return this.prisma.boardMessage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.validFrom !== undefined && { validFrom: new Date(dto.validFrom) }),
        ...(dto.validUntil !== undefined && { validUntil: new Date(dto.validUntil) }),
        ...(dto.attachmentIds !== undefined && { attachmentIds: dto.attachmentIds }),
        status: dto.submitForApproval ? 'PENDING_APPROVAL' : msg.status,
        submittedAt: dto.submitForApproval ? new Date() : msg.submittedAt,
        rejectionNote: null,
      },
      include: { author: { select: USER_SELECT } },
    })
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private async findOneOrFail(user: AuthUser, id: string) {
    const msg = await this.prisma.boardMessage.findFirst({
      where: { id, tenantId: user.tenantId, ...NOT_DELETED },
    })
    if (!msg) throw new NotFoundException('Zpráva nenalezena')
    await this.scope.verifyPropertyAccess(user, msg.propertyId)
    return msg
  }
}

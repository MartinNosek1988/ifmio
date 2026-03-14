import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types'

const DAY_MS = 86_400_000
const DUE_SOON_DAYS = 30

@Injectable()
export class AssetPassportService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  // ─── Passport overview ─────────────────────────────────────────

  async getPassport(user: AuthUser, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: user.tenantId, deletedAt: null },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        assetType: {
          select: {
            id: true, name: true, code: true,
            _count: { select: { activityAssignments: true } },
          },
        },
        serviceRecords: { orderBy: { date: 'desc' }, take: 5 },
      },
    })
    if (!asset) throw new NotFoundException('Aktivum nenalezeno')
    await this.scope.verifyEntityAccess(user, asset.propertyId)

    const now = new Date()
    const dueSoonThreshold = new Date(now.getTime() + DUE_SOON_DAYS * DAY_MS)

    // Compliance summary from revision plans linked to this asset
    const plans = await this.prisma.revisionPlan.findMany({
      where: { assetId, tenantId: user.tenantId, status: 'active' },
      select: { id: true, nextDueAt: true, isMandatory: true },
    })

    const compliance = {
      total: plans.length,
      overdue: 0,
      dueSoon: 0,
      compliant: 0,
      noDate: 0,
    }

    for (const p of plans) {
      if (!p.nextDueAt) {
        compliance.noDate++
      } else if (p.nextDueAt < now) {
        compliance.overdue++
      } else if (p.nextDueAt <= dueSoonThreshold) {
        compliance.dueSoon++
      } else {
        compliance.compliant++
      }
    }

    // Overall compliance badge
    let complianceBadge: 'ok' | 'warning' | 'critical' | 'none' = 'none'
    if (compliance.total > 0) {
      if (compliance.overdue > 0) {
        complianceBadge = 'critical'
      } else if (compliance.dueSoon > 0) {
        complianceBadge = 'warning'
      } else {
        complianceBadge = 'ok'
      }
    }

    return {
      asset,
      complianceSummary: { ...compliance, badge: complianceBadge },
    }
  }

  // ─── Revision history ──────────────────────────────────────────

  async getRevisionHistory(
    user: AuthUser,
    assetId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    // Verify asset exists and belongs to tenant
    await this.resolveAsset(user, assetId)

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit

    const where = {
      tenantId: user.tenantId,
      revisionPlan: { assetId },
    }

    const [data, total] = await Promise.all([
      this.prisma.revisionEvent.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        skip,
        take: limit,
        include: {
          revisionPlan: {
            select: {
              id: true, title: true,
              revisionType: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      this.prisma.revisionEvent.count({ where }),
    ])

    return { data, total, page, limit }
  }

  // ─── Audit timeline ────────────────────────────────────────────

  async getAuditEvents(
    user: AuthUser,
    assetId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    await this.resolveAsset(user, assetId)

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit

    const where = {
      tenantId: user.tenantId,
      entity: 'Asset',
      entityId: assetId,
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { data, total, page, limit }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private async resolveAsset(user: AuthUser, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, propertyId: true },
    })
    if (!asset) throw new NotFoundException('Aktivum nenalezeno')
    await this.scope.verifyEntityAccess(user, asset.propertyId)
    return asset
  }
}

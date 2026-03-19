import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class SecurityDashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(user: AuthUser) {
    const tenantId = user.tenantId
    const now = new Date()
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      failedLogins24h, failedLogins7d,
      suspiciousRefreshes, securityAlerts,
      activeUsersCount,
      mfaEnabled, totalUsers,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where: { tenantId, action: 'LOGIN_FAIL', createdAt: { gte: h24 } } }),
      this.prisma.auditLog.count({ where: { tenantId, action: 'LOGIN_FAIL', createdAt: { gte: d7 } } }),
      this.prisma.auditLog.count({ where: { tenantId, action: 'SUSPICIOUS_REFRESH', createdAt: { gte: d30 } } }),
      this.prisma.auditLog.count({ where: { tenantId, action: 'SECURITY_ALERT', createdAt: { gte: d30 } } }),
      this.prisma.auditLog.groupBy({ by: ['userId'], where: { tenantId, createdAt: { gte: d7 } }, _count: true }).then(r => r.length),
      this.prisma.user.count({ where: { tenantId, isActive: true, totpEnabled: true } }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
    ])

    return {
      failedLogins: { last24h: failedLogins24h, last7d: failedLogins7d },
      suspiciousRefreshes,
      securityAlerts,
      activeUsers7d: activeUsersCount,
      mfaAdoption: { enabled: mfaEnabled, total: totalUsers, percentage: totalUsers > 0 ? Math.round((mfaEnabled / totalUsers) * 100) : 0 },
    }
  }

  async getFailedLogins(user: AuthUser, page = 1, limit = 20) {
    const tenantId = user.tenantId
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId, action: 'LOGIN_FAIL' },
        select: { id: true, newData: true, ipAddress: true, userAgent: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit, skip,
      }),
      this.prisma.auditLog.count({ where: { tenantId, action: 'LOGIN_FAIL' } }),
    ])
    return { data, total, page, limit }
  }

  async getActiveSessions(user: AuthUser) {
    return this.prisma.refreshToken.findMany({
      where: { user: { tenantId: user.tenantId }, expiresAt: { gt: new Date() } },
      select: {
        id: true, ipAddress: true, userAgent: true, deviceName: true,
        lastUsedAt: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { lastUsedAt: 'desc' },
    })
  }

  async revokeUserSessions(adminUser: AuthUser, targetUserId: string) {
    const target = await this.prisma.user.findFirst({ where: { id: targetUserId, tenantId: adminUser.tenantId } })
    if (!target) return { success: false }

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } }),
      this.prisma.auditLog.create({
        data: {
          tenantId: adminUser.tenantId, userId: adminUser.id,
          action: 'ADMIN_REVOKE_SESSIONS', entity: 'User', entityId: targetUserId,
        },
      }),
    ])
    return { success: true }
  }
}

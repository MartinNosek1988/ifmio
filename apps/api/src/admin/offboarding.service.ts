import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TokenBlacklistService } from '../auth/token-blacklist.service'
import { SecurityAlertingService } from '../common/security/security-alerting.service'

export interface OffboardingReport {
  userId: string
  deletedRefreshTokens: number
  revokedApiKeys: number
  blacklistedAccessTokens: boolean
}

@Injectable()
export class OffboardingService {
  private readonly logger = new Logger(OffboardingService.name)

  constructor(
    private prisma: PrismaService,
    private blacklist: TokenBlacklistService,
    private alerting: SecurityAlertingService,
  ) {}

  async deactivateUser(
    tenantId: string,
    targetUserId: string,
    performedBy: string,
  ): Promise<OffboardingReport> {
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
    })
    if (!target) throw new NotFoundException('Uživatel nenalezen')
    if (targetUserId === performedBy) {
      throw new ForbiddenException('Nemůžete deaktivovat sebe')
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Deactivate user
      await tx.user.update({
        where: { id: targetUserId },
        data: { isActive: false },
      })

      // 2. Delete ALL refresh tokens (kills all sessions)
      const deletedTokens = await tx.refreshToken.deleteMany({
        where: { userId: targetUserId },
      })

      // 3. Revoke API keys created by this user
      const revokedKeys = await tx.apiKey.updateMany({
        where: { userId: targetUserId, isActive: true },
        data: { isActive: false },
      })

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'USER_OFFBOARDED',
          entity: 'User',
          entityId: targetUserId,
          newData: {
            userName: target.name,
            userEmail: target.email,
            deletedRefreshTokens: deletedTokens.count,
            revokedApiKeys: revokedKeys.count,
            performedBy,
          },
          ipAddress: 'system',
          userAgent: 'offboarding-service',
        },
      })

      return {
        userId: targetUserId,
        deletedRefreshTokens: deletedTokens.count,
        revokedApiKeys: revokedKeys.count,
        blacklistedAccessTokens: true, // JWT guard checks isActive
      }
    }).then(async (report) => {
      // Fire security alert (outside transaction)
      this.alerting.alert({
        tenantId,
        type: 'USER_DEACTIVATED',
        severity: 'medium',
        details: {
          userName: target.name,
          userEmail: target.email,
          deletedSessions: report.deletedRefreshTokens,
          revokedApiKeys: report.revokedApiKeys,
          performedBy,
        },
        timestamp: new Date(),
      }).catch(() => {})

      this.logger.log(`User offboarded: ${target.email} (${targetUserId}) by ${performedBy}`)
      return report
    })
  }
}

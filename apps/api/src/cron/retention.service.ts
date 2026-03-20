import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const BATCH_SIZE = 500

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Per-tenant data retention enforcement.
   * Called daily by CronService.
   */
  async enforceRetention(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        retentionAuditLogDays: true,
        retentionBackupDays: true,
        retentionSessionDays: true,
      },
    })

    for (const tenant of tenants) {
      try {
        await this.cleanTenant(tenant)
      } catch (err) {
        this.logger.error(`Retention failed for tenant ${tenant.id}: ${(err as Error).message}`)
      }
    }

    // Global cleanup (not tenant-scoped)
    await this.cleanGlobal()
  }

  private async cleanTenant(tenant: {
    id: string
    retentionAuditLogDays: number
    retentionBackupDays: number
    retentionSessionDays: number
  }) {
    const now = new Date()
    let totalCleaned = 0

    // 1. Audit log cleanup (NEVER delete GDPR_ERASURE records)
    const auditCutoff = new Date(now.getTime() - tenant.retentionAuditLogDays * 86_400_000)
    const deletedAudits = await this.batchDelete('auditLog', {
      tenantId: tenant.id,
      createdAt: { lt: auditCutoff },
      action: { not: 'GDPR_ERASURE' },
    })
    totalCleaned += deletedAudits

    // 2. Expired refresh tokens
    const sessionCutoff = new Date(now.getTime() - tenant.retentionSessionDays * 86_400_000)
    const deletedTokens = await this.prisma.refreshToken.deleteMany({
      where: {
        user: { tenantId: tenant.id },
        expiresAt: { lt: sessionCutoff },
      },
    })
    totalCleaned += deletedTokens.count

    // 3. LoginRiskLog cleanup (90 days or tenant retention)
    const riskCutoff = new Date(now.getTime() - 90 * 86_400_000)
    const deletedRisk = await this.prisma.loginRiskLog.deleteMany({
      where: {
        tenantId: tenant.id,
        createdAt: { lt: riskCutoff },
      },
    })
    totalCleaned += deletedRisk.count

    if (totalCleaned > 0) {
      this.logger.log(
        `Retention [${tenant.id}]: audit=${deletedAudits}, tokens=${deletedTokens.count}, risk=${deletedRisk.count}`,
      )

      // Log retention action (this record itself is subject to retention)
      await this.prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: 'RETENTION_CLEANUP',
          entity: 'System',
          newData: {
            deletedAuditLogs: deletedAudits,
            deletedRefreshTokens: deletedTokens.count,
            deletedRiskLogs: deletedRisk.count,
            retentionDays: tenant.retentionAuditLogDays,
          },
          ipAddress: 'system',
          userAgent: 'retention-service',
        },
      }).catch(() => {})
    }
  }

  private async cleanGlobal() {
    // Revoked tokens — clean expired (regardless of tenant)
    const deleted = await this.prisma.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    if (deleted.count > 0) {
      this.logger.log(`Global retention: ${deleted.count} expired revoked tokens cleaned`)
    }
  }

  /** Batch delete to avoid long-running transactions */
  private async batchDelete(model: 'auditLog', where: Record<string, unknown>): Promise<number> {
    let totalDeleted = 0
    let deleted: number

    do {
      const batch = await (this.prisma as any)[model].findMany({
        where,
        select: { id: true },
        take: BATCH_SIZE,
      })

      if (batch.length === 0) break

      const result = await (this.prisma as any)[model].deleteMany({
        where: { id: { in: batch.map((r: { id: string }) => r.id) } },
      })

      deleted = result.count
      totalDeleted += deleted
    } while (deleted === BATCH_SIZE)

    return totalDeleted
  }
}

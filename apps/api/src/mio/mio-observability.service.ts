import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MioConfigService } from './mio-config.service'

@Injectable()
export class MioObservabilityService {
  constructor(
    private prisma: PrismaService,
    private mioConfig: MioConfigService,
  ) {}

  // ─── OVERVIEW ─────────────────────────────────────────────────

  async getOverview(tenantId: string) {
    const [
      activeFindings,
      activeRecommendations,
      digestEnabled,
      digestSent24h,
      digestSkipped24h,
      digestFailed24h,
      lastDetectionRun,
      lastDigestRun,
    ] = await Promise.all([
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'finding', status: 'active' } }),
      this.prisma.mioFinding.count({ where: { tenantId, kind: 'recommendation', status: 'active' } }),
      this.prisma.scheduledReportSubscription.count({ where: { tenantId, reportType: 'mio_digest', isEnabled: true } }),
      this.prisma.mioDigestLog.count({ where: { tenantId, status: 'sent', createdAt: { gte: ago(24) } } }),
      this.prisma.mioDigestLog.count({ where: { tenantId, status: 'skipped', createdAt: { gte: ago(24) } } }),
      this.prisma.mioDigestLog.count({ where: { tenantId, status: 'failed', createdAt: { gte: ago(24) } } }),
      this.prisma.mioJobRunLog.findFirst({ where: { jobType: 'detection' }, orderBy: { createdAt: 'desc' } }),
      this.prisma.mioJobRunLog.findFirst({ where: { jobType: { startsWith: 'digest' } }, orderBy: { createdAt: 'desc' } }),
    ])

    const config = await this.mioConfig.getConfig(tenantId)

    const enabledFindingsCount = Object.values(config.enabledFindings).filter(v => v !== false).length
    const enabledRecsCount = Object.values(config.enabledRecommendations).filter(v => v !== false).length
    const autoTicketCount = Object.values(config.autoTicketPolicy).filter(v => v === true).length

    return {
      activeFindings,
      activeRecommendations,
      digestSubscribers: digestEnabled,
      digestEnabled: config.digest.enabled,
      digest24h: { sent: digestSent24h, skipped: digestSkipped24h, failed: digestFailed24h },
      enabledFindingsCount,
      enabledRecsCount,
      autoTicketCount,
      lastDetectionRun: lastDetectionRun ? {
        status: lastDetectionRun.status,
        at: lastDetectionRun.finishedAt,
        tenantCount: lastDetectionRun.tenantCount,
        created: lastDetectionRun.itemsCreated,
        resolved: lastDetectionRun.itemsResolved,
      } : null,
      lastDigestRun: lastDigestRun ? {
        jobType: lastDigestRun.jobType,
        status: lastDigestRun.status,
        at: lastDigestRun.finishedAt,
        sent: lastDigestRun.emailsSent,
        skipped: lastDigestRun.skippedCount,
        failed: lastDigestRun.failureCount,
      } : null,
    }
  }

  // ─── JOB RUNS ─────────────────────────────────────────────────

  async getRecentJobs(limit = 20) {
    return this.prisma.mioJobRunLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, jobType: true, status: true, startedAt: true, finishedAt: true,
        tenantCount: true, itemsCreated: true, itemsResolved: true,
        emailsSent: true, skippedCount: true, failureCount: true, summary: true,
      },
    })
  }

  // ─── DIGEST DELIVERY ─────────────────────────────────────────

  async getDigestDelivery(tenantId: string, days = 7) {
    const since = ago(days * 24)

    const [logs, byStatus] = await Promise.all([
      this.prisma.mioDigestLog.findMany({
        where: { tenantId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true, frequency: true, status: true,
          findingsCount: true, recommendationsCount: true,
          skippedReason: true, createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.mioDigestLog.groupBy({
        by: ['status'],
        where: { tenantId, createdAt: { gte: since } },
        _count: true,
      }),
    ])

    const summary: Record<string, number> = { sent: 0, skipped: 0, failed: 0 }
    for (const g of byStatus) summary[g.status] = g._count

    return { summary, logs, period: `${days}d` }
  }

  // ─── RECENT FAILURES ─────────────────────────────────────────

  async getRecentFailures(tenantId: string, limit = 10) {
    const [digestFailures, jobFailures] = await Promise.all([
      this.prisma.mioDigestLog.findMany({
        where: { tenantId, status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true, frequency: true, skippedReason: true, createdAt: true,
          user: { select: { name: true } },
        },
      }),
      this.prisma.mioJobRunLog.findMany({
        where: { status: { in: ['failed', 'partial'] } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true, jobType: true, status: true, summary: true, finishedAt: true,
          failureCount: true,
        },
      }),
    ])

    return { digestFailures, jobFailures }
  }

  // ─── JOB LOGGING (called by CronService) ─────────────────────

  async logJobRun(data: {
    jobType: string
    startedAt: Date
    status: string
    tenantCount?: number
    itemsCreated?: number
    itemsResolved?: number
    emailsSent?: number
    skippedCount?: number
    failureCount?: number
    summary?: string
  }) {
    return this.prisma.mioJobRunLog.create({
      data: {
        jobType: data.jobType,
        startedAt: data.startedAt,
        status: data.status,
        tenantCount: data.tenantCount ?? 0,
        itemsCreated: data.itemsCreated ?? 0,
        itemsResolved: data.itemsResolved ?? 0,
        emailsSent: data.emailsSent ?? 0,
        skippedCount: data.skippedCount ?? 0,
        failureCount: data.failureCount ?? 0,
        summary: data.summary,
      },
    })
  }
}

function ago(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000)
}

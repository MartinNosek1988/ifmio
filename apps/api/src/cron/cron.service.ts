import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HelpdeskEscalationService } from '../helpdesk/helpdesk-escalation.service';
import { RevisionEscalationService } from '../revisions/revision-escalation.service';

const ONE_HOUR = 60 * 60 * 1000;
const SIX_HOURS = 6 * ONE_HOUR;
const TWENTY_FOUR_HOURS = 24 * ONE_HOUR;
const BATCH_SIZE = 1000;

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronService.name);
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private retentionInterval: ReturnType<typeof setInterval> | null = null;
  private slaInterval: ReturnType<typeof setInterval> | null = null;
  private revisionEscalationInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly escalation: HelpdeskEscalationService,
    private readonly revisionEscalation: RevisionEscalationService,
  ) {}

  onModuleInit() {
    this.initKeepalive();
    this.initAuditRetention();
    this.initSlaEscalation();
    this.initRevisionEscalation();
  }

  onModuleDestroy() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
    if (this.retentionInterval) {
      clearInterval(this.retentionInterval);
      this.retentionInterval = null;
    }
    if (this.slaInterval) {
      clearInterval(this.slaInterval);
      this.slaInterval = null;
    }
    if (this.revisionEscalationInterval) {
      clearInterval(this.revisionEscalationInterval);
      this.revisionEscalationInterval = null;
    }
    this.logger.log('Cron intervals cleared');
  }

  // ─── Supabase Keepalive ──────────────────────────────────────

  private initKeepalive() {
    const dbUrl = this.config.get<string>('DATABASE_URL') ?? '';
    if (!dbUrl.toLowerCase().includes('supabase')) {
      this.logger.log('Non-Supabase DB detected — keepalive disabled');
      return;
    }

    this.logger.log('Supabase DB detected — starting keepalive (every 6h)');
    this.ping();
    this.keepaliveInterval = setInterval(() => this.ping(), SIX_HOURS);
  }

  private async ping() {
    try {
      const result = await this.prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
      this.logger.log(`Supabase keepalive OK — ${result[0]?.now}`);
    } catch (err) {
      this.logger.error(
        'Supabase keepalive FAILED',
        (err as Error).stack,
      );
    }
  }

  // ─── SLA Escalation ─────────────────────────────────────────

  private initSlaEscalation() {
    this.logger.log('SLA escalation enabled — checking overdue tickets every hour');

    // Run once on startup (delayed by 60s)
    setTimeout(() => this.runSlaEscalation(), 60_000);

    // Then every hour
    this.slaInterval = setInterval(() => this.runSlaEscalation(), ONE_HOUR);
  }

  private async runSlaEscalation() {
    try {
      const escalation = await this.escalation.escalateOverdueTickets();
      this.logger.log(
        `SLA escalation: checked ${escalation.checked} tickets, escalated ${escalation.escalated}`,
      );

      const dueSoon = await this.escalation.notifyDueSoonTickets();
      this.logger.log(
        `SLA due-soon: checked ${dueSoon.checked} tickets, notified ${dueSoon.notified}`,
      );
    } catch (err) {
      this.logger.error(
        'SLA escalation job FAILED',
        (err as Error).stack,
      );
    }
  }

  // ─── Revision Compliance Escalation ─────────────────────────

  private initRevisionEscalation() {
    this.logger.log('Revision escalation enabled — checking compliance every 6h');

    // Run once on startup (delayed by 90s)
    setTimeout(() => this.runRevisionEscalation(), 90_000);

    // Then every 6 hours
    this.revisionEscalationInterval = setInterval(() => this.runRevisionEscalation(), SIX_HOURS);
  }

  private async runRevisionEscalation() {
    try {
      const result = await this.revisionEscalation.escalateComplianceIssues();
      this.logger.log(
        `Revision escalation: checked ${result.checked} plans, escalated ${result.escalated}`,
      );
    } catch (err) {
      this.logger.error(
        'Revision escalation job FAILED',
        (err as Error).stack,
      );
    }
  }

  // ─── Audit Log Retention ─────────────────────────────────────

  private initAuditRetention() {
    const retentionDays = parseInt(
      this.config.get<string>('AUDIT_LOG_RETENTION_DAYS') ?? '365',
      10,
    );

    if (retentionDays <= 0) {
      this.logger.log('Audit log retention disabled (AUDIT_LOG_RETENTION_DAYS <= 0)');
      return;
    }

    this.logger.log(`Audit log retention enabled — deleting logs older than ${retentionDays} days (daily)`);

    // Run once on startup (delayed by 30s to let app fully initialize)
    setTimeout(() => this.purgeOldAuditLogs(retentionDays), 30_000);

    // Then every 24 hours
    this.retentionInterval = setInterval(
      () => this.purgeOldAuditLogs(retentionDays),
      TWENTY_FOUR_HOURS,
    );
  }

  private async purgeOldAuditLogs(retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    let totalDeleted = 0;

    try {
      // Delete in batches to avoid long-running transactions
      let deleted: number;
      do {
        const batch = await this.prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
          take: BATCH_SIZE,
        });

        if (batch.length === 0) break;

        const result = await this.prisma.auditLog.deleteMany({
          where: { id: { in: batch.map((r) => r.id) } },
        });

        deleted = result.count;
        totalDeleted += deleted;
      } while (deleted === BATCH_SIZE);

      if (totalDeleted > 0) {
        this.logger.log(
          `Audit retention: deleted ${totalDeleted} logs older than ${retentionDays} days (cutoff: ${cutoff.toISOString()})`,
        );
      } else {
        this.logger.log('Audit retention: no expired logs to delete');
      }
    } catch (err) {
      this.logger.error(
        'Audit retention job FAILED',
        (err as Error).stack,
      );
    }
  }
}

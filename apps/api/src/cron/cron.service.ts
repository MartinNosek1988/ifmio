import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HelpdeskEscalationService } from '../helpdesk/helpdesk-escalation.service';
import { RevisionEscalationService } from '../revisions/revision-escalation.service';
import { ScheduledReportsService } from '../reports/scheduled-reports.service';
import { RecurringPlansService } from '../recurring-plans/recurring-plans.service';
import { MioFindingsService } from '../mio/mio-findings.service';
import { MioDigestService } from '../mio/mio-digest.service';
import { MioObservabilityService } from '../mio/mio-observability.service';
import { MioWebhookService } from '../mio/mio-webhook.service';

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
  private dailyDigestInterval: ReturnType<typeof setInterval> | null = null;
  private scheduledReportsInterval: ReturnType<typeof setInterval> | null = null;
  private recurringGenInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly escalation: HelpdeskEscalationService,
    private readonly revisionEscalation: RevisionEscalationService,
    private readonly scheduledReports: ScheduledReportsService,
    private readonly recurringPlans: RecurringPlansService,
    private readonly mioFindings: MioFindingsService,
    private readonly mioDigest: MioDigestService,
    private readonly mioObs: MioObservabilityService,
    private readonly mioWebhooks: MioWebhookService,
  ) {}

  onModuleInit() {
    this.initKeepalive();
    this.initAuditRetention();
    this.initSlaEscalation();
    this.initRevisionEscalation();
    this.initDailyDigest();
    this.initScheduledReports();
    this.initRecurringGeneration();
    this.initMioDetection();
    this.initMioDigest();
    this.initWebhookOutbox();
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
    if (this.dailyDigestInterval) {
      clearInterval(this.dailyDigestInterval);
      this.dailyDigestInterval = null;
    }
    if (this.scheduledReportsInterval) {
      clearInterval(this.scheduledReportsInterval);
      this.scheduledReportsInterval = null;
    }
    if (this.recurringGenInterval) {
      clearInterval(this.recurringGenInterval);
      this.recurringGenInterval = null;
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

  // ─── Daily Digest ──────────────────────────────────────────

  private initDailyDigest() {
    this.logger.log('Daily digest enabled — sending every morning at ~6:00');

    // Check every hour; only send once per day around 6:00 local time
    this.dailyDigestInterval = setInterval(() => this.maybeRunDigest(), ONE_HOUR);

    // Also check shortly after startup
    setTimeout(() => this.maybeRunDigest(), 120_000);
  }

  private lastDigestDate = '';

  private async maybeRunDigest() {
    const now = new Date();
    const hour = now.getHours();
    const dateStr = now.toISOString().slice(0, 10);

    // Only send between 5:00–8:00 and once per day
    if (hour < 5 || hour > 8 || dateStr === this.lastDigestDate) return;

    this.lastDigestDate = dateStr;
    try {
      const result = await this.scheduledReports.sendDailyDigests();
      this.logger.log(`Daily digest: ${result.sent} sent, ${result.failed} failed across ${result.tenants} tenants`);
    } catch (err) {
      this.logger.error('Daily digest job FAILED', (err as Error).stack);
    }
  }

  // ─── Scheduled Reports ────────────────────────────────────

  private initScheduledReports() {
    this.logger.log('Scheduled reports enabled — processing daily/weekly/monthly');

    // Check every hour
    this.scheduledReportsInterval = setInterval(() => this.maybeRunScheduledReports(), ONE_HOUR);

    // Check on startup (delayed)
    setTimeout(() => this.maybeRunScheduledReports(), 180_000);
  }

  private lastScheduledDate = '';

  private async maybeRunScheduledReports() {
    const now = new Date();
    const hour = now.getHours();
    const dateStr = now.toISOString().slice(0, 10);

    // Process between 6:00–9:00, once per day
    if (hour < 6 || hour > 9 || dateStr === this.lastScheduledDate) return;

    this.lastScheduledDate = dateStr;
    try {
      // Always process daily
      const daily = await this.scheduledReports.processScheduledReports('daily');
      this.logger.log(`Scheduled daily: ${daily.sent} sent, ${daily.failed} failed`);

      // Weekly on Mondays
      if (now.getDay() === 1) {
        const weekly = await this.scheduledReports.processScheduledReports('weekly');
        this.logger.log(`Scheduled weekly: ${weekly.sent} sent, ${weekly.failed} failed`);
      }

      // Monthly on 1st of month
      if (now.getDate() === 1) {
        const monthly = await this.scheduledReports.processScheduledReports('monthly');
        this.logger.log(`Scheduled monthly: ${monthly.sent} sent, ${monthly.failed} failed`);
      }
    } catch (err) {
      this.logger.error('Scheduled reports job FAILED', (err as Error).stack);
    }
  }

  // ─── Recurring Activity Generation ────────────────────────

  private initRecurringGeneration() {
    this.logger.log('Recurring activity generation enabled — checking every hour');
    setTimeout(() => this.runRecurringGeneration(), 150_000);
    this.recurringGenInterval = setInterval(() => this.runRecurringGeneration(), ONE_HOUR);
  }

  private async runRecurringGeneration() {
    try {
      const result = await this.recurringPlans.generatePendingTickets();
      if (result.generated > 0 || result.skipped > 0) {
        this.logger.log(`Recurring generation: checked ${result.checked}, generated ${result.generated}, skipped ${result.skipped}`);
      }
    } catch (err) {
      this.logger.error('Recurring generation job FAILED', (err as Error).stack);
    }
  }

  // ─── Mio Findings Detection ───────────────────────────────

  private initMioDetection() {
    this.logger.log('Mio findings detection enabled — running every 6 hours');
    setTimeout(() => this.runMioDetection(), 200_000);
    setInterval(() => this.runMioDetection(), SIX_HOURS);
  }

  private async runMioDetection() {
    const startedAt = new Date();
    try {
      const result = await this.mioFindings.runDetection();
      this.logger.log(`Mio detection: ${result.checked} tenants, ${result.created} new, ${result.resolved} resolved, ${result.ticketsCreated} tickets`);
      await this.mioObs.logJobRun({
        jobType: 'detection', startedAt, status: 'success',
        tenantCount: result.checked, itemsCreated: result.created,
        itemsResolved: result.resolved,
        summary: `${result.created} nových, ${result.resolved} vyřešených, ${result.ticketsCreated} ticketů`,
      }).catch(() => {});
    } catch (err) {
      this.logger.error('Mio detection job FAILED', (err as Error).stack);
      await this.mioObs.logJobRun({
        jobType: 'detection', startedAt, status: 'failed',
        summary: 'Kontrola selhala',
      }).catch(() => {});
    }
  }

  // ─── Mio Digest ─────────────────────────────────────────────

  private initMioDigest() {
    this.logger.log('Mio digest enabled — daily at ~7:00, weekly on Mondays');
    setInterval(() => this.maybeRunMioDigest(), ONE_HOUR);
    setTimeout(() => this.maybeRunMioDigest(), 250_000);
  }

  private lastMioDigestDate = '';

  private async maybeRunMioDigest() {
    const now = new Date();
    const hour = now.getHours();
    const dateStr = now.toISOString().slice(0, 10);

    // Run between 6:00-9:00, once per day
    if (hour < 6 || hour > 9 || dateStr === this.lastMioDigestDate) return;

    this.lastMioDigestDate = dateStr;
    try {
      // Always process daily
      const startDaily = new Date();
      const daily = await this.mioDigest.sendMioDigests('daily');
      await this.mioObs.logJobRun({
        jobType: 'digest_daily', startedAt: startDaily,
        status: daily.failed > 0 ? 'partial' : 'success',
        tenantCount: daily.tenants, emailsSent: daily.sent,
        skippedCount: daily.skipped, failureCount: daily.failed,
        summary: `${daily.sent} odesláno, ${daily.skipped} přeskočeno`,
      }).catch(() => {});

      // Weekly on Mondays
      if (now.getDay() === 1) {
        const startWeekly = new Date();
        const weekly = await this.mioDigest.sendMioDigests('weekly');
        await this.mioObs.logJobRun({
          jobType: 'digest_weekly', startedAt: startWeekly,
          status: weekly.failed > 0 ? 'partial' : 'success',
          tenantCount: weekly.tenants, emailsSent: weekly.sent,
          skippedCount: weekly.skipped, failureCount: weekly.failed,
          summary: `${weekly.sent} odesláno, ${weekly.skipped} přeskočeno`,
        }).catch(() => {});
      }
    } catch (err) {
      this.logger.error('Mio digest job FAILED', (err as Error).stack);
      await this.mioObs.logJobRun({
        jobType: 'digest_daily', startedAt: now, status: 'failed',
        summary: 'Odesílání přehledů selhalo',
      }).catch(() => {});
    }
  }

  // ─── Webhook Outbox Worker ──────────────────────────────────

  private initWebhookOutbox() {
    this.logger.log('Webhook outbox worker enabled — processing every 15s');
    setInterval(() => this.processWebhookOutbox(), 15_000);
    setTimeout(() => this.processWebhookOutbox(), 10_000);
  }

  private async processWebhookOutbox() {
    try {
      const result = await this.mioWebhooks.processOutbox();
      if (result.processed > 0) {
        this.logger.log(`Webhook outbox: ${result.processed} processed, ${result.sent} sent, ${result.failed} retry, ${result.exhausted} exhausted`);
      }
    } catch (err) {
      this.logger.error('Webhook outbox processing FAILED', (err as Error).stack);
    }
  }
}

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
import { BankingService } from '../banking/banking.service';
import { WhatsAppAutomationService } from '../whatsapp/whatsapp-automation.service';
import { AiBatchService } from '../finance/ai-batch.service';
import { RetentionService } from './retention.service';
import { PvkService } from '../pvk/pvk.service';
import { CuzkEnrichService } from '../knowledge-base/cuzk-enrich.service';
import { DataorService } from '../integrations/dataor/dataor.service';
import { MassMailingService } from '../mass-mailing/mass-mailing.service';
import { RuianVfrImportService } from '../knowledge-base/ruian-vfr/ruian-vfr-import.service';

const ONE_HOUR = 60 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const FIFTEEN_MIN = 15 * 60 * 1000;
const SIX_HOURS = 6 * ONE_HOUR;
const TWENTY_FOUR_HOURS = 24 * ONE_HOUR;
const BATCH_SIZE = 1000;
const FIO_RATE_LIMIT_MS = 31_000; // Fio API: 1 req per 30s

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
  private bankingSyncInterval: ReturnType<typeof setInterval> | null = null;
  private batchPollInterval: ReturnType<typeof setInterval> | null = null;
  private mioRetentionInterval: ReturnType<typeof setInterval> | null = null;
  private scheduledCampaignInterval: ReturnType<typeof setInterval> | null = null;
  private ruianVfrInterval: ReturnType<typeof setInterval> | null = null;

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
    private readonly banking: BankingService,
    private readonly waAutomation: WhatsAppAutomationService,
    private readonly aiBatch: AiBatchService,
    private readonly retention: RetentionService,
    private readonly pvk: PvkService,
    private readonly cuzkEnrich: CuzkEnrichService,
    private readonly dataor: DataorService,
    private readonly massMailing: MassMailingService,
    private readonly ruianVfrImport: RuianVfrImportService,
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
    this.initBankingSync();
    this.initWhatsAppAutomation();
    this.initBatchPolling();
    this.initMioRetention();
    this.initPvkSync();
    this.initCuzkEnrich();
    this.initDataorImport();
    this.initScheduledCampaigns();
    this.initRuianVfrUpdate();
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
    if (this.bankingSyncInterval) {
      clearInterval(this.bankingSyncInterval);
      this.bankingSyncInterval = null;
    }
    if (this.batchPollInterval) {
      clearInterval(this.batchPollInterval);
      this.batchPollInterval = null;
    }
    if (this.mioRetentionInterval) {
      clearInterval(this.mioRetentionInterval);
      this.mioRetentionInterval = null;
    }
    if (this.pvkSyncInterval) {
      clearInterval(this.pvkSyncInterval);
      this.pvkSyncInterval = null;
    }
    if (this.cuzkEnrichInterval) {
      clearInterval(this.cuzkEnrichInterval);
      this.cuzkEnrichInterval = null;
    }
    if (this.dataorImportInterval) {
      clearInterval(this.dataorImportInterval);
      this.dataorImportInterval = null;
    }
    if (this.scheduledCampaignInterval) {
      clearInterval(this.scheduledCampaignInterval);
      this.scheduledCampaignInterval = null;
    }
    if (this.ruianVfrInterval) {
      clearInterval(this.ruianVfrInterval);
      this.ruianVfrInterval = null;
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
    this.logger.log('Per-tenant data retention enabled (daily at 2:00)');

    // Run once on startup (delayed by 30s)
    setTimeout(() => this.retention.enforceRetention().catch(err =>
      this.logger.error('Retention job FAILED', (err as Error).stack),
    ), 30_000);

    // Then every 24 hours
    this.retentionInterval = setInterval(
      () => this.retention.enforceRetention().catch(err =>
        this.logger.error('Retention job FAILED', (err as Error).stack),
      ),
      TWENTY_FOUR_HOURS,
    );
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
      if (result.processed > 0 || result.recovered > 0) {
        this.logger.log(`Webhook outbox: ${result.processed} processed, ${result.sent} sent, ${result.failed} retry, ${result.exhausted} exhausted, ${result.recovered} recovered`);
      }
    } catch (err) {
      this.logger.error('Webhook outbox processing FAILED', (err as Error).stack);
    }
  }

  // ─── Banking API Sync ────────────────────────────────────────

  private initBankingSync() {
    this.logger.log('Banking sync enabled — polling every 15min');
    setTimeout(() => this.runBankingSync(), 120_000); // 2min after startup
    this.bankingSyncInterval = setInterval(() => this.runBankingSync(), FIFTEEN_MIN);
  }

  private async runBankingSync() {
    try {
      const accountIds = await this.banking.getAccountsDueForSync();
      if (accountIds.length === 0) return;

      this.logger.log(`Banking sync: ${accountIds.length} accounts due`);

      for (const id of accountIds) {
        const result = await this.banking.syncAccount(id);
        if (result.imported > 0) {
          this.logger.log(`Banking sync ${id}: imported=${result.imported}, skipped=${result.skipped}`);
        }
        // Fio API rate limit: wait 31s between requests
        if (accountIds.indexOf(id) < accountIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, FIO_RATE_LIMIT_MS));
        }
      }
    } catch (err) {
      this.logger.error('Banking sync FAILED', (err as Error).stack);
    }
  }

  // ─── WhatsApp Automation ─────────────────────────────────────

  private initWhatsAppAutomation() {
    this.logger.log('WhatsApp automation enabled — daily tasks at 7:00/8:00/9:00');
    // Check every hour; run at specific hours
    setInterval(() => this.runWhatsAppAutomation(), ONE_HOUR);
  }

  private async runWhatsAppAutomation() {
    const hour = new Date().getHours();
    try {
      if (hour === 7) await this.waAutomation.sendDailyDigest();
      if (hour === 8) await this.waAutomation.sendPaymentReminders();
      if (hour === 9 && new Date().getDay() === 1) await this.waAutomation.sendLeaseExpirationWarnings();
      if (hour === 10) await this.waAutomation.sendOverdueAlerts();
    } catch (err) {
      this.logger.error('WhatsApp automation FAILED', (err as Error).stack);
    }
  }

  // ─── AI Batch Polling ─────────────────────────────────────────

  private initBatchPolling() {
    this.logger.log('AI batch polling enabled — every hour');
    this.batchPollInterval = setInterval(() => this.runBatchPoll(), ONE_HOUR);
  }

  private async runBatchPoll() {
    try {
      await this.aiBatch.pollPendingBatches();
    } catch (err) {
      this.logger.error('AI batch polling FAILED', (err as Error).stack);
    }
  }

  // ─── Mio Conversation Retention ───────────────────────────────

  private initMioRetention() {
    this.logger.log('Mio retention cleanup enabled — daily');
    this.mioRetentionInterval = setInterval(() => this.runMioRetention(), TWENTY_FOUR_HOURS);
    setTimeout(() => this.runMioRetention(), 5 * 60 * 1000);
  }

  private async runMioRetention() {
    // Kill switch
    if (process.env.MIO_RETENTION_ENABLED === 'false') return;

    const raw = process.env.MIO_RETENTION_DAYS;
    let retentionDays = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) retentionDays = 90;
    else if (retentionDays > 365) retentionDays = 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
      // Batch delete: find expired conversation IDs first (bounded query)
      const expired = await this.prisma.mioConversation.findMany({
        where: { updatedAt: { lt: cutoff } },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (expired.length === 0) return;

      const ids = expired.map(c => c.id);

      // Delete messages first (FK), then conversations — in bounded batches
      const deletedMessages = await this.prisma.mioMessage.deleteMany({
        where: { conversationId: { in: ids } },
      });
      const deletedConversations = await this.prisma.mioConversation.deleteMany({
        where: { id: { in: ids } },
      });

      // Log only counts, never content
      this.logger.log(
        `Mio retention: deleted ${deletedConversations.count} conversations, ` +
        `${deletedMessages.count} messages older than ${retentionDays} days` +
        (expired.length >= BATCH_SIZE ? ' (batch limit reached, will continue next run)' : ''),
      );
    } catch (err) {
      this.logger.error('Mio retention cleanup FAILED', (err as Error).stack);
    }
  }

  // ─── PVK Sync (monthly, 1st at 6:00) ──────────────────────────

  private pvkSyncInterval: ReturnType<typeof setInterval> | null = null;
  private lastPvkSyncMonth = '';

  private initPvkSync() {
    this.logger.log('PVK sync enabled — monthly on 1st at 6:00');
    // Check every hour; run on 1st of month between 5:00-8:00
    this.pvkSyncInterval = setInterval(() => this.maybeRunPvkSync(), ONE_HOUR);
  }

  private async maybeRunPvkSync() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 7); // YYYY-MM
    if (now.getDate() !== 1 || now.getHours() < 5 || now.getHours() > 8) return;
    if (dateStr === this.lastPvkSyncMonth) return;

    this.lastPvkSyncMonth = dateStr;
    try {
      const tenants = await this.prisma.pvkCredential.findMany({
        select: { tenantId: true },
        distinct: ['tenantId'],
      });
      for (const { tenantId } of tenants) {
        try {
          await this.pvk.syncTenant(tenantId);
        } catch (err) {
          this.logger.error(`PVK sync failed for tenant ${tenantId}: ${(err as Error).message}`);
        }
      }
      this.logger.log(`PVK monthly sync: ${tenants.length} tenants processed`);
    } catch (err) {
      this.logger.error('PVK sync job FAILED', (err as Error).stack);
    }
  }

  // ── ČÚZK daily enrich (3:00 AM) ─────────────────────

  private cuzkEnrichInterval: ReturnType<typeof setInterval> | null = null;

  private initCuzkEnrich() {
    this.logger.log('ČÚZK daily enrich — every 24h at ~3:00');
    this.cuzkEnrichInterval = setInterval(() => this.maybeRunCuzkEnrich(), ONE_HOUR);
  }

  private async maybeRunCuzkEnrich() {
    const now = new Date();
    if (now.getHours() !== 3) return;
    try {
      await this.cuzkEnrich.runDailyEnrich();
    } catch (err) {
      this.logger.error('ČÚZK daily enrich FAILED', (err as Error).stack);
    }
  }

  // ── Dataor nightly import (2:00 AM) ──────────────────

  private dataorImportInterval: ReturnType<typeof setInterval> | null = null;
  private lastDataorDate = '';

  private initDataorImport() {
    this.logger.log('Dataor nightly import — every 24h at ~2:00');
    this.dataorImportInterval = setInterval(() => this.maybeRunDataorImport(), ONE_HOUR);
  }

  private async maybeRunDataorImport() {
    const now = new Date();
    if (now.getHours() !== 2) return;
    const dateStr = now.toISOString().slice(0, 10);
    if (dateStr === this.lastDataorDate) return;
    this.lastDataorDate = dateStr;

    try {
      const rok = now.getFullYear();
      // Only import SVJ + druzstvo — relevant for ifmio property management
      for (const forma of ['svj', 'druzstvo']) {
        const stats = await this.dataor.importAll(rok, 'actual', forma);
        this.logger.log(`Dataor import (${forma}) done: ${JSON.stringify(stats)}`);
      }
    } catch (err) {
      this.logger.error('Dataor nightly import FAILED', (err as Error).stack);
    }
  }

  // ── Scheduled Mass Mailing Campaigns (every 5 min) ────────────

  private initScheduledCampaigns() {
    this.logger.log('Scheduled campaigns enabled — checking every 5 minutes');
    this.scheduledCampaignInterval = setInterval(() => this.runScheduledCampaigns(), FIVE_MIN);
  }

  private async runScheduledCampaigns() {
    try {
      const sent = await this.massMailing.sendScheduledCampaigns();
      if (sent > 0) {
        this.logger.log(`Scheduled campaigns: ${sent} dispatched`);
      }
    } catch (err) {
      this.logger.error('Scheduled campaigns check FAILED', (err as Error).stack);
    }
  }

  // ── RÚIAN VFR monthly update (2nd of month at 3:00 AM) ─────

  private lastRuianVfrMonth = '';

  private initRuianVfrUpdate() {
    this.logger.log('RÚIAN VFR monthly update — checking daily at 3:00');
    this.ruianVfrInterval = setInterval(() => this.maybeRunRuianVfrUpdate(), ONE_HOUR);
  }

  private async maybeRunRuianVfrUpdate() {
    const now = new Date();
    // Run on 2nd of each month at 3:00 — VFR files are published last day of previous month
    if (now.getDate() !== 2 || now.getHours() !== 3) return;
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    if (monthKey === this.lastRuianVfrMonth) return;
    this.lastRuianVfrMonth = monthKey;

    try {
      this.logger.log('RÚIAN VFR monthly update started');
      const result = await this.ruianVfrImport.runFullImport();
      this.logger.log(`RÚIAN VFR monthly update: ${result.status}`);
    } catch (err) {
      this.logger.error('RÚIAN VFR monthly update FAILED', (err as Error).stack);
    }
  }
}

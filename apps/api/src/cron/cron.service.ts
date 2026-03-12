import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 1000;

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronService.name);
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private retentionInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.initKeepalive();
    this.initAuditRetention();
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

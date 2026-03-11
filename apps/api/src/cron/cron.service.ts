import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const SIX_HOURS = 6 * 60 * 60 * 1000;

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const dbUrl = this.config.get<string>('DATABASE_URL') ?? '';
    if (!dbUrl.toLowerCase().includes('supabase')) {
      this.logger.log('Non-Supabase DB detected — keepalive disabled');
      return;
    }

    this.logger.log('Supabase DB detected — starting keepalive (every 6h)');
    this.ping(); // initial ping
    this.intervalId = setInterval(() => this.ping(), SIX_HOURS);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('Keepalive interval cleared');
    }
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
}

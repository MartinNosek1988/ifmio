import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: ['error', 'warn'] });
  }

  async onModuleInit() {
    this.logger.log('Connecting to PostgreSQL...');
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB connect timeout (10s)')), 10_000),
        ),
      ]);
      this.logger.log('PostgreSQL connected');
    } catch (err) {
      this.logger.warn(
        'Eager connect failed, will lazy-connect on first query: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

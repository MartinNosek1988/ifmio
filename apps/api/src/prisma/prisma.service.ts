import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantId } from '../common/tenant-context';

// Models that do NOT have a tenantId field — skip auto-filtering
const NO_TENANT_MODELS = new Set([
  'Tenant', 'RefreshToken', 'EmailVerificationToken',
  'UserPropertyAssignment', 'Unit', 'PrescriptionItem',
  'LedgerEntry', 'HelpdeskItem', 'HelpdeskProtocol', 'ProtocolLine',
  'DocumentTag', 'DocumentLink', 'MioJobRunLog', 'MioWebhookDeliveryLog',
  'MioWebhookOutbox', 'WorkOrderComment', 'MeterReading',
  'AssetFieldCheckSignal', 'SettlementCost', 'SettlementItem', 'UserFeature',
]);

const SLOW_QUERY_THRESHOLD_MS = 200;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: ['error', 'warn'] });
  }

  /**
   * Priority 1 — Auto tenant isolation helper.
   * Call in services to get a tenantId-scoped query builder.
   * Usage: this.prisma.withTenant().property.findMany(...)
   * Falls back to unscoped if no tenant context (public endpoints).
   */
  withTenant() {
    const tenantId = getTenantId();
    if (!tenantId) return this; // no context — return unscoped

    return this.$extends({
      query: {
        $allOperations({ model, operation, args, query }: any) {
          if (!model || NO_TENANT_MODELS.has(model)) return query(args);

          const start = Date.now();

          // Inject tenantId into WHERE for reads
          if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy',
               'update', 'updateMany', 'deleteMany'].includes(operation)) {
            args.where = args.where ?? {};
            if (!args.where.tenantId) args.where.tenantId = tenantId;
          }

          // Auto-set tenantId on create
          if (operation === 'create') {
            args.data = args.data ?? {};
            if (!args.data.tenantId) args.data.tenantId = tenantId;
          }

          if (operation === 'createMany' && Array.isArray(args.data)) {
            args.data = args.data.map((d: any) => ({
              ...d,
              tenantId: d.tenantId ?? tenantId,
            }));
          }

          // Slow query logging
          return query(args).then((result: any) => {
            const duration = Date.now() - start;
            if (duration > SLOW_QUERY_THRESHOLD_MS) {
              Logger.warn(
                `Slow query: ${model}.${operation} took ${duration}ms`,
                'PrismaService',
              );
            }
            return result;
          });
        },
      },
    }) as unknown as PrismaService;
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

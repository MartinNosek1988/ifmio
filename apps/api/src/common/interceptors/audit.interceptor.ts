import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Whitelist of fields to store in oldData/newData per entity.
 * Unlisted entities fall back to storing the full response (newData only).
 * Sensitive fields (passwords, tokens, binary data) are never included.
 */
const AUDIT_FIELDS: Record<string, string[]> = {
  property: [
    'id', 'name', 'address', 'city', 'postalCode',
    'type', 'ownership', 'status',
  ],
  unit: [
    'id', 'propertyId', 'name', 'floor', 'area', 'isOccupied',
  ],
  resident: [
    'id', 'propertyId', 'unitId', 'firstName', 'lastName',
    'email', 'phone', 'role', 'isActive', 'hasDebt',
  ],
  invoice: [
    'id', 'propertyId', 'number', 'type', 'supplierName', 'supplierIco',
    'buyerName', 'buyerIco', 'description', 'amountBase', 'vatRate',
    'vatAmount', 'amountTotal', 'currency', 'issueDate', 'duzp',
    'dueDate', 'paymentDate', 'isPaid', 'paymentMethod', 'paidAmount',
    'variableSymbol', 'note',
  ],
  bankAccount: [
    'id', 'propertyId', 'name', 'accountNumber', 'iban',
    'bankCode', 'currency', 'isActive',
  ],
  HelpdeskTicket: [
    'id', 'propertyId', 'unitId', 'residentId', 'number',
    'title', 'description', 'category', 'priority', 'status',
    'assigneeId', 'resolvedAt',
  ],
  User: [
    'id', 'name', 'email', 'role', 'isActive',
  ],
  TenantSettings: [
    'id', 'tenantId', 'orgName', 'orgPhone', 'orgEmail',
    'companyNumber', 'vatNumber', 'address',
  ],
  Tenant: [
    'id', 'name', 'slug', 'plan', 'isActive',
    'maxUsers', 'maxProperties', 'trialEndsAt', 'notes',
  ],
  RevisionSubject: [
    'id', 'propertyId', 'name', 'category', 'description',
    'location', 'assetTag', 'manufacturer', 'model', 'serialNumber', 'isActive',
  ],
  RevisionType: [
    'id', 'code', 'name', 'description', 'defaultIntervalDays',
    'defaultReminderDaysBefore', 'color', 'isActive',
  ],
  RevisionPlan: [
    'id', 'propertyId', 'revisionSubjectId', 'revisionTypeId',
    'title', 'intervalDays', 'reminderDaysBefore', 'vendorName',
    'responsibleUserId', 'lastPerformedAt', 'nextDueAt', 'status', 'isMandatory',
  ],
  RevisionEvent: [
    'id', 'revisionPlanId', 'scheduledAt', 'performedAt', 'validUntil',
    'resultStatus', 'summary', 'vendorName', 'performedBy', 'protocolDocumentId',
  ],
};

/**
 * Maps audit entity names to Prisma model accessors.
 * Only entities listed here support oldData loading on update/delete.
 */
type PrismaModel = { findUnique: (args: { where: { id: string } }) => Promise<unknown> };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly entityLoaders: Record<string, PrismaModel>;

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {
    this.entityLoaders = {
      property: this.prisma.property as unknown as PrismaModel,
      unit: this.prisma.unit as unknown as PrismaModel,
      resident: this.prisma.resident as unknown as PrismaModel,
      invoice: this.prisma.invoice as unknown as PrismaModel,
      bankAccount: this.prisma.bankAccount as unknown as PrismaModel,
      HelpdeskTicket: this.prisma.helpdeskTicket as unknown as PrismaModel,
      User: this.prisma.user as unknown as PrismaModel,
      TenantSettings: this.prisma.tenantSettings as unknown as PrismaModel,
      Tenant: this.prisma.tenant as unknown as PrismaModel,
      RevisionSubject: this.prisma.revisionSubject as unknown as PrismaModel,
      RevisionType: this.prisma.revisionType as unknown as PrismaModel,
      RevisionPlan: this.prisma.revisionPlan as unknown as PrismaModel,
      RevisionEvent: this.prisma.revisionEvent as unknown as PrismaModel,
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const entity = this.reflector.get<string>('audit:entity', context.getHandler());
    const action = this.reflector.get<string>('audit:action', context.getHandler());
    const user = request.user;

    if (!entity || !action || !user) return next.handle();

    const entityId: string | null = request.params?.id ?? null;
    const isModify = ['PUT', 'PATCH', 'DELETE'].includes(method) && entityId;

    // Load old data before the handler executes (for update/delete)
    const oldDataPromise = isModify ? this.loadOldData(entity, entityId) : Promise.resolve(null);

    return new Observable((subscriber) => {
      oldDataPromise
        .then((oldData) => {
          next.handle().pipe(
            tap(async (result: Record<string, unknown> | null) => {
              try {
                const resultId = (result?.id as string) ?? entityId;
                await this.prisma.auditLog.create({
                  data: {
                    tenantId: user.tenantId,
                    userId: user.id,
                    action,
                    entity,
                    entityId: resultId,
                    oldData: oldData ?? undefined,
                    newData: this.sanitize(entity, result) ?? undefined,
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                  },
                });
              } catch (err) {
                this.logger.error('Audit log write failed', err);
              }
            }),
          ).subscribe(subscriber);
        })
        .catch((err) => {
          this.logger.error('Audit oldData load failed', err);
          // Continue without oldData
          next.handle().pipe(
            tap(async (result: Record<string, unknown> | null) => {
              try {
                const resultId = (result?.id as string) ?? entityId;
                await this.prisma.auditLog.create({
                  data: {
                    tenantId: user.tenantId,
                    userId: user.id,
                    action,
                    entity,
                    entityId: resultId,
                    newData: this.sanitize(entity, result) ?? undefined,
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                  },
                });
              } catch (writeErr) {
                this.logger.error('Audit log write failed', writeErr);
              }
            }),
          ).subscribe(subscriber);
        });
    });
  }

  /** Load and sanitize entity data before mutation */
  private async loadOldData(entity: string, entityId: string): Promise<object | null> {
    const loader = this.entityLoaders[entity];
    if (!loader) return null;

    const record = await loader.findUnique({ where: { id: entityId } });
    if (!record) return null;

    return this.sanitize(entity, record as Record<string, unknown>);
  }

  /** Filter record to whitelisted fields only */
  private sanitize(entity: string, data: Record<string, unknown> | null): object | null {
    if (!data) return null;

    const fields = AUDIT_FIELDS[entity];
    if (!fields) {
      // No whitelist defined — store full result but strip known sensitive patterns
      return this.stripSensitive(data);
    }

    const sanitized: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in data) {
        sanitized[field] = data[field];
      }
    }
    return sanitized;
  }

  /** Remove obviously sensitive fields from unwhitelisted entities */
  private stripSensitive(data: Record<string, unknown>): object {
    const SENSITIVE_PATTERNS = [
      'password', 'secret', 'token', 'hash',
      'base64', 'isdocXml', 'avatarBase64',
    ];
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_PATTERNS.some((p) => key.toLowerCase().includes(p.toLowerCase()))) {
        continue;
      }
      result[key] = value;
    }
    return result;
  }
}

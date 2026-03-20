import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, tap } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service'
import { AUDIT_READ_KEY } from '../decorators/audit-read.decorator'

/**
 * Logs READ access to sensitive data (personal info, finance).
 * Only activates on endpoints decorated with @AuditRead('entity').
 * Logs metadata only (who, what, when, where) — NOT the response data.
 */
@Injectable()
export class SensitiveReadInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SensitiveReadInterceptor.name)

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entity = this.reflector.get<string>(AUDIT_READ_KEY, context.getHandler())
    if (!entity) return next.handle()

    const request = context.switchToHttp().getRequest()
    const user = request.user
    if (!user) return next.handle()

    const entityId = request.params?.id ?? request.params?.principalId ?? null

    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'READ',
            entity,
            entityId,
            ipAddress: request.ip,
            userAgent: request.headers?.['user-agent'],
          },
        }).catch(err => {
          this.logger.error('Sensitive read audit failed', err)
        })
      }),
    )
  }
}

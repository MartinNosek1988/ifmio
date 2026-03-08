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

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

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

    return next.handle().pipe(
      tap(async (result: Record<string, unknown> | null) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              action,
              entity,
              entityId: (result?.id as string) ?? null,
              newData: (result as object) ?? null,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            },
          });
        } catch (err) {
          this.logger.error('Audit log write failed', err);
        }
      }),
    );
  }
}

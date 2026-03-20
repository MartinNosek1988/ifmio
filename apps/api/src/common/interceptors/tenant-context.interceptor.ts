import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tenantStore } from '../tenant-context'

/**
 * Sets tenant context from authenticated user into AsyncLocalStorage.
 * Runs AFTER JwtAuthGuard (which populates request.user).
 * PrismaService.$use() reads this to auto-inject tenantId into queries.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (user?.tenantId && user?.id) {
      return new Observable(subscriber => {
        tenantStore.run({ tenantId: user.tenantId, userId: user.id }, () => {
          next.handle().subscribe(subscriber)
        })
      })
    }

    return next.handle()
  }
}

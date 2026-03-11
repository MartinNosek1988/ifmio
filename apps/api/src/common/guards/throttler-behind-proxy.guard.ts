import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
        req.ip ??
        'unknown',
    );
  }

  getRequestResponse(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    return { req, res };
  }
}

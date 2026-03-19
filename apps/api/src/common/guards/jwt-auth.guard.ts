import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenBlacklistService } from '../../auth/token-blacklist.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private blacklist: TokenBlacklistService,
    private jwt: JwtService,
  ) {
    super();
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // Run passport JWT validation first
    const result = await super.canActivate(ctx);
    if (!result) return false;

    // Check token blacklist (ZT-W3-01)
    const request = ctx.switchToHttp().getRequest();
    const token = request.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = this.jwt.decode(token) as any;
        if (payload?.jti) {
          const revoked = await this.blacklist.isBlacklisted(payload.jti);
          if (revoked) throw new UnauthorizedException('Token byl zneplatněn');
        }
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        // decode failure — let passport handle it
      }
    }

    return true;
  }

  handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Neplatný nebo expirovaný token');
    }
    return user;
  }
}

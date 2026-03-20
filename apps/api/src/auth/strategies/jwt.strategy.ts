import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '@ifmio/shared-types';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Uživatel nenalezen nebo deaktivován',
      );
    }

    // Priority 2 — Verify JWT tenantId matches DB source of truth
    if (payload.tenantId !== user.tenantId) {
      this.logger.error(
        `SECURITY_ALERT: JWT tenantId mismatch — JWT: ${payload.tenantId}, DB: ${user.tenantId}, userId: ${user.id}`,
      );
      // Audit log the security event
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'SECURITY_ALERT',
          entity: 'User',
          entityId: user.id,
          newData: {
            type: 'JWT_TENANT_MISMATCH',
            jwtTenantId: payload.tenantId,
            dbTenantId: user.tenantId,
          },
        },
      }).catch(() => {}); // fire and forget
      throw new UnauthorizedException('Neplatný token — nesouhlas tenanta');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }
}

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { AuthUser } from '@ifmio/shared-types';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  async register(dto: RegisterDto, meta?: RequestMeta): Promise<AuthResponse> {
    const slug = dto.tenantName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const exists = await this.prisma.tenant.findUnique({ where: { slug } });
    if (exists)
      throw new ConflictException('Tenant s tímto názvem již existuje');

    const emailExists = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (emailExists)
      throw new ConflictException('Uživatel s tímto emailem již existuje');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Trial ends in 14 days
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const validPlan = ['free', 'starter', 'pro'].includes(dto.plan ?? '')
      ? dto.plan!
      : 'free';

    const { user, tenant } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug,
          plan: validPlan as any,
          trialEndsAt,
        },
      });

      // Create settings with org info
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          orgName: dto.tenantName,
          orgPhone: dto.phone ?? null,
          orgEmail: dto.email,
          companyNumber: dto.companyNumber ?? null,
          vatNumber: dto.vatNumber ?? null,
          address: dto.address ?? null,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'tenant_owner',
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'REGISTER',
          entity: 'User',
          entityId: user.id,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      });

      return { user, tenant };
    });

    // Create email verification token and send welcome email
    const verificationToken = await this.createEmailVerificationToken(user.id);
    const frontendUrl = process.env.FRONTEND_URL || `https://${process.env.DOMAIN || 'ifmio.com'}`;

    this.email.sendWelcome({
      to: dto.email,
      name: dto.name,
      tenantName: tenant.name,
      loginUrl: `${frontendUrl}/verify-email?token=${verificationToken}`,
    }).catch((err) => {
      this.logger.error(`Failed to send welcome email to ${dto.email}: ${err}`);
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto, meta?: RequestMeta): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      // Audit failed login — with or without known user
      this.prisma.auditLog.create({
        data: {
          tenantId: user?.tenantId ?? null,
          userId: user?.id ?? null,
          action: 'LOGIN_FAIL',
          entity: 'User',
          entityId: user?.id ?? null,
          newData: { email: this.maskEmail(dto.email) },
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      }).catch((err) => this.logger.error('Audit LOGIN_FAIL failed', err));
      throw new UnauthorizedException('Nesprávný email nebo heslo');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      }),
    ]);

    return this.issueTokens(user);
  }

  async logout(userId: string, meta?: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.prisma.$transaction([
        this.prisma.refreshToken.deleteMany({ where: { userId } }),
        this.prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId,
            action: 'LOGOUT',
            entity: 'User',
            entityId: userId,
            ipAddress: meta?.ip,
            userAgent: meta?.userAgent,
          },
        }),
      ]);
    }
  }

  async me(user: AuthUser) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, name: true, role: true, tenantId: true,
        phone: true, position: true, avatarBase64: true,
        language: true, timezone: true, dateFormat: true, notifEmail: true,
        createdAt: true, lastLoginAt: true,
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true, name: true, slug: true, plan: true,
        trialEndsAt: true, isActive: true,
      },
    });

    return { ...full, tenant };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.avatarBase64 !== undefined) data.avatarBase64 = dto.avatarBase64;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.dateFormat !== undefined) data.dateFormat = dto.dateFormat;
    if (dto.notifEmail !== undefined) data.notifEmail = dto.notifEmail;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, name: true, role: true, tenantId: true,
        phone: true, position: true, avatarBase64: true,
        language: true, timezone: true, dateFormat: true, notifEmail: true,
        createdAt: true, lastLoginAt: true,
      },
    });

    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, meta?: RequestMeta) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Uživatel nenalezen');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Nesprávné aktuální heslo');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId,
          action: 'PASSWORD_CHANGE',
          entity: 'User',
          entityId: userId,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      }),
    ]);

    return { success: true, message: 'Heslo bylo změněno' };
  }

  async refresh(refreshTokenValue: string, meta?: RequestMeta): Promise<AuthResponse> {
    const stored = await this.prisma.refreshToken.findFirst({
      where: { token: refreshTokenValue },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token je neplatný nebo expiroval');
    }

    // Verify JWT signature
    try {
      this.jwt.verify(refreshTokenValue, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      });
    } catch {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token je neplatný');
    }

    const user = stored.user;
    if (!user.isActive) throw new UnauthorizedException('Účet je deaktivován');

    // Rotate: delete old refresh token, issue new pair
    await this.prisma.$transaction([
      this.prisma.refreshToken.delete({ where: { id: stored.id } }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'TOKEN_REFRESH',
          entity: 'User',
          entityId: user.id,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      }),
    ]);

    return this.issueTokens(user);
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) await this.prisma.emailVerificationToken.delete({ where: { id: record.id } });
      throw new NotFoundException('Neplatný nebo expirovaný verifikační token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { isActive: true },
      }),
      this.prisma.emailVerificationToken.delete({ where: { id: record.id } }),
      this.prisma.auditLog.create({
        data: {
          tenantId: record.user.tenantId,
          userId: record.userId,
          action: 'EMAIL_VERIFY',
          entity: 'User',
          entityId: record.userId,
        },
      }),
    ]);

    return { success: true, message: 'Email úspěšně ověřen' };
  }

  async createEmailVerificationToken(userId: string): Promise<string> {
    // Delete any existing tokens for this user
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  }): Promise<AuthResponse> {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '60m') as string & { __brand: 'StringValue' },
    } as Record<string, unknown>);
    const refreshToken = this.jwt.sign(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as string & { __brand: 'StringValue' },
    } as Record<string, unknown>);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.refreshToken.create({
        data: { userId: user.id, token: refreshToken, expiresAt },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as AuthUser['role'],
        tenantId: user.tenantId,
      },
    };
  }

  /** Mask email for audit: "jan@firma.cz" → "j**@f***a.cz" */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal = local[0] + '**';
    const parts = domain.split('.');
    const maskedDomain = parts[0][0] + '***' + (parts[0].length > 1 ? parts[0].slice(-1) : '');
    return `${maskedLocal}@${maskedDomain}.${parts.slice(1).join('.')}`;
  }
}

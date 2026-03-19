import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { validatePassword } from './password-policy';
import type { AuthUser } from '@ifmio/shared-types';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  passwordExpired?: boolean;
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

    const pwCheck = validatePassword(dto.password);
    if (!pwCheck.valid) throw new BadRequestException(pwCheck.errors.join(' '));

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
          passwordChangedAt: new Date(),
          passwordHistory: [passwordHash],
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
    if (!user || !user.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
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

    const tokens = await this.issueTokens(user);

    // Check password expiry
    const expired = this.checkPasswordExpiry(user);
    if (expired) {
      return { ...tokens, passwordExpired: true };
    }

    return tokens;
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
        partyId: true,
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

    if (!user.passwordHash) throw new UnauthorizedException('Účet nemá nastavené heslo');
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Nesprávné aktuální heslo');

    const pwCheck = validatePassword(dto.newPassword);
    if (!pwCheck.valid) throw new BadRequestException(pwCheck.errors.join(' '));

    // Check password history (last 5)
    const history = (user.passwordHistory as string[]) ?? [];
    for (const oldHash of history) {
      if (await bcrypt.compare(dto.newPassword, oldHash)) {
        throw new BadRequestException('Toto heslo jste již použili. Zvolte jiné.');
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const updatedHistory = [passwordHash, ...history].slice(0, 5);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordHistory: updatedHistory,
          passwordChangedAt: new Date(),
          forcePasswordChange: false,
        },
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
  // ─── Password Reset ──────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { email, isActive: true } })
    if (!user) return // Security: never reveal if email exists

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 1)

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    })

    const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173'
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`

    try {
      await this.email.send({
        to: email,
        subject: 'Obnova hesla — ifmio',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#6366f1;">Obnova hesla</h2>
            <p>Obdrželi jsme žádost o obnovu hesla pro váš účet v ifmio.</p>
            <p>Klikněte na tlačítko níže pro nastavení nového hesla:</p>
            <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
              Nastavit nové heslo
            </a>
            <p style="color:#6b7280;font-size:0.85rem;">Odkaz je platný 1 hodinu. Pokud jste o obnovu nežádali, tento email ignorujte.</p>
          </div>`,
      })
    } catch (err) {
      this.logger.error(`Failed to send password reset email: ${err}`)
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) throw new BadRequestException(pwCheck.errors.join(' '));

    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    })
    if (!user) throw new UnauthorizedException('Neplatný nebo expirovaný token')
    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      throw new UnauthorizedException('Token expiroval — vyžádejte nový')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    const history = (user.passwordHistory as string[] ?? [])
    const updatedHistory = [passwordHash, ...history].slice(0, 5)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        passwordChangedAt: new Date(),
        passwordHistory: updatedHistory,
        forcePasswordChange: false,
      },
    })

    this.logger.log(`Password reset completed for user ${user.id}`)
  }

  // ─── Invitation Acceptance ──────────────────────────────────

  async getInvitationInfo(token: string) {
    const inv = await this.prisma.tenantInvitation.findUnique({
      where: { token },
      include: { tenant: { select: { name: true } } },
    })
    if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
      throw new BadRequestException('Neplatná nebo expirovaná pozvánka')
    }
    return { name: inv.name, email: inv.email, tenantName: inv.tenant.name, role: inv.role, expiresAt: inv.expiresAt }
  }

  async acceptInvitation(token: string, password: string, name?: string) {
    const inv = await this.prisma.tenantInvitation.findUnique({ where: { token }, include: { tenant: true } })
    if (!inv) throw new BadRequestException('Neplatná pozvánka')
    if (inv.acceptedAt) throw new BadRequestException('Pozvánka již byla použita')
    if (inv.expiresAt < new Date()) throw new BadRequestException('Platnost pozvánky vypršela')

    const existing = await this.prisma.user.findFirst({ where: { tenantId: inv.tenantId, email: inv.email } })
    if (existing) throw new ConflictException('Uživatel s tímto e-mailem již existuje')

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) throw new BadRequestException(pwCheck.errors.join(' '));

    const passwordHash = await bcrypt.hash(password, 12)

    // Try to find a matching Party by email to link user
    const matchingParty = await this.prisma.party.findFirst({
      where: { tenantId: inv.tenantId, email: inv.email, isActive: true },
    })

    await this.prisma.user.create({
      data: {
        tenantId: inv.tenantId,
        email: inv.email,
        name: name ?? inv.name,
        passwordHash,
        role: inv.role,
        isActive: true,
        partyId: matchingParty?.id ?? undefined,
        passwordChangedAt: new Date(),
        passwordHistory: [passwordHash],
      },
    })

    await this.prisma.tenantInvitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    })

    this.logger.log(`Invitation accepted: ${inv.email} joined tenant ${inv.tenantId}`)
    return { success: true }
  }

  private checkPasswordExpiry(user: { passwordExpiresAt?: Date | null; forcePasswordChange?: boolean }): boolean {
    if (user.forcePasswordChange) return true;
    if (user.passwordExpiresAt && user.passwordExpiresAt < new Date()) return true;
    return false;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal = local[0] + '**';
    const parts = domain.split('.');
    const maskedDomain = parts[0][0] + '***' + (parts[0].length > 1 ? parts[0].slice(-1) : '');
    return `${maskedLocal}@${maskedDomain}.${parts.slice(1).join('.')}`;
  }
}

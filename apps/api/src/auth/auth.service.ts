import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const slug = dto.tenantName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const exists = await this.prisma.tenant.findUnique({ where: { slug } });
    if (exists)
      throw new ConflictException('Tenant s tímto názvem již existuje');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenantName, slug, plan: 'free' },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'owner',
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'REGISTER',
          entity: 'User',
          entityId: user.id,
        },
      });
      return { user, tenant };
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
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
        },
      }),
    ]);

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
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
          },
        }),
      ]);
    }
  }

  async me(user: AuthUser): Promise<AuthUser> {
    return user;
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
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as string & { __brand: 'StringValue' },
    } as Record<string, unknown>);
    const refreshToken = this.jwt.sign(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as string & { __brand: 'StringValue' },
    } as Record<string, unknown>);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}

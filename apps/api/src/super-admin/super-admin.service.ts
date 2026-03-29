import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperAdminService {
  private allowedEmails: Set<string>;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {
    const raw = this.config.get<string>('SUPER_ADMIN_EMAILS') || '';
    this.allowedEmails = new Set(
      raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    );
  }

  isSuperAdmin(email: string): boolean {
    return this.allowedEmails.has(email.toLowerCase());
  }

  assertSuperAdmin(email: string) {
    if (!this.isSuperAdmin(email)) {
      throw new ForbiddenException('Super-admin access required');
    }
  }

  /* ─── Stats ─────────────────────────────────────────────────────── */

  async getStats() {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86_400_000);
    const d30 = new Date(now.getTime() - 30 * 86_400_000);

    const [
      tenants, activeTenants, trialTenants, users, properties,
      reg7, reg30, planDist,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.tenant.count({ where: { trialEndsAt: { not: null, gte: now } } }),
      this.prisma.user.count(),
      this.prisma.property.count(),
      this.prisma.tenant.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.tenant.groupBy({ by: ['plan'], _count: true }),
    ]);

    const paidTenants = planDist
      .filter((p) => p.plan !== 'free')
      .reduce((s, p) => s + p._count, 0);

    return {
      tenants, activeTenants, trialTenants, paidTenants,
      users, properties,
      reg7, reg30,
      planDistribution: planDist.map((p) => ({ plan: p.plan, count: p._count })),
    };
  }

  /* ─── Tenants ───────────────────────────────────────────────────── */

  async listTenants(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? { OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
        ] }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, properties: true } },
          users: {
            where: { role: 'tenant_owner' },
            take: 1,
            select: { email: true, name: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, properties: true, residents: true, workOrders: true } },
        users: {
          select: {
            id: true, email: true, name: true, role: true,
            isActive: true, lastLoginAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        settings: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant nenalezen');
    return tenant;
  }

  async updateTenant(id: string, data: {
    plan?: string;
    isActive?: boolean;
    maxUsers?: number;
    maxProperties?: number;
    trialEndsAt?: string | null;
    notes?: string | null;
  }) {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.plan ? { plan: data.plan as any } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.maxUsers !== undefined ? { maxUsers: data.maxUsers } : {}),
        ...(data.maxProperties !== undefined ? { maxProperties: data.maxProperties } : {}),
        ...(data.trialEndsAt !== undefined
          ? { trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  /* ─── Impersonation ─────────────────────────────────────────────── */

  async impersonate(tenantId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, role: 'tenant_owner', isActive: true },
    });
    if (!owner) throw new NotFoundException('Tenant nemá aktivního ownera');

    const payload = { sub: owner.id, tenantId: owner.tenantId, role: owner.role };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    } as Record<string, unknown>);

    return { accessToken, user: { id: owner.id, email: owner.email, name: owner.name, role: owner.role, tenantId } };
  }

  /* ─── Users across tenants ──────────────────────────────────────── */

  async listAllUsers(page = 1, limit = 50, search?: string, role?: string) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true,
          isActive: true, lastLoginAt: true, createdAt: true,
          tenant: { select: { id: true, name: true, plan: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
  }

  /* ─── Audit log (cross-tenant) ──────────────────────────────────── */

  async getAuditLog(page = 1, limit = 50, tenantId?: string) {
    const skip = (page - 1) * limit;
    const where = tenantId ? { tenantId } : {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          tenant: { select: { name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
  }
}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperAdminService {
  private allowedEmails: Set<string>;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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

  async listTenants(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true, properties: true, residents: true },
          },
        },
      }),
      this.prisma.tenant.count(),
    ]);

    return { data, total, page, limit };
  }

  async getTenant(id: string) {
    return this.prisma.tenant.findUniqueOrThrow({
      where: { id },
      include: {
        _count: {
          select: { users: true, properties: true, residents: true },
        },
        users: { select: { id: true, email: true, name: true, role: true, isActive: true } },
      },
    });
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

  async getStats() {
    const [tenants, users, properties, residents] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.property.count(),
      this.prisma.resident.count(),
    ]);

    const activeTenants = await this.prisma.tenant.count({ where: { isActive: true } });

    const planDistribution = await this.prisma.tenant.groupBy({
      by: ['plan'],
      _count: true,
    });

    return {
      tenants,
      activeTenants,
      users,
      properties,
      residents,
      planDistribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count,
      })),
    };
  }
}

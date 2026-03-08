import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt       from 'bcrypt'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── TENANT SETTINGS ──────────────────────────────────────────

  async getSettings(user: AuthUser) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where:   { tenantId: user.tenantId },
      include: { tenant: { select: { id: true, name: true, slug: true, plan: true } } },
    })

    if (!settings) {
      return this.prisma.tenantSettings.create({
        data: { tenantId: user.tenantId },
        include: { tenant: { select: { id: true, name: true, slug: true, plan: true } } },
      })
    }
    return settings
  }

  async updateSettings(user: AuthUser, dto: any) {
    await this.getSettings(user)

    return this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data:  dto,
    })
  }

  // ─── USERS ────────────────────────────────────────────────────

  async listUsers(user: AuthUser) {
    return this.prisma.user.findMany({
      where:   { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
      select: {
        id:         true,
        name:       true,
        email:      true,
        role:       true,
        isActive:   true,
        lastLoginAt: true,
        createdAt:  true,
      },
    })
  }

  async inviteUser(user: AuthUser, dto: {
    name:     string
    email:    string
    role:     string
    password: string
  }) {
    if (!['owner', 'admin'].includes(user.role)) {
      throw new ForbiddenException('Nemáte oprávnění pro tuto akci')
    }

    const exists = await this.prisma.user.findFirst({
      where: { tenantId: user.tenantId, email: dto.email },
    })
    if (exists) throw new ConflictException('Uživatel s tímto emailem již existuje')

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const created = await this.prisma.user.create({
      data: {
        tenantId: user.tenantId,
        name:     dto.name,
        email:    dto.email,
        role:     dto.role as any,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true, name: true, email: true,
        role: true, isActive: true, createdAt: true,
      },
    })

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId:   user.id,
        action:   'INVITE_USER',
        entity:   'User',
        entityId: created.id,
        newData:  { email: dto.email, role: dto.role },
      },
    })

    return created
  }

  async updateUserRole(user: AuthUser, targetUserId: string, role: string) {
    if (!['owner', 'admin'].includes(user.role)) {
      throw new ForbiddenException('Nemáte oprávnění pro tuto akci')
    }
    if (targetUserId === user.id) {
      throw new ForbiddenException('Nemůžete změnit svou vlastní roli')
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId: user.tenantId },
    })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    return this.prisma.user.update({
      where: { id: targetUserId },
      data:  { role: role as any },
      select: { id: true, name: true, email: true, role: true },
    })
  }

  async deactivateUser(user: AuthUser, targetUserId: string) {
    if (!['owner', 'admin'].includes(user.role)) {
      throw new ForbiddenException('Nemáte oprávnění pro tuto akci')
    }
    if (targetUserId === user.id) {
      throw new ForbiddenException('Nemůžete deaktivovat sebe')
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId: user.tenantId },
    })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    return this.prisma.user.update({
      where: { id: targetUserId },
      data:  { isActive: false },
      select: { id: true, name: true, isActive: true },
    })
  }

  // ─── ONBOARDING ──────────────────────────────────────────────

  async getOnboardingStatus(user: AuthUser) {
    const [propertiesCount, usersCount] = await Promise.all([
      this.prisma.property.count({
        where: { tenantId: user.tenantId, status: 'active' },
      }),
      this.prisma.user.count({
        where: { tenantId: user.tenantId, isActive: true },
      }),
    ])

    return {
      completed: propertiesCount > 0,
      hasProperties: propertiesCount > 0,
      propertiesCount,
      hasMultipleUsers: usersCount > 1,
      usersCount,
      steps: [
        {
          id: 'property',
          label: 'Pridejte prvni nemovitost',
          completed: propertiesCount > 0,
        },
        {
          id: 'unit',
          label: 'Pridejte jednotku',
          completed: propertiesCount > 0,
        },
        {
          id: 'invite',
          label: 'Pozvete dalsiho uzivatele (volitelne)',
          completed: usersCount > 1,
          optional: true,
        },
      ],
    }
  }

  // ─── TENANT INFO ──────────────────────────────────────────────

  async getTenantInfo(user: AuthUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where:   { id: user.tenantId },
      include: {
        settings: true,
        _count: {
          select: {
            users:      true,
            properties: true,
            residents:  true,
          },
        },
      },
    })
    if (!tenant) throw new NotFoundException('Tenant nenalezen')
    return tenant
  }
}

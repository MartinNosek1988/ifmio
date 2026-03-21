import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService }  from '../email/email.service'
import * as bcrypt       from 'bcryptjs'
import * as crypto       from 'crypto'
import type { AuthUser } from '@ifmio/shared-types'
import type { UserRole } from '@prisma/client'
import { OffboardingService } from './offboarding.service'

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private prisma: PrismaService,
    private email:  EmailService,
    private config: ConfigService,
    private offboarding: OffboardingService,
  ) {}

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

  async updateSettings(user: AuthUser, dto: object) {
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
    if (!['tenant_owner', 'tenant_admin'].includes(user.role)) {
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

    // Audit is handled by @AuditAction('User', 'INVITE') on the controller

    // Send welcome email
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    })
    await this.email.sendWelcome({
      to:         dto.email,
      name:       dto.name,
      tenantName: tenant?.name ?? 'ifmio',
      loginUrl:   `${process.env.FRONTEND_URL || `https://${process.env.DOMAIN || 'ifmio.com'}`}/login`,
    })

    return created
  }

  async updateUser(user: AuthUser, targetUserId: string, dto: {
    name?:     string
    role?:     string
    isActive?: boolean
  }) {
    if (!['tenant_owner', 'tenant_admin'].includes(user.role)) {
      throw new ForbiddenException('Nemáte oprávnění pro tuto akci')
    }
    if (targetUserId === user.id && dto.role !== undefined) {
      throw new ForbiddenException('Nemůžete změnit svou vlastní roli')
    }
    if (targetUserId === user.id && dto.isActive === false) {
      throw new ForbiddenException('Nemůžete deaktivovat sebe')
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId: user.tenantId },
    })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    const data: any = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.role !== undefined) data.role = dto.role
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    return this.prisma.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true, name: true, email: true,
        role: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
    })
  }

  async updateUserRole(user: AuthUser, targetUserId: string, role: string) {
    if (!['tenant_owner', 'tenant_admin'].includes(user.role)) {
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
    if (!['tenant_owner', 'tenant_admin'].includes(user.role)) {
      throw new ForbiddenException('Nemáte oprávnění pro tuto akci')
    }
    // Full offboarding: deactivate + revoke tokens + revoke API keys + alert
    return this.offboarding.deactivateUser(user.tenantId, targetUserId, user.id)
  }

  // ─── EXPORT ─────────────────────────────────────────────────

  async exportData(user: AuthUser) {
    const tenantId = user.tenantId
    const [
      tenant, settings, properties, residents, users,
      leaseAgreements, workOrders, meters, financeTransactions,
      calendarEvents, documents,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.tenantSettings.findUnique({ where: { tenantId } }),
      this.prisma.property.findMany({ where: { tenantId } }),
      this.prisma.resident.findMany({ where: { tenantId } }),
      this.prisma.user.findMany({ where: { tenantId }, select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      }}),
      this.prisma.leaseAgreement.findMany({ where: { tenantId } }),
      this.prisma.workOrder.findMany({ where: { tenantId } }),
      this.prisma.meter.findMany({ where: { tenantId } }),
      this.prisma.financeTransaction.findMany({ where: { tenantId } }),
      this.prisma.calendarEvent.findMany({ where: { tenantId } }),
      this.prisma.document.findMany({ where: { tenantId } }),
    ])

    return {
      exportedAt: new Date().toISOString(),
      tenant,
      settings,
      properties,
      residents,
      users,
      leaseAgreements,
      workOrders,
      meters,
      financeTransactions,
      calendarEvents,
      documents,
    }
  }

  // ─── ONBOARDING ──────────────────────────────────────────────

  async getOnboardingStatus(user: AuthUser) {
    const tenantId = user.tenantId

    // Fetch settings first for skipped steps
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { onboardingDismissed: true, onboardingSkippedSteps: true },
    }).catch(() => null)

    const dismissed = settings?.onboardingDismissed === true
    const skippedSteps: string[] = Array.isArray(settings?.onboardingSkippedSteps)
      ? (settings.onboardingSkippedSteps as string[])
      : []

    const [
      propertiesCount, unitsCount, residentsCount, componentsCount,
      bankAccountsCount, prescriptionsCount, bankTransactionsCount,
      usersCount, ownerAccountsWithBalance, totalOwnerAccounts,
      firstProperty, firstBankAccount,
      residentsWithEmail, ownersCount,
    ] = await Promise.all([
      this.prisma.property.count({ where: { tenantId, status: 'active' } }),
      this.prisma.unit.count({ where: { property: { tenantId } } }),
      this.prisma.resident.count({ where: { tenantId, isActive: true } }),
      this.prisma.prescriptionComponent.count({ where: { tenantId, isActive: true } }),
      this.prisma.bankAccount.count({ where: { tenantId, isActive: true } }),
      this.prisma.prescription.count({ where: { tenantId, status: 'active' } }),
      this.prisma.bankTransaction.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.ownerAccount.count({ where: { tenantId, openingBalanceSet: true } }),
      this.prisma.ownerAccount.count({ where: { tenantId } }),
      this.prisma.property.findFirst({
        where: { tenantId, status: 'active' },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.bankAccount.findFirst({
        where: { tenantId, isActive: true },
        select: { accountNumber: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.resident.count({ where: { tenantId, isActive: true, email: { not: null } } }),
      this.prisma.resident.count({ where: { tenantId, isActive: true, role: 'owner' } }),
    ])

    const steps = [
      {
        id: 'property',
        label: 'Založení nemovitosti',
        description: 'Přidejte bytový dům, budovu nebo objekt, který spravujete.',
        completed: propertiesCount > 0,
        skipped: skippedSteps.includes('property'),
        link: '/properties',
        count: propertiesCount,
        detail: firstProperty
          ? { propertyName: firstProperty.name, propertyId: firstProperty.id, unitCount: unitsCount }
          : null,
      },
      {
        id: 'units',
        label: 'Jednotky a vlastníci',
        description: 'Vytvořte jednotky (byty, nebytové prostory) a přiřaďte vlastníky.',
        completed: unitsCount > 0 && ownersCount > 0,
        skipped: skippedSteps.includes('units'),
        link: firstProperty ? `/properties/${firstProperty.id}` : null,
        count: unitsCount,
        dependsOn: 'property',
        detail: { unitCount: unitsCount, ownerCount: ownersCount },
      },
      {
        id: 'contacts',
        label: 'Kontaktní údaje osob',
        description: 'Doplňte emailové adresy a telefony vlastníků pro komunikaci a portál.',
        completed: residentsWithEmail > 0,
        skipped: skippedSteps.includes('contacts'),
        link: '/residents',
        count: residentsWithEmail,
        dependsOn: 'units',
        optional: true,
        detail: { withEmail: residentsWithEmail, total: residentsCount },
      },
      {
        id: 'components',
        label: 'Složky předpisu',
        description: 'Složky předpisu definují co a kolik se platí. Typické: fond oprav, správa, vodné, teplo.',
        completed: componentsCount > 0,
        skipped: skippedSteps.includes('components'),
        link: '/finance?tab=components',
        count: componentsCount,
        dependsOn: 'property',
        detail: { componentCount: componentsCount },
      },
      {
        id: 'bank',
        label: 'Bankovní účet',
        description: 'Pro automatický import plateb doporučujeme připojit Fio API.',
        completed: bankAccountsCount > 0,
        skipped: skippedSteps.includes('bank'),
        link: '/finance?tab=bank',
        count: bankAccountsCount,
        optional: true,
        dependsOn: 'property',
        detail: { accountNumber: firstBankAccount?.accountNumber ?? null },
      },
      {
        id: 'balances',
        label: 'Počáteční stavy kont',
        description: 'Zadejte zůstatky kont vlastníků k datu přechodu. Kdo kolik dluží nebo má přeplatek.',
        completed: ownerAccountsWithBalance > 0,
        skipped: skippedSteps.includes('balances'),
        link: '/finance?tab=konto',
        count: ownerAccountsWithBalance,
        optional: true,
        dependsOn: 'units',
        detail: { setCount: ownerAccountsWithBalance, totalAccounts: totalOwnerAccounts },
      },
      {
        id: 'prescriptions',
        label: 'Vygenerovat předpisy',
        description: 'Předpisy se generují ze složek předpisu. Zkontrolujte náhled a potvrďte.',
        completed: prescriptionsCount > 0,
        skipped: skippedSteps.includes('prescriptions'),
        link: '/finance?tab=prescriptions',
        count: prescriptionsCount,
        dependsOn: 'components',
        detail: { prescriptionCount: prescriptionsCount },
      },
      {
        id: 'import',
        label: 'Import bankovních výpisů',
        description: 'Importujte bankovní výpisy za poslední 3–6 měsíců a spárujte je s předpisy.',
        completed: bankTransactionsCount > 0,
        skipped: skippedSteps.includes('import'),
        link: '/finance?tab=bank',
        count: bankTransactionsCount,
        optional: true,
        dependsOn: 'bank',
        detail: { transactionCount: bankTransactionsCount },
      },
    ]

    const isStepDone = (s: typeof steps[number]) => s.completed || s.skipped
    const requiredSteps = steps.filter(s => !s.optional)
    const allRequiredDone = requiredSteps.every(isStepDone)
    const completedCount = steps.filter(isStepDone).length

    return {
      completed: allRequiredDone || dismissed,
      dismissed,
      progress: { done: completedCount, total: steps.length },
      percentComplete: Math.round((completedCount / steps.length) * 100),
      propertiesCount,
      hasMultipleUsers: usersCount > 1,
      usersCount,
      steps,
    }
  }

  async skipOnboardingStep(user: AuthUser, stepId: string) {
    const validSteps = ['property', 'units', 'contacts', 'components', 'bank', 'balances', 'prescriptions', 'import']
    if (!validSteps.includes(stepId)) {
      throw new NotFoundException(`Neznámý krok: ${stepId}`)
    }

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { onboardingSkippedSteps: true },
    })

    const current: string[] = Array.isArray(settings?.onboardingSkippedSteps)
      ? (settings.onboardingSkippedSteps as string[])
      : []

    if (!current.includes(stepId)) {
      current.push(stepId)
    }

    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: { onboardingSkippedSteps: current },
      create: { tenantId: user.tenantId, onboardingSkippedSteps: current },
    })

    return { ok: true, skippedSteps: current }
  }

  async dismissOnboarding(user: AuthUser) {
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: { onboardingDismissed: true },
      create: { tenantId: user.tenantId, onboardingDismissed: true },
    })
    return { ok: true }
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

  // ─── PROPERTY ASSIGNMENTS ──────────────────────────────────

  async listUserPropertyAssignments(user: AuthUser, targetUserId: string) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId: user.tenantId },
    })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    return this.prisma.userPropertyAssignment.findMany({
      where: { userId: targetUserId },
      include: {
        property: {
          select: { id: true, name: true, address: true, city: true, status: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })
  }

  async listPropertyUserAssignments(user: AuthUser, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: user.tenantId },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    return this.prisma.userPropertyAssignment.findMany({
      where: { propertyId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, isActive: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })
  }

  async createPropertyAssignment(user: AuthUser, targetUserId: string, propertyId: string) {
    // Verify target user belongs to same tenant
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId: user.tenantId },
    })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    // Verify property belongs to same tenant
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: user.tenantId },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    // Check not already assigned
    const existing = await this.prisma.userPropertyAssignment.findUnique({
      where: { userId_propertyId: { userId: targetUserId, propertyId } },
    })
    if (existing) throw new ConflictException('Uživatel je k nemovitosti již přiřazen')

    return this.prisma.userPropertyAssignment.create({
      data: {
        userId: targetUserId,
        propertyId,
        assignedBy: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        property: { select: { id: true, name: true, address: true } },
      },
    })
  }

  async deletePropertyAssignment(user: AuthUser, targetUserId: string, propertyId: string) {
    // Verify target user belongs to same tenant
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId: user.tenantId },
    })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    const assignment = await this.prisma.userPropertyAssignment.findUnique({
      where: { userId_propertyId: { userId: targetUserId, propertyId } },
    })
    if (!assignment) throw new NotFoundException('Přiřazení nenalezeno')

    await this.prisma.userPropertyAssignment.delete({
      where: { id: assignment.id },
    })
  }

  // ─── Invitation System ──────────────────────────────────────

  async sendInvitation(tenantId: string, invitedById: string, dto: {
    email: string; name: string; role: string; propertyId?: string; unitId?: string
  }) {
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: dto.email } })
    if (existing) throw new ConflictException('Uživatel s tímto e-mailem již existuje')

    const pending = await this.prisma.tenantInvitation.findFirst({
      where: { tenantId, email: dto.email, acceptedAt: null, expiresAt: { gt: new Date() } },
    })
    if (pending) throw new ConflictException('Pozvánka pro tento e-mail již čeká na přijetí')

    const token = crypto.randomBytes(32).toString('hex')
    const invitation = await this.prisma.tenantInvitation.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        role: dto.role as UserRole,
        token,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedById,
      },
      include: { tenant: { select: { name: true } } },
    })

    const frontendUrl = this.config.get('FRONTEND_URL') || this.config.get('CORS_ORIGIN') || 'http://localhost:5173'
    const link = `${frontendUrl}/accept-invitation?token=${token}`

    try {
      await this.email.send({
        to: dto.email,
        subject: `Pozvánka do ${invitation.tenant.name} — ifmio`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:20px">ifmio</h1></div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px">
            <h2>Byli jste pozváni do ${invitation.tenant.name}</h2>
            <p>Dobrý den, ${dto.name},</p>
            <p>správce nemovitosti vás zve do klientského portálu ifmio.</p>
            <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">Přijmout pozvánku a nastavit heslo</a>
            <p style="color:#6b7280;font-size:12px">Odkaz je platný 7 dní. ${link}</p>
          </div>
        </div>`,
      })
    } catch (err) {
      this.logger.error(`Failed to send invitation email to ${dto.email}: ${err}`)
    }

    return invitation
  }

  async listInvitations(tenantId: string) {
    return this.prisma.tenantInvitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { name: true } }, property: { select: { name: true } }, unit: { select: { name: true } } },
    })
  }

  async resendInvitation(tenantId: string, id: string) {
    const inv = await this.prisma.tenantInvitation.findFirst({ where: { id, tenantId, acceptedAt: null } })
    if (!inv) throw new NotFoundException('Pozvánka nenalezena')

    const token = crypto.randomBytes(32).toString('hex')
    const updated = await this.prisma.tenantInvitation.update({
      where: { id },
      data: { token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      include: { tenant: { select: { name: true } } },
    })

    const frontendUrl = this.config.get('FRONTEND_URL') || this.config.get('CORS_ORIGIN') || 'http://localhost:5173'
    const link = `${frontendUrl}/accept-invitation?token=${token}`

    try {
      await this.email.send({
        to: inv.email,
        subject: `Pozvánka do ${updated.tenant.name} — ifmio (opakované odeslání)`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:20px">ifmio</h1></div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px">
            <h2>Pozvánka do ${updated.tenant.name}</h2>
            <p>Dobrý den, ${inv.name},</p>
            <p>připomínáme vám pozvánku do klientského portálu ifmio.</p>
            <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">Přijmout pozvánku</a>
            <p style="color:#6b7280;font-size:12px">Odkaz je platný 7 dní. ${link}</p>
          </div>
        </div>`,
      })
    } catch (err) {
      this.logger.error(`Failed to resend invitation email: ${err}`)
    }

    return updated
  }

  async revokeInvitation(tenantId: string, id: string) {
    const inv = await this.prisma.tenantInvitation.findFirst({ where: { id, tenantId, acceptedAt: null } })
    if (!inv) throw new NotFoundException('Pozvánka nenalezena')
    await this.prisma.tenantInvitation.delete({ where: { id } })
  }

  // ─── Password Policy ──────────────────────────────────────

  async setForcePasswordChange(tenantId: string, userId: string, force: boolean) {
    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    return this.prisma.user.update({
      where: { id: userId },
      data: { forcePasswordChange: force },
      select: { id: true, name: true, forcePasswordChange: true },
    })
  }

  async setPasswordExpiry(tenantId: string, userId: string, months: number | null) {
    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!target) throw new NotFoundException('Uživatel nenalezen')

    let passwordExpiresAt: Date | null = null
    if (months != null && months > 0) {
      passwordExpiresAt = new Date()
      passwordExpiresAt.setMonth(passwordExpiresAt.getMonth() + months)
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordExpiresAt },
      select: { id: true, name: true, passwordExpiresAt: true },
    })
  }
}

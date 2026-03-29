import {
  Controller, Get, Put, Post, Patch, Delete,
  Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AdminService }  from './admin.service'
import { EmailService }  from '../email/email.service'
import { Roles }         from '../common/decorators/roles.decorator'
import { CurrentUser }   from '../common/decorators/current-user.decorator'
import { AuditAction }   from '../common/decorators/audit.decorator'
import { ROLES_MANAGE }  from '../common/constants/roles.constants'
import { UpdateSettingsDto, InviteUserDto, SendInvitationDto } from './dto/admin.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private service: AdminService,
    private email:   EmailService,
  ) {}

  @Get('onboarding')
  @ApiOperation({ summary: 'Stav onboardingu' })
  getOnboarding(@CurrentUser() user: AuthUser) {
    return this.service.getOnboardingStatus(user)
  }

  @Post('onboarding/skip/:step')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Přeskočit krok onboardingu' })
  skipOnboardingStep(@CurrentUser() user: AuthUser, @Param('step') step: string) {
    return this.service.skipOnboardingStep(user, step)
  }

  @Post('onboarding/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Zavřít onboarding průvodce' })
  dismissOnboarding(@CurrentUser() user: AuthUser) {
    return this.service.dismissOnboarding(user)
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Stav integrací (Fio, ARES, AI, Mailgun, Signi)' })
  getIntegrations(@CurrentUser() user: AuthUser) {
    return this.service.getIntegrationsStatus(user)
  }

  @Get('tenant')
  @ApiOperation({ summary: 'Info o tenantovi' })
  getTenantInfo(@CurrentUser() user: AuthUser) {
    return this.service.getTenantInfo(user)
  }

  @Get('settings')
  @ApiOperation({ summary: 'Nastavení tenanta' })
  getSettings(@CurrentUser() user: AuthUser) {
    return this.service.getSettings(user)
  }

  @Put('settings')
  @Roles(...ROLES_MANAGE)
  @AuditAction('TenantSettings', 'UPDATE')
  @ApiOperation({ summary: 'Aktualizovat nastavení' })
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(user, dto)
  }

  @Get('users')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Uživatelé tenanta' })
  listUsers(@CurrentUser() user: AuthUser) {
    return this.service.listUsers(user)
  }

  @Post('users')
  @Roles(...ROLES_MANAGE)
  @AuditAction('User', 'INVITE')
  @ApiOperation({ summary: 'Pozvat uživatele' })
  inviteUser(@CurrentUser() user: AuthUser, @Body() dto: InviteUserDto) {
    return this.service.inviteUser(user, dto)
  }

  @Patch('users/:id/role')
  @Roles(...ROLES_MANAGE)
  @AuditAction('User', 'ROLE_CHANGE')
  @ApiOperation({ summary: 'Změnit roli uživatele' })
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.service.updateUserRole(user, id, body.role)
  }

  @Patch('users/:id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('User', 'UPDATE')
  @ApiOperation({ summary: 'Upravit uživatele' })
  updateUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { name?: string; role?: string; isActive?: boolean },
  ) {
    return this.service.updateUser(user, id, dto)
  }

  @Delete('users/:id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('User', 'DEACTIVATE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat uživatele' })
  deactivateUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivateUser(user, id)
  }

  @Put('settings/logo')
  @Roles(...ROLES_MANAGE)
  @AuditAction('TenantSettings', 'LOGO_UPLOAD')
  @ApiOperation({ summary: 'Nahrát logo organizace (base64)' })
  uploadLogo(
    @CurrentUser() user: AuthUser,
    @Body() body: { logoBase64: string },
  ) {
    return this.service.updateSettings(user, { logoBase64: body.logoBase64 })
  }

  @Get('export')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Export všech dat tenanta do JSON' })
  exportData(@CurrentUser() user: AuthUser) {
    return this.service.exportData(user)
  }

  // ─── PROPERTY ASSIGNMENTS ─────────────────────────────────────

  @Get('users/:id/properties')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Seznam přiřazených nemovitostí uživatele' })
  listUserProperties(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listUserPropertyAssignments(user, id)
  }

  @Get('properties/:id/users')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Seznam uživatelů přiřazených k nemovitosti' })
  listPropertyUsers(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.listPropertyUserAssignments(user, id)
  }

  @Post('property-assignments')
  @Roles(...ROLES_MANAGE)
  @AuditAction('UserPropertyAssignment', 'CREATE')
  @ApiOperation({ summary: 'Přiřadit uživatele k nemovitosti' })
  createPropertyAssignment(
    @CurrentUser() user: AuthUser,
    @Body() body: { userId: string; propertyId: string },
  ) {
    return this.service.createPropertyAssignment(user, body.userId, body.propertyId)
  }

  @Delete('property-assignments')
  @Roles(...ROLES_MANAGE)
  @AuditAction('UserPropertyAssignment', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Odebrat přiřazení uživatele k nemovitosti' })
  deletePropertyAssignment(
    @CurrentUser() user: AuthUser,
    @Body() body: { userId: string; propertyId: string },
  ) {
    return this.service.deletePropertyAssignment(user, body.userId, body.propertyId)
  }

  @Post('email/test')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Test SMTP spojeni a odeslani testovacího emailu' })
  async testEmail(
    @CurrentUser() user: AuthUser,
    @Body() body: { to: string },
  ) {
    const connected = await this.email.verifyConnection()
    if (!connected) {
      return { success: false, message: 'SMTP neni nakonfigurovan nebo nelze se pripojit' }
    }

    const tenant = await this.service.getTenantInfo(user)
    const sent   = await this.email.send({
      to:      body.to,
      subject: 'Test emailu z ifmio',
      html:    `<p>SMTP je spravne nakonfigurovan pro tenant <strong>${(tenant as any).name}</strong>.</p>`,
    })

    return { success: sent, message: sent ? 'Email odeslan' : 'Odeslani selhalo' }
  }

  // ─── Invitation System ──────────────────────────────────────

  @Post('invite')
  @Roles(...ROLES_MANAGE)
  @AuditAction('TenantInvitation', 'CREATE')
  @ApiOperation({ summary: 'Odeslat pozvánku' })
  sendInvitation(@CurrentUser() user: AuthUser, @Body() dto: SendInvitationDto) {
    return this.service.sendInvitation(user.tenantId, user.id, dto)
  }

  @Get('invitations')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Seznam pozvánek' })
  listInvitations(@CurrentUser() user: AuthUser) {
    return this.service.listInvitations(user.tenantId)
  }

  @Post('invitations/:id/resend')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Znovu odeslat pozvánku' })
  resendInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.resendInvitation(user.tenantId, id)
  }

  @Delete('invitations/:id')
  @Roles(...ROLES_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Zrušit pozvánku' })
  revokeInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.revokeInvitation(user.tenantId, id)
  }

  // ─── Password Policy ──────────────────────────────────────

  @Post('users/:id/force-password-change')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Vyžadovat změnu hesla při příštím přihlášení' })
  forcePasswordChange(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { force: boolean },
  ) {
    return this.service.setForcePasswordChange(user.tenantId, id, body.force)
  }

  @Post('users/:id/password-expiry')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Nastavit expiraci hesla' })
  setPasswordExpiry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { months: number | null },
  ) {
    return this.service.setPasswordExpiry(user.tenantId, id, body.months)
  }
}

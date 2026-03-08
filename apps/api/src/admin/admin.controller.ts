import {
  Controller, Get, Put, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AdminService }  from './admin.service'
import { EmailService }  from '../email/email.service'
import { JwtAuthGuard }  from '../common/guards/jwt-auth.guard'
import { Roles }         from '../common/decorators/roles.decorator'
import { CurrentUser }   from '../common/decorators/current-user.decorator'
import { AuditAction }   from '../common/decorators/audit.decorator'
import { ROLES_MANAGE }  from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: any) {
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
  inviteUser(@CurrentUser() user: AuthUser, @Body() dto: any) {
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

  @Delete('users/:id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('User', 'DEACTIVATE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat uživatele' })
  deactivateUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivateUser(user, id)
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
}

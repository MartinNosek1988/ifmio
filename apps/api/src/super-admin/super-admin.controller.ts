import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
  email: string;
}

@ApiTags('Super Admin')
@ApiBearerAuth()
@Controller('super-admin')
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  @Get('check')
  @ApiOperation({ summary: 'Ověří, zda je uživatel super admin' })
  check(@CurrentUser() user: AuthUser) {
    return { isSuperAdmin: this.service.isSuperAdmin(user.email) };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Globální statistiky platformy' })
  getStats(@CurrentUser() user: AuthUser) {
    this.service.assertSuperAdmin(user.email);
    return this.service.getStats();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Seznam všech tenantů' })
  listTenants(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    this.service.assertSuperAdmin(user.email);
    return this.service.listTenants(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search,
    );
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Detail tenantu' })
  getTenant(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.service.assertSuperAdmin(user.email);
    return this.service.getTenant(id);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Upravit tenant (plan, limity, aktivace)' })
  updateTenant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: {
      plan?: string;
      isActive?: boolean;
      maxUsers?: number;
      maxProperties?: number;
      trialEndsAt?: string | null;
      notes?: string | null;
    },
  ) {
    this.service.assertSuperAdmin(user.email);
    return this.service.updateTenant(id, body);
  }

  @Post('tenants/:id/impersonate')
  @ApiOperation({ summary: 'Přihlásit se jako tenant (impersonation)' })
  impersonate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.service.assertSuperAdmin(user.email);
    return this.service.impersonate(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Seznam všech uživatelů napříč tenanty' })
  listUsers(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    this.service.assertSuperAdmin(user.email);
    return this.service.listAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search, role,
    );
  }

  @Get('audit')
  @ApiOperation({ summary: 'Audit log napříč tenanty' })
  getAuditLog(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    this.service.assertSuperAdmin(user.email);
    return this.service.getAuditLog(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      tenantId,
    );
  }
}

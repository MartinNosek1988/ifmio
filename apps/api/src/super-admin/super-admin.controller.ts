import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
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
  ) {
    this.service.assertSuperAdmin(user.email);
    return this.service.listTenants(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
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
}

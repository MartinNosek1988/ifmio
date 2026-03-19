import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ApiKeyService } from './api-key.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
export class ApiKeyController {
  constructor(private apiKeys: ApiKeyService) {}

  @Get()
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'List API keys for tenant' })
  list(@CurrentUser() user: AuthUser) {
    return this.apiKeys.listKeys(user)
  }

  @Post()
  @Roles(...ROLES_MANAGE)
  @AuditAction('ApiKey', 'CREATE')
  @ApiOperation({ summary: 'Create a new API key' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: { name: string; scopes: string[]; expiresInDays?: number },
  ) {
    return this.apiKeys.createKey(user, dto)
  }

  @Post(':id/revoke')
  @Roles(...ROLES_MANAGE)
  @AuditAction('ApiKey', 'REVOKE')
  @ApiOperation({ summary: 'Revoke an API key' })
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.apiKeys.revokeKey(user, id)
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('ApiKey', 'DELETE')
  @ApiOperation({ summary: 'Delete an API key permanently' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.apiKeys.deleteKey(user, id)
  }

  @Get('scopes')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'List available API key scopes' })
  scopes() {
    return this.apiKeys.getValidScopes()
  }
}

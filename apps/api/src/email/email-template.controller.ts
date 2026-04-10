import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { EmailTemplateService } from './email-template.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('admin/email-templates')
@Roles(...ROLES_MANAGE)
export class EmailTemplateController {
  constructor(private service: EmailTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam email šablon' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.listTemplates(user.tenantId)
  }

  @Get(':code')
  @ApiOperation({ summary: 'Detail šablony' })
  getOne(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.service.getTemplate(user.tenantId, code)
  }

  @Put(':code')
  @ApiOperation({ summary: 'Uložit upravenou šablonu' })
  save(@CurrentUser() user: AuthUser, @Param('code') code: string, @Body() dto: { subject: string; body: string }) {
    return this.service.saveTemplate(user.tenantId, code, dto.subject, dto.body)
  }

  @Post(':code/reset')
  @ApiOperation({ summary: 'Reset šablony na výchozí' })
  reset(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.service.resetTemplate(user.tenantId, code)
  }

  @Post(':code/preview')
  @ApiOperation({ summary: 'Náhled šablony s ukázkovými daty' })
  preview(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.service.previewTemplate(user.tenantId, code)
  }
}

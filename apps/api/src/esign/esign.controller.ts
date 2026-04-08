import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ESignService } from './esign.service'
import { CreateESignRequestDto, SignDocumentDto, DeclineSignatureDto, CancelESignDto } from './dto/esign.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('eSign')
@ApiBearerAuth()
@Controller('esign')
export class ESignController {
  constructor(private service: ESignService) {}

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vytvořit žádost o podpis' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateESignRequestDto) {
    return this.service.create(user, dto)
  }

  @Get()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Seznam žádostí' })
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string, @Query('documentType') documentType?: string) {
    return this.service.list(user, status, documentType)
  }

  @Get(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Detail žádosti' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id)
  }

  @Post(':id/send')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Odeslat žádost podepisujícím' })
  send(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.sendRequest(user, id)
  }

  @Post(':id/cancel')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Zrušit žádost' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelESignDto) {
    return this.service.cancelRequest(user, id, dto.reason)
  }

  @Get(':id/audit-trail')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Audit trail' })
  auditTrail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getAuditTrail(user, id)
  }

  // ─── Public signing endpoints (token-based, no auth) ──

  @Get('sign/:token')
  @Public()
  @ApiOperation({ summary: 'Načíst dokument k podpisu (veřejné)' })
  getSignPage(@Param('token') token: string) {
    return this.service.getByToken(token)
  }

  @Post('sign/:token/view')
  @Public()
  @ApiOperation({ summary: 'Označit jako prohlédnuto' })
  markViewed(@Param('token') token: string, @Req() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown'
    return this.service.markViewed(token, ip)
  }

  @Post('sign/:token/sign')
  @Public()
  @ApiOperation({ summary: 'Podepsat dokument' })
  sign(@Param('token') token: string, @Body() dto: SignDocumentDto, @Req() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown'
    const ua = req.headers['user-agent'] || 'unknown'
    return this.service.signDocument(token, dto, ip, ua)
  }

  @Post('sign/:token/decline')
  @Public()
  @ApiOperation({ summary: 'Odmítnout podpis' })
  decline(@Param('token') token: string, @Body() dto: DeclineSignatureDto) {
    return this.service.declineSignature(token, dto.reason)
  }
}

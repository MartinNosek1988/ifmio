import { Controller, Get, Post, Put, Body, Param, Query, Res, Req, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { SipoService } from './sipo.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_FINANCE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('SIPO')
@ApiBearerAuth()
@Controller('sipo')
export class SipoController {
  constructor(private service: SipoService) {}

  // ─── CONFIG ────────────────────────────────────────────────────

  @Get('config/:propertyId')
  @ApiOperation({ summary: 'SIPO konfigurace pro nemovitost' })
  getConfig(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getConfig(user.tenantId, propertyId)
  }

  @Post('config')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvořit SIPO konfiguraci' })
  createConfig(@CurrentUser() user: AuthUser, @Body() dto: {
    propertyId: string; recipientNumber: string; feeCode: string;
    deliveryMode?: string; encoding?: string;
  }) {
    return this.service.createConfig(user.tenantId, dto)
  }

  @Put('config/:id')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Upravit SIPO konfiguraci' })
  updateConfig(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateConfig(user.tenantId, id, dto)
  }

  // ─── EXPORT ────────────────────────────────────────────────────

  @Get('export/preview/:propertyId')
  @ApiOperation({ summary: 'Náhled SIPO exportu' })
  preview(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('period') period: string,
  ) {
    return this.service.getExportPreview(user.tenantId, propertyId, period)
  }

  @Post('export/generate/:propertyId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Generovat SIPO změnový soubor + průvodku' })
  async generate(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: { period: string },
    @Res() reply: FastifyReply,
  ) {
    const result = await this.service.generateChangeFile(user.tenantId, propertyId, dto.period)
    // Return as JSON with base64-encoded files
    return reply.send({
      changeFile: result.changeFile.toString('base64'),
      coverFile: result.coverFile.toString('base64'),
      fileName: result.fileName,
      coverFileName: result.coverFileName,
      recordCount: result.recordCount,
      totalAmount: result.totalAmount,
    })
  }

  @Get('export/history/:propertyId')
  @ApiOperation({ summary: 'Historie SIPO exportů' })
  history(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getExportHistory(user.tenantId, propertyId)
  }

  // ─── IMPORT ────────────────────────────────────────────────────

  @Post('import/payments/:propertyId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Import zaplacených SIPO plateb (ZA soubor)' })
  async importPayments(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await request.file()
    if (!data) throw new BadRequestException('Soubor nebyl nahrán')
    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk as Buffer)
    return this.service.importPayments(user.tenantId, propertyId, Buffer.concat(chunks))
  }

  @Post('import/errors/:propertyId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Import chyb od ČP (ZZ soubor)' })
  async importErrors(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await request.file()
    if (!data) throw new BadRequestException('Soubor nebyl nahrán')
    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk as Buffer)
    return this.service.importErrors(user.tenantId, propertyId, Buffer.concat(chunks))
  }

  // ─── PAYERS ────────────────────────────────────────────────────

  @Get('payers/:propertyId')
  @ApiOperation({ summary: 'Seznam SIPO plátců' })
  getPayers(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.getPayers(user.tenantId, propertyId)
  }

  @Put('payers/:occupancyId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Přiřadit spojovací číslo' })
  updatePayer(
    @CurrentUser() user: AuthUser,
    @Param('occupancyId') occupancyId: string,
    @Body() dto: { sipoNumber: string },
  ) {
    return this.service.updatePayerSipoNumber(user.tenantId, occupancyId, dto.sipoNumber)
  }
}

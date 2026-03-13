import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { ProtocolsService } from './protocols.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_OPS } from '../common/constants/roles.constants'
import {
  CreateProtocolDto, UpdateProtocolDto, CompleteProtocolDto,
  CreateProtocolLineDto, UpdateProtocolLineDto,
  GenerateProtocolDto, ProtocolListQueryDto,
  ReorderProtocolLinesDto,
} from './dto/protocols.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Protocols')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('protocols')
export class ProtocolsController {
  constructor(private service: ProtocolsService) {}

  // ─── List / Search ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Seznam protokolů' })
  list(@CurrentUser() user: AuthUser, @Query() query: ProtocolListQueryDto) {
    return this.service.list(user, query)
  }

  // ─── Generate from source ──────────────────────────────────────
  @Post('generate')
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'CREATE')
  @ApiOperation({ summary: 'Vygenerovat protokol z ticketu/revize' })
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateProtocolDto) {
    return this.service.generateFromSource(user, dto)
  }

  // ─── By source ─────────────────────────────────────────────────
  @Get('by-source/:sourceType/:sourceId')
  @ApiOperation({ summary: 'Protokoly podle zdroje' })
  getBySource(
    @CurrentUser() user: AuthUser,
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.service.getBySource(user, sourceType, sourceId)
  }

  // ─── CRUD ──────────────────────────────────────────────────────
  @Post()
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit protokol' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProtocolDto) {
    return this.service.create(user, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail protokolu' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user, id)
  }

  @Patch(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'UPDATE')
  @ApiOperation({ summary: 'Aktualizovat protokol' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProtocolDto,
  ) {
    return this.service.update(user, id, dto)
  }

  @Post(':id/complete')
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'UPDATE')
  @ApiOperation({ summary: 'Dokončit protokol (předání)' })
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CompleteProtocolDto,
  ) {
    return this.service.complete(user, id, dto)
  }

  @Post(':id/confirm')
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'UPDATE')
  @ApiOperation({ summary: 'Potvrdit protokol (completed → confirmed)' })
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.confirm(user, id)
  }

  // ─── PDF & Documents ─────────────────────────────────────────
  @Post(':id/generate-pdf')
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'UPDATE')
  @ApiOperation({ summary: 'Vygenerovat PDF protokolu a uložit jako dokument' })
  generatePdf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.generatePdf(user, id)
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Stáhnout PDF protokolu' })
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ) {
    const { storageKey, name, mimeType } = await this.service.getPdf(user, id)
    const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
    const path = await import('path')
    const fs = await import('fs')
    const filePath = path.join(uploadDir, storageKey)

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send('File not found')
    }

    return reply
      .header('Content-Disposition', `attachment; filename="${name}"`)
      .header('Content-Type', mimeType)
      .send(fs.readFileSync(filePath))
  }

  @Post(':id/upload-signed')
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'UPDATE')
  @ApiOperation({ summary: 'Nahrát podepsaný protokol' })
  async uploadSigned(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file()
    if (!data) throw new Error('No file uploaded')

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    return this.service.uploadSigned(user, id, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    })
  }

  @Delete(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('Protocol', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat protokol' })
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.delete(user, id)
  }

  // ─── Protocol Lines ────────────────────────────────────────────
  @Post(':id/lines')
  @Roles(...ROLES_OPS)
  @AuditAction('ProtocolLine', 'CREATE')
  @ApiOperation({ summary: 'Přidat řádek protokolu' })
  addLine(
    @CurrentUser() user: AuthUser,
    @Param('id') protocolId: string,
    @Body() dto: CreateProtocolLineDto,
  ) {
    return this.service.addLine(user, protocolId, dto)
  }

  @Post(':id/lines/reorder')
  @Roles(...ROLES_OPS)
  @AuditAction('ProtocolLine', 'UPDATE')
  @ApiOperation({ summary: 'Přeřadit řádky protokolu' })
  reorderLines(
    @CurrentUser() user: AuthUser,
    @Param('id') protocolId: string,
    @Body() dto: ReorderProtocolLinesDto,
  ) {
    return this.service.reorderLines(user, protocolId, dto.items)
  }

  @Patch(':id/lines/:lineId')
  @Roles(...ROLES_OPS)
  @AuditAction('ProtocolLine', 'UPDATE')
  @ApiOperation({ summary: 'Upravit řádek protokolu' })
  updateLine(
    @CurrentUser() user: AuthUser,
    @Param('id') protocolId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateProtocolLineDto,
  ) {
    return this.service.updateLine(user, protocolId, lineId, dto)
  }

  @Delete(':id/lines/:lineId')
  @Roles(...ROLES_OPS)
  @AuditAction('ProtocolLine', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat řádek protokolu' })
  deleteLine(
    @CurrentUser() user: AuthUser,
    @Param('id') protocolId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.service.deleteLine(user, protocolId, lineId)
  }
}

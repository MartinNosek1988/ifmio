import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CuzkImportService, type CuzkImportConfirmDto } from './cuzk-import.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(
    private service: PropertiesService,
    private cuzkImport: CuzkImportService,
  ) {}

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @AuditAction('property', 'create')
  @ApiOperation({ summary: 'Vytvořit nemovitost' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePropertyDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Seznam nemovitostí' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @Get(':id/nav')
  @ApiOperation({ summary: 'Property navigation (prev/next/total)' })
  getNav(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getNav(user, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail nemovitosti' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @Roles('tenant_owner', 'tenant_admin', 'property_manager')
  @AuditAction('property', 'update')
  @ApiOperation({ summary: 'Upravit nemovitost' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @AuditAction('property', 'archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archivovat nemovitost (soft delete)' })
  async archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.archive(user, id);
  }

  @Post(':id/enrich')
  @Roles('tenant_owner', 'tenant_admin', 'property_manager')
  @AuditAction('property', 'enrich')
  @ApiOperation({ summary: 'Spustit ARES + Justice.cz enrichment' })
  async enrich(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.findOne(user, id);
    return this.service.enrichProperty(id);
  }

  // ─── ČÚZK Import ─────────────────────────────────────────

  @Post('import/cuzk')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Nahrát a parsovat ČÚZK Domsys JSON (preview)' })
  async cuzkPreview(@Req() req: any) {
    const data = await req.file();
    if (!data) throw new Error('Soubor nebyl nahrán');
    const buffer = await data.toBuffer();
    const content = buffer.toString('utf-8');
    return this.cuzkImport.parseDomsysJson(content);
  }

  @Post('import/cuzk/confirm')
  @Roles('tenant_owner', 'tenant_admin')
  @AuditAction('property', 'import_cuzk')
  @ApiOperation({ summary: 'Potvrdit a uložit ČÚZK import' })
  cuzkConfirm(@CurrentUser() user: AuthUser, @Body() dto: CuzkImportConfirmDto) {
    return this.cuzkImport.confirmImport(user, dto);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
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
  constructor(private service: PropertiesService) {}

  @Post()
  @Roles('owner', 'admin', 'manager')
  @AuditAction('property', 'create')
  @ApiOperation({ summary: 'Vytvořit nemovitost' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePropertyDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Seznam nemovitostí' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail nemovitosti' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'manager')
  @AuditAction('property', 'update')
  @ApiOperation({ summary: 'Upravit nemovitost' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  @AuditAction('property', 'archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archivovat nemovitost (soft delete)' })
  async archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.archive(user.tenantId, id);
  }
}

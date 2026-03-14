import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AssetTypesService } from './asset-types.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_OPS } from '../common/constants/roles.constants'
import {
  CreateAssetTypeDto, UpdateAssetTypeDto,
  CreateAssetTypeAssignmentDto, UpdateAssetTypeAssignmentDto,
} from './dto/asset-types.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Asset Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('asset-types')
export class AssetTypesController {
  constructor(private service: AssetTypesService) {}

  // ─── Asset Types CRUD ─────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Seznam typů zařízení' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail typu zařízení' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user, id)
  }

  @Post()
  @Roles(...ROLES_OPS)
  @AuditAction('AssetType', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit typ zařízení' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetTypeDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('AssetType', 'UPDATE')
  @ApiOperation({ summary: 'Upravit typ zařízení' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssetTypeDto,
  ) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_OPS)
  @AuditAction('AssetType', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat typ zařízení' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }

  // ─── Activity Template Assignments ────────────────────────────

  @Get(':id/activity-templates')
  @ApiOperation({ summary: 'Přiřazené šablony činností' })
  listAssignments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listAssignments(user, id)
  }

  @Post(':id/activity-templates')
  @Roles(...ROLES_OPS)
  @AuditAction('AssetTypeRevisionType', 'CREATE')
  @ApiOperation({ summary: 'Přiřadit šablonu činnosti' })
  createAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateAssetTypeAssignmentDto,
  ) {
    return this.service.createAssignment(user, id, dto)
  }

  @Patch(':id/activity-templates/:assignmentId')
  @Roles(...ROLES_OPS)
  @AuditAction('AssetTypeRevisionType', 'UPDATE')
  @ApiOperation({ summary: 'Upravit přiřazení šablony činnosti' })
  updateAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssetTypeAssignmentDto,
  ) {
    return this.service.updateAssignment(user, id, assignmentId, dto)
  }

  @Delete(':id/activity-templates/:assignmentId')
  @Roles(...ROLES_OPS)
  @AuditAction('AssetTypeRevisionType', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Odebrat přiřazení šablony činnosti' })
  removeAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.service.removeAssignment(user, id, assignmentId)
  }

  // ─── Preview ─────────────────────────────────────────────────

  @Get(':id/preview-plans')
  @ApiOperation({ summary: 'Náhled efektivních pravidel činností pro typ zařízení' })
  previewPlans(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.previewPlans(user, id)
  }
}

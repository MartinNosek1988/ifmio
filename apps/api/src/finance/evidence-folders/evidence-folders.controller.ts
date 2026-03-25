import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { EvidenceFoldersService } from './evidence-folders.service'
import { CreateEvidenceFolderDto, UpdateEvidenceFolderDto, CreateEvidenceAllocationDto, UpdateEvidenceAllocationDto } from './dto/evidence-folder.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ROLES_FINANCE } from '../../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Evidence Folders')
@ApiBearerAuth()
@Controller('finance')
export class EvidenceFoldersController {
  constructor(private service: EvidenceFoldersService) {}

  // ─── Folders CRUD ──────────────────────────────────────────

  @Get('evidence-folders')
  @ApiOperation({ summary: 'Seznam evidenčních složek' })
  listFolders(@CurrentUser() user: AuthUser, @Query('propertyId') propertyId: string) {
    return this.service.listFolders(user.tenantId, propertyId)
  }

  @Post('evidence-folders')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvořit evidenční složku' })
  createFolder(@CurrentUser() user: AuthUser, @Body() dto: CreateEvidenceFolderDto) {
    return this.service.createFolder(user.tenantId, dto)
  }

  @Put('evidence-folders/:id')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Upravit evidenční složku' })
  updateFolder(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEvidenceFolderDto) {
    return this.service.updateFolder(user.tenantId, id, dto)
  }

  @Delete('evidence-folders/:id')
  @Roles(...ROLES_FINANCE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archivovat evidenční složku' })
  deleteFolder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteFolder(user.tenantId, id)
  }

  // ─── Invoice allocations ───────────────────────────────────

  @Get('invoices/:id/evidence-allocations')
  @ApiOperation({ summary: 'Evidenční alokace dokladu' })
  listAllocations(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listAllocations(user.tenantId, id)
  }

  @Post('invoices/:id/evidence-allocations')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Přidat evidenční alokaci' })
  createAllocation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateEvidenceAllocationDto) {
    return this.service.createAllocation(user.tenantId, id, dto)
  }

  @Put('invoices/:id/evidence-allocations/:allocationId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Upravit evidenční alokaci' })
  updateAllocation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('allocationId') aid: string, @Body() dto: UpdateEvidenceAllocationDto) {
    return this.service.updateAllocation(user.tenantId, id, aid, dto)
  }

  @Delete('invoices/:id/evidence-allocations/:allocationId')
  @Roles(...ROLES_FINANCE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat evidenční alokaci' })
  deleteAllocation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('allocationId') aid: string) {
    return this.service.deleteAllocation(user.tenantId, id, aid)
  }
}

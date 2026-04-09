import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CrmPipelineService } from './crm-pipeline.service';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '@ifmio/shared-types';
import { CreateCrmLeadDto, UpdateCrmLeadDto, ChangeStageDto, AddActivityDto, ImportFromKbDto } from './dto/crm.dto';

@ApiTags('CRM Pipeline')
@ApiBearerAuth()
@Controller('crm-pipeline')
export class CrmPipelineController {
  constructor(
    private service: CrmPipelineService,
    private superAdmin: SuperAdminService,
  ) {}

  @Get('leads')
  @ApiOperation({ summary: 'List CRM leads (paginated, filterable)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stage') stage?: string,
    @Query('leadType') leadType?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.list({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      stage,
      leadType,
      priority,
      search,
    });
  }

  @Get('leads/stats')
  @ApiOperation({ summary: 'Pipeline statistics' })
  stats(@CurrentUser() user: AuthUser) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.stats();
  }

  @Get('leads/kanban')
  @ApiOperation({ summary: 'Kanban board — leads grouped by active stages' })
  kanban(
    @CurrentUser() user: AuthUser,
    @Query('leadType') leadType?: string,
    @Query('priority') priority?: string,
  ) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.getKanban({ leadType, priority });
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get lead detail with activities' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.getById(id);
  }

  @Post('leads')
  @ApiOperation({ summary: 'Create a new CRM lead' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCrmLeadDto) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.create(dto, user.id);
  }

  @Put('leads/:id')
  @ApiOperation({ summary: 'Update a CRM lead' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmLeadDto,
  ) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.update(id, dto);
  }

  @Delete('leads/:id')
  @ApiOperation({ summary: 'Soft-delete a CRM lead' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.remove(id);
  }

  @Post('leads/:id/stage')
  @ApiOperation({ summary: 'Change lead stage' })
  changeStage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
  ) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.changeStage(id, dto.stage, user.id, dto.closedReason);
  }

  @Post('leads/:id/activities')
  @ApiOperation({ summary: 'Add activity to a lead' })
  addActivity(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddActivityDto,
  ) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.addActivity(id, dto, user.id);
  }

  @Get('kb-candidates')
  @ApiOperation({ summary: 'List KB organizations eligible for CRM import' })
  kbCandidates(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.getKbCandidates({
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('import-from-kb')
  @ApiOperation({ summary: 'Bulk import leads from KB organizations' })
  importFromKb(@CurrentUser() user: AuthUser, @Body() dto: ImportFromKbDto) {
    this.superAdmin.assertSuperAdmin(user.email);
    return this.service.importFromKb(dto.ids);
  }
}

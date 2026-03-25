import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ROLES_FINANCE, ROLES_MANAGE } from '../../common/constants/roles.constants'
import { ComponentsService } from './components.service'
import { ComponentGeneratorService } from './component-generator.service'
import { CreateComponentDto, UpdateComponentDto, AssignUnitsDto, UpdateAssignmentDto } from './dto/component.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Prescription Components')
@ApiBearerAuth()
@Controller('properties/:propertyId/components')
export class ComponentsController {
  constructor(
    private service: ComponentsService,
    private generator: ComponentGeneratorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Seznam složek předpisu nemovitosti' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.listComponents(user.tenantId, propertyId, {
      activeOnly: activeOnly !== 'false',
    })
  }

  @Get(':componentId')
  @ApiOperation({ summary: 'Detail složky předpisu' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('componentId') componentId: string,
  ) {
    return this.service.getComponent(user.tenantId, componentId)
  }

  @Get(':componentId/fund-balance')
  @ApiOperation({ summary: 'Zůstatek fondu k datu' })
  async fundBalance(
    @CurrentUser() user: AuthUser,
    @Param('componentId') componentId: string,
    @Query('date') date?: string,
  ) {
    const asOfDate = date ? new Date(date) : new Date()
    const balance = await this.service.calculateFundBalance(componentId, asOfDate)
    return { balance, asOfDate: asOfDate.toISOString() }
  }

  @Post()
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvořit složku předpisu' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateComponentDto,
  ) {
    return this.service.createComponent(user.tenantId, propertyId, dto)
  }

  @Put(':componentId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Upravit složku předpisu' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('componentId') componentId: string,
    @Body() dto: UpdateComponentDto,
  ) {
    return this.service.updateComponent(user.tenantId, componentId, dto)
  }

  @Delete(':componentId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Archivovat složku předpisu' })
  archive(
    @CurrentUser() user: AuthUser,
    @Param('componentId') componentId: string,
  ) {
    return this.service.archiveComponent(user.tenantId, componentId)
  }

  @Post(':componentId/assign')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Přiřadit složku k jednotkám' })
  assign(
    @CurrentUser() user: AuthUser,
    @Param('componentId') componentId: string,
    @Body() dto: AssignUnitsDto,
  ) {
    return this.service.assignToUnits(
      user.tenantId,
      componentId,
      dto.unitIds,
      new Date(dto.effectiveFrom),
      dto.overrideAmount != null ? dto.overrideAmount : undefined,
    )
  }

  @Delete('assignments/:assignmentId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Odebrat přiřazení složky' })
  removeAssignment(
    @CurrentUser() user: AuthUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.service.removeAssignment(user.tenantId, assignmentId)
  }

  @Patch('assignments/:assignmentId')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Upravit individuální nastavení' })
  updateOverride(
    @CurrentUser() user: AuthUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.service.updateAssignmentOverride(
      user.tenantId,
      assignmentId,
      dto.overrideAmount ?? null,
      dto.note,
    )
  }

  @Get('units/:unitId')
  @ApiOperation({ summary: 'Složky předpisu jednotky' })
  unitComponents(
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.service.getUnitComponents(user.tenantId, unitId)
  }

  @Get('units/:unitId/prescription-preview')
  @ApiOperation({ summary: 'Náhled předpisu jednotky' })
  unitPreview(
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.service.calculateUnitPrescription(user.tenantId, unitId)
  }

  @Get('prescription-preview')
  @ApiOperation({ summary: 'Náhled předpisů celé nemovitosti' })
  propertyPreview(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.previewPropertyPrescriptions(
      user.tenantId,
      propertyId,
      month ? parseInt(month) : new Date().getMonth() + 1,
      year ? parseInt(year) : new Date().getFullYear(),
    )
  }

  @Post('generate-prescriptions')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Generovat předpisy ze složek předpisu' })
  generateFromComponents(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() body: { month: number; year: number; dueDay?: number; dryRun?: boolean },
  ) {
    return this.generator.generateFromComponents(
      user.tenantId, propertyId, body.month, body.year,
      { dueDay: body.dueDay, dryRun: body.dryRun },
    )
  }
}

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { RevisionsService } from './revisions.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_OPS } from '../common/constants/roles.constants'
import {
  CreateRevisionSubjectDto, UpdateRevisionSubjectDto,
  CreateRevisionTypeDto, UpdateRevisionTypeDto,
  CreateRevisionPlanDto, UpdateRevisionPlanDto, RevisionPlanListQueryDto,
  CreateRevisionEventDto, RecordRevisionEventDto, UpdateRevisionEventDto,
} from './dto/revisions.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Revisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('revisions')
export class RevisionsController {
  constructor(private service: RevisionsService) {}

  // ─── Dashboard ──────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Revision compliance dashboard' })
  getDashboard(
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
  ) {
    return this.service.getDashboard(user, Math.min(90, Math.max(1, Number(days) || 30)))
  }

  // ─── Subjects ───────────────────────────────────────────────────
  @Get('subjects')
  @ApiOperation({ summary: 'Seznam předmětů revize' })
  listSubjects(@CurrentUser() user: AuthUser) {
    return this.service.listSubjects(user)
  }

  @Post('subjects')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionSubject', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit předmět revize' })
  createSubject(@CurrentUser() user: AuthUser, @Body() dto: CreateRevisionSubjectDto) {
    return this.service.createSubject(user, dto)
  }

  @Get('subjects/:id')
  @ApiOperation({ summary: 'Detail předmětu revize' })
  getSubject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getSubject(user, id)
  }

  @Patch('subjects/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionSubject', 'UPDATE')
  @ApiOperation({ summary: 'Aktualizovat předmět revize' })
  updateSubject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRevisionSubjectDto,
  ) {
    return this.service.updateSubject(user, id, dto)
  }

  @Delete('subjects/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionSubject', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat předmět revize' })
  deleteSubject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteSubject(user, id)
  }

  // ─── Types ──────────────────────────────────────────────────────
  @Get('types')
  @ApiOperation({ summary: 'Seznam typů revize' })
  listTypes(@CurrentUser() user: AuthUser) {
    return this.service.listTypes(user)
  }

  @Post('types')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionType', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit typ revize' })
  createType(@CurrentUser() user: AuthUser, @Body() dto: CreateRevisionTypeDto) {
    return this.service.createType(user, dto)
  }

  @Patch('types/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionType', 'UPDATE')
  @ApiOperation({ summary: 'Aktualizovat typ revize' })
  updateType(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRevisionTypeDto,
  ) {
    return this.service.updateType(user, id, dto)
  }

  @Delete('types/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionType', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat typ revize' })
  deleteType(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteType(user, id)
  }

  // ─── Plans ──────────────────────────────────────────────────────
  @Get('plans')
  @ApiOperation({ summary: 'Seznam plánů revizí' })
  listPlans(@CurrentUser() user: AuthUser, @Query() query: RevisionPlanListQueryDto) {
    return this.service.listPlans(user, query)
  }

  @Post('plans')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionPlan', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit plán revize' })
  createPlan(@CurrentUser() user: AuthUser, @Body() dto: CreateRevisionPlanDto) {
    return this.service.createPlan(user, dto)
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Detail plánu revize' })
  getPlan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getPlan(user, id)
  }

  @Patch('plans/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionPlan', 'UPDATE')
  @ApiOperation({ summary: 'Aktualizovat plán revize' })
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRevisionPlanDto,
  ) {
    return this.service.updatePlan(user, id, dto)
  }

  @Delete('plans/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionPlan', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat plán revize' })
  deletePlan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deletePlan(user, id)
  }

  @Post('plans/:id/record-event')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionEvent', 'CREATE')
  @ApiOperation({ summary: 'Zapsat provedení revize (shortcut)' })
  recordEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordRevisionEventDto,
  ) {
    return this.service.recordEvent(user, id, dto as CreateRevisionEventDto)
  }

  @Get('plans/:id/history')
  @ApiOperation({ summary: 'Historie událostí plánu' })
  getPlanHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getPlanHistory(user, id)
  }

  // ─── Events ─────────────────────────────────────────────────────
  @Get('events')
  @ApiOperation({ summary: 'Seznam událostí revizí' })
  listEvents(@CurrentUser() user: AuthUser, @Query('planId') planId?: string) {
    return this.service.listEvents(user, planId)
  }

  @Post('events')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionEvent', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit událost revize' })
  createEvent(@CurrentUser() user: AuthUser, @Body() dto: CreateRevisionEventDto) {
    return this.service.createEvent(user, dto)
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Detail události revize' })
  getEvent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getEvent(user, id)
  }

  @Patch('events/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionEvent', 'UPDATE')
  @ApiOperation({ summary: 'Aktualizovat událost revize' })
  updateEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRevisionEventDto,
  ) {
    return this.service.updateEvent(user, id, dto)
  }

  @Delete('events/:id')
  @Roles(...ROLES_OPS)
  @AuditAction('RevisionEvent', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat událost revize' })
  deleteEvent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteEvent(user, id)
  }
}

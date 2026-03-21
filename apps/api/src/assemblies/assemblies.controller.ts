import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'
import { AssembliesService } from './assemblies.service'
import { AssemblyPdfService } from './pdf/assembly-pdf.service'
import { CreateAssemblyDto } from './dto/create-assembly.dto'
import { UpdateAssemblyDto } from './dto/update-assembly.dto'
import { CreateAgendaItemDto, UpdateAgendaItemDto, ReorderAgendaDto } from './dto/create-agenda-item.dto'
import { CreateAttendeeDto, UpdateAttendeeDto } from './dto/create-attendee.dto'
import { RecordVotesDto } from './dto/record-vote.dto'

@ApiTags('Assemblies')
@ApiBearerAuth()
@Controller('assemblies')
export class AssembliesController {
  constructor(
    private service: AssembliesService,
    private pdf: AssemblyPdfService,
  ) {}

  // ─── ASSEMBLY CRUD ─────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Seznam shromáždění' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(user, { propertyId, status })
  }

  @Post()
  @Roles(...ROLES_MANAGE)
  @AuditAction('Assembly', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit shromáždění' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssemblyDto) {
    return this.service.create(user, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail shromáždění' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id)
  }

  @Patch(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Assembly', 'UPDATE')
  @ApiOperation({ summary: 'Upravit shromáždění' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAssemblyDto) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Assembly', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat shromáždění (pouze DRAFT)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }

  // ─── STATUS TRANSITIONS ────────────────────────────────────────

  @Post(':id/publish')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Assembly', 'PUBLISH')
  @ApiOperation({ summary: 'Publikovat shromáždění' })
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.publish(user, id)
  }

  @Post(':id/start')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Assembly', 'START')
  @ApiOperation({ summary: 'Zahájit shromáždění' })
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.start(user, id)
  }

  @Post(':id/complete')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Assembly', 'COMPLETE')
  @ApiOperation({ summary: 'Ukončit shromáždění' })
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.complete(user, id)
  }

  @Post(':id/cancel')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Assembly', 'CANCEL')
  @ApiOperation({ summary: 'Zrušit shromáždění' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancel(user, id)
  }

  // ─── AGENDA ITEMS ──────────────────────────────────────────────

  @Post(':id/agenda-items')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Přidat bod programu' })
  addAgendaItem(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateAgendaItemDto) {
    return this.service.addAgendaItem(user, id, dto)
  }

  @Patch(':assemblyId/agenda-items/:itemId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Upravit bod programu' })
  updateAgendaItem(
    @CurrentUser() user: AuthUser,
    @Param('assemblyId') assemblyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateAgendaItemDto,
  ) {
    return this.service.updateAgendaItem(user, assemblyId, itemId, dto)
  }

  @Delete(':assemblyId/agenda-items/:itemId')
  @Roles(...ROLES_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat bod programu' })
  deleteAgendaItem(
    @CurrentUser() user: AuthUser,
    @Param('assemblyId') assemblyId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.deleteAgendaItem(user, assemblyId, itemId)
  }

  @Patch(':id/agenda-items/reorder')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Přeřadit body programu' })
  reorderAgendaItems(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReorderAgendaDto) {
    return this.service.reorderAgendaItems(user, id, dto.itemIds)
  }

  // ─── ATTENDANCE ────────────────────────────────────────────────

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Seznam účastníků' })
  listAttendees(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listAttendees(user, id)
  }

  @Post(':id/attendees')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Přidat účastníka' })
  addAttendee(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateAttendeeDto) {
    return this.service.addAttendee(user, id, dto)
  }

  @Patch(':assemblyId/attendees/:attId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Upravit účastníka' })
  updateAttendee(
    @CurrentUser() user: AuthUser,
    @Param('assemblyId') assemblyId: string,
    @Param('attId') attId: string,
    @Body() dto: UpdateAttendeeDto,
  ) {
    return this.service.updateAttendee(user, assemblyId, attId, dto)
  }

  @Delete(':assemblyId/attendees/:attId')
  @Roles(...ROLES_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Odebrat účastníka' })
  removeAttendee(
    @CurrentUser() user: AuthUser,
    @Param('assemblyId') assemblyId: string,
    @Param('attId') attId: string,
  ) {
    return this.service.removeAttendee(user, assemblyId, attId)
  }

  @Post(':id/attendees/populate')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Načíst vlastníky z evidence' })
  populateAttendees(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.populateAttendees(user, id)
  }

  // ─── QUORUM ────────────────────────────────────────────────────

  @Get(':id/quorum')
  @ApiOperation({ summary: 'Stav kvóra' })
  getQuorum(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getQuorum(user, id)
  }

  // ─── VOTING ────────────────────────────────────────────────────

  @Post(':assemblyId/agenda-items/:itemId/votes')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Zaznamenat hlasy' })
  recordVotes(
    @CurrentUser() user: AuthUser,
    @Param('assemblyId') assemblyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: RecordVotesDto,
  ) {
    return this.service.recordVotes(user, assemblyId, itemId, dto.votes)
  }

  @Get(':assemblyId/agenda-items/:itemId/votes')
  @ApiOperation({ summary: 'Detail hlasování' })
  getVotes(
    @CurrentUser() user: AuthUser,
    @Param('assemblyId') assemblyId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.getVotes(user, assemblyId, itemId)
  }

  @Post(':assemblyId/agenda-items/:itemId/evaluate')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Vyhodnotit hlasování' })
  evaluateVote(
    @CurrentUser() user: AuthUser,
    @Param('assemblyId') assemblyId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.evaluateVote(user, assemblyId, itemId)
  }

  // ─── PDF ───────────────────────────────────────────────────────

  @Get(':id/pdf/minutes')
  @ApiOperation({ summary: 'Stáhnout zápis ze shromáždění (PDF)' })
  async getMinutesPdf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pdf.generateMinutes(user, id)
  }

  @Get(':id/pdf/attendance')
  @ApiOperation({ summary: 'Stáhnout prezenční listinu (PDF)' })
  async getAttendancePdf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pdf.generateAttendance(user, id)
  }

  @Get(':id/pdf/voting-report')
  @ApiOperation({ summary: 'Stáhnout protokol hlasování (PDF)' })
  async getVotingReportPdf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pdf.generateVotingReport(user, id)
  }

  @Get(':id/pdf/garage-authorization')
  @ApiOperation({ summary: 'Zmocnění společného zástupce garážové jednotky (PDF)' })
  async getGarageAuthPdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('unitId') unitId: string) {
    return this.pdf.generateGarageAuthorization(user, id, unitId)
  }
}

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuditAction } from '../common/decorators/audit.decorator'
import { Public } from '../common/decorators/public.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'
import { PerRollamService } from './per-rollam.service'
import { PerRollamPdfService } from './per-rollam-pdf.service'
import { CreatePerRollamDto, UpdatePerRollamDto } from './dto/create-per-rollam.dto'
import { CreatePerRollamItemDto, UpdatePerRollamItemDto } from './dto/create-per-rollam-item.dto'
import { SubmitBallotDto, ManualEntryDto } from './dto/submit-ballot.dto'

@ApiTags('Per Rollam')
@ApiBearerAuth()
@Controller('per-rollam')
export class PerRollamController {
  constructor(
    private service: PerRollamService,
    private pdf: PerRollamPdfService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Seznam hlasování per rollam' })
  findAll(@CurrentUser() user: AuthUser, @Query('propertyId') propertyId?: string, @Query('status') status?: string) {
    return this.service.findAll(user, { propertyId, status })
  }

  @Post()
  @Roles(...ROLES_MANAGE)
  @AuditAction('PerRollamVoting', 'CREATE')
  @ApiOperation({ summary: 'Vytvořit hlasování per rollam' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePerRollamDto) {
    return this.service.create(user, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail hlasování per rollam' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id)
  }

  @Patch(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('PerRollamVoting', 'UPDATE')
  @ApiOperation({ summary: 'Upravit hlasování per rollam' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePerRollamDto) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('PerRollamVoting', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat hlasování (pouze DRAFT)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id)
  }

  // ─── ITEMS ─────────────────────────────────────────────────────

  @Post(':id/items')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Přidat hlasovací bod' })
  addItem(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreatePerRollamItemDto) {
    return this.service.addItem(user, id, dto)
  }

  @Patch(':votingId/items/:itemId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Upravit hlasovací bod' })
  updateItem(@CurrentUser() user: AuthUser, @Param('votingId') votingId: string, @Param('itemId') itemId: string, @Body() dto: UpdatePerRollamItemDto) {
    return this.service.updateItem(user, votingId, itemId, dto)
  }

  @Delete(':votingId/items/:itemId')
  @Roles(...ROLES_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat hlasovací bod' })
  deleteItem(@CurrentUser() user: AuthUser, @Param('votingId') votingId: string, @Param('itemId') itemId: string) {
    return this.service.deleteItem(user, votingId, itemId)
  }

  // ─── STATUS TRANSITIONS ────────────────────────────────────────

  @Post(':id/publish')
  @Roles(...ROLES_MANAGE)
  @AuditAction('PerRollamVoting', 'PUBLISH')
  @ApiOperation({ summary: 'Publikovat — vytvořit hlasovací lístky' })
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.publish(user, id)
  }

  @Post(':id/close')
  @Roles(...ROLES_MANAGE)
  @AuditAction('PerRollamVoting', 'CLOSE')
  @ApiOperation({ summary: 'Uzavřít hlasování' })
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.close(user, id)
  }

  @Post(':id/evaluate')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Vyhodnotit výsledky' })
  evaluate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.evaluate(user, id)
  }

  @Post(':id/notify-results')
  @Roles(...ROLES_MANAGE)
  @AuditAction('PerRollamVoting', 'NOTIFY_RESULTS')
  @ApiOperation({ summary: 'Oznámit výsledky vlastníkům' })
  notifyResults(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.notifyResults(user, id)
  }

  @Post(':id/cancel')
  @Roles(...ROLES_MANAGE)
  @AuditAction('PerRollamVoting', 'CANCEL')
  @ApiOperation({ summary: 'Zrušit hlasování' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancel(user, id)
  }

  // ─── BALLOTS (admin) ───────────────────────────────────────────

  @Get(':id/ballots')
  @ApiOperation({ summary: 'Seznam hlasovacích lístků' })
  listBallots(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listBallots(user, id)
  }

  @Post(':votingId/ballots/:ballotId/manual-entry')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Ruční zadání hlasů z papírového lístku' })
  manualEntry(
    @CurrentUser() user: AuthUser,
    @Param('votingId') votingId: string,
    @Param('ballotId') ballotId: string,
    @Body() dto: ManualEntryDto,
  ) {
    return this.service.manualEntry(user, votingId, ballotId, dto.votes)
  }

  // ─── PUBLIC BALLOT (no auth) ───────────────────────────────────

  @Get('ballot/:accessToken')
  @Public()
  @ApiOperation({ summary: 'Načíst hlasovací lístek (veřejný)' })
  getBallot(@Param('accessToken') accessToken: string) {
    return this.service.getBallotByToken(accessToken)
  }

  @Post('ballot/:accessToken/submit')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Odeslat hlasování (veřejný)' })
  submitBallot(@Param('accessToken') accessToken: string, @Body() dto: SubmitBallotDto) {
    return this.service.submitBallot(accessToken, dto.votes)
  }

  // ─── PROGRESS ──────────────────────────────────────────────────

  @Get(':id/progress')
  @ApiOperation({ summary: 'Průběh hlasování' })
  getProgress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getProgress(user, id)
  }

  // ─── PDF ───────────────────────────────────────────────────────

  @Get(':id/pdf/cover-letter')
  @ApiOperation({ summary: 'Průvodní dopis PDF' })
  getCoverLetterPdf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pdf.generateCoverLetter(user, id)
  }

  @Get(':id/pdf/results')
  @ApiOperation({ summary: 'Výsledky hlasování PDF' })
  getResultsPdf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pdf.generateResults(user, id)
  }

  @Get(':id/pdf/ballot/:ballotId')
  @ApiOperation({ summary: 'Hlasovací lístek PDF' })
  getBallotPdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('ballotId') ballotId: string) {
    return this.pdf.generateBallot(user, id, ballotId)
  }
}

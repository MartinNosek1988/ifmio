import {
  Controller, Get, Post, Delete, Body, Param, HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PortalService } from './portal.service'
import { PortalAccessService } from './portal-access.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'
import { CreatePortalTicketDto, SubmitMeterReadingDto } from './dto/portal.dto'

@ApiTags('Portal')
@ApiBearerAuth()
@Controller('portal')
@Roles('unit_owner', 'unit_tenant')
export class PortalController {
  constructor(
    private portalService: PortalService,
    private accessService: PortalAccessService,
  ) {}

  @Get('my-units')
  @ApiOperation({ summary: 'Jednotky klienta (dle partyId)' })
  getMyUnits(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyUnits(user)
  }

  @Get('my-prescriptions')
  @ApiOperation({ summary: 'Předpisy záloh klienta' })
  getMyPrescriptions(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyPrescriptions(user)
  }

  @Get('my-settlements')
  @ApiOperation({ summary: 'Vyúčtování klienta' })
  getMySettlements(@CurrentUser() user: AuthUser) {
    return this.portalService.getMySettlements(user)
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Požadavky klienta' })
  getMyTickets(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyTickets(user)
  }

  @Post('tickets')
  @HttpCode(201)
  @ApiOperation({ summary: 'Nový požadavek z portálu' })
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreatePortalTicketDto) {
    return this.portalService.createTicket(user, dto)
  }

  @Get('my-meters')
  @ApiOperation({ summary: 'Měřidla klienta' })
  getMyMeters(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyMeters(user)
  }

  @Post('meters/:id/readings')
  @HttpCode(201)
  @ApiOperation({ summary: 'Odečet měřidla z portálu' })
  submitMeterReading(
    @CurrentUser() user: AuthUser,
    @Param('id') meterId: string,
    @Body() dto: SubmitMeterReadingDto,
  ) {
    return this.portalService.submitMeterReading(user, meterId, dto)
  }

  @Get('my-documents')
  @ApiOperation({ summary: 'Dokumenty klienta (veřejné)' })
  getMyDocuments(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyDocuments(user)
  }

  @Get('my-konto')
  @ApiOperation({ summary: 'Stav konta klienta' })
  getMyKonto(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyKonto(user)
  }

  @Get('my-contacts')
  @ApiOperation({ summary: 'Kontakty správce a nemovitostí' })
  getMyContacts(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyContacts(user)
  }

  @Get('prescriptions/:id/payment-qr')
  @ApiOperation({ summary: 'QR kód pro platbu předpisu (SPAYD)' })
  getPrescriptionQr(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.portalService.getPrescriptionQr(user, id)
  }

  @Get('my-votings')
  @ApiOperation({ summary: 'Per rollam hlasování klienta' })
  getMyVotings(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyVotings(user)
  }

  @Get('my-esign')
  @ApiOperation({ summary: 'Elektronické podpisy klienta' })
  getMyESignRequests(@CurrentUser() user: AuthUser) {
    return this.portalService.getMyESignRequests(user)
  }

  // ─── ADMIN: Portal Access Management ────────────────────────

  @Post('admin/generate-access')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Vygenerovat přístup do portálu pro vlastníka' })
  generateAccess(
    @CurrentUser() user: AuthUser,
    @Body() dto: { residentId: string; email: string },
  ) {
    return this.accessService.generateAccess(user.tenantId, dto.residentId, dto.email)
  }

  @Post('admin/bulk-generate/:propertyId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Hromadně vygenerovat přístupy pro nemovitost' })
  bulkGenerateAccess(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.accessService.bulkGenerateAccess(user.tenantId, propertyId)
  }

  @Post('admin/refresh-access/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Prodloužit platnost portálového přístupu o 90 dní' })
  refreshAccess(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accessService.refreshAccess(user.tenantId, id)
  }

  @Delete('admin/revoke/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Zrušit přístup do portálu' })
  revokeAccess(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.accessService.revokeAccess(user.tenantId, id)
  }

  @Post('admin/send-invitation/:accessId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Odeslat pozvánku do portálu emailem' })
  sendInvitation(@CurrentUser() user: AuthUser, @Param('accessId') accessId: string) {
    return this.accessService.sendInvitation(user.tenantId, accessId)
  }

  @Get('admin/status/:propertyId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Stav portálových přístupů pro nemovitost' })
  getPortalStatus(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.accessService.getPropertyPortalStatus(user.tenantId, propertyId)
  }

  @Get('admin/messages')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Zprávy z portálu (admin pohled)' })
  async getAdminMessages(@CurrentUser() user: AuthUser) {
    const messages = await this.accessService.getUnreadCount(user.tenantId, 'inbound')
    return { unreadCount: messages }
  }
}

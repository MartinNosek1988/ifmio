import {
  Controller, Get, Post, Body, Param, HttpCode, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PortalService } from './portal.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import type { AuthUser } from '@ifmio/shared-types'
import { CreatePortalTicketDto, SubmitMeterReadingDto } from './dto/portal.dto'

@ApiTags('Portal')
@ApiBearerAuth()
@Controller('portal')
@Roles('unit_owner', 'unit_tenant')
export class PortalController {
  constructor(private portalService: PortalService) {}

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
}

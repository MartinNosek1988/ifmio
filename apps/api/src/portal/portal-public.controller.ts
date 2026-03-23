import { Controller, Get, Post, Body, Param, UnauthorizedException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { PortalService } from './portal.service'
import { PortalAccessService } from './portal-access.service'
import { Public } from '../common/decorators/public.decorator'
import type { AuthUser } from '@ifmio/shared-types'

/**
 * Public portal endpoints — no JWT required, uses accessToken in URL.
 * All endpoints are scoped to the authenticated resident's data.
 */
@ApiTags('Portal (Public)')
@Controller('portal-public')
@Public()
export class PortalPublicController {
  constructor(
    private portal: PortalService,
    private access: PortalAccessService,
  ) {}

  private async auth(token: string): Promise<{ tenantId: string; residentId: string; residentName: string; propertyId: string | null }> {
    if (!token) throw new UnauthorizedException('Token je povinný')
    return this.access.validateToken(token)
  }

  private toAuthUser(ctx: { tenantId: string; residentId: string }): AuthUser {
    return { id: ctx.residentId, tenantId: ctx.tenantId, email: '', role: 'unit_owner' as any, name: '' }
  }

  @Get(':token/dashboard')
  @ApiOperation({ summary: 'Portál — přehled vlastníka' })
  async dashboard(@Param('token') token: string) {
    const ctx = await this.auth(token)
    const user = this.toAuthUser(ctx)
    const [units, prescriptions, konto, messages] = await Promise.all([
      this.portal.getMyUnits(user),
      this.portal.getMyPrescriptions(user),
      this.portal.getMyKonto(user),
      this.access.getMessages(ctx.tenantId, ctx.residentId),
    ])
    const unreadMessages = messages.filter(m => m.direction === 'outbound' && !m.isRead).length
    return {
      owner: { name: ctx.residentName },
      units,
      kontoBalance: konto.totalBalance,
      prescriptions: prescriptions.slice(0, 5),
      unreadMessages,
    }
  }

  @Get(':token/konto')
  @ApiOperation({ summary: 'Portál — stav konta' })
  async konto(@Param('token') token: string) {
    const ctx = await this.auth(token)
    return this.portal.getMyKonto(this.toAuthUser(ctx))
  }

  @Get(':token/prescriptions')
  @ApiOperation({ summary: 'Portál — předpisy' })
  async prescriptions(@Param('token') token: string) {
    const ctx = await this.auth(token)
    return this.portal.getMyPrescriptions(this.toAuthUser(ctx))
  }

  @Get(':token/documents')
  @ApiOperation({ summary: 'Portál — dokumenty' })
  async documents(@Param('token') token: string) {
    const ctx = await this.auth(token)
    return this.portal.getMyDocuments(this.toAuthUser(ctx))
  }

  @Get(':token/messages')
  @ApiOperation({ summary: 'Portál — zprávy' })
  async messages(@Param('token') token: string) {
    const ctx = await this.auth(token)
    return this.access.getMessages(ctx.tenantId, ctx.residentId)
  }

  @Post(':token/messages')
  @ApiOperation({ summary: 'Portál — odeslat zprávu správci' })
  async sendMessage(
    @Param('token') token: string,
    @Body() dto: { subject: string; body: string },
  ) {
    const ctx = await this.auth(token)
    return this.access.sendMessage(ctx.tenantId, ctx.residentId, dto.subject, dto.body, 'inbound', ctx.propertyId ?? undefined)
  }

  @Get(':token/meters')
  @ApiOperation({ summary: 'Portál — měřidla' })
  async meters(@Param('token') token: string) {
    const ctx = await this.auth(token)
    return this.portal.getMyMeters(this.toAuthUser(ctx))
  }

  @Get(':token/settlements')
  @ApiOperation({ summary: 'Portál — vyúčtování' })
  async settlements(@Param('token') token: string) {
    const ctx = await this.auth(token)
    return this.portal.getMySettlements(this.toAuthUser(ctx))
  }
}

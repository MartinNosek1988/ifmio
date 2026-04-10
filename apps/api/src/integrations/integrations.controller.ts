import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AresService } from './ares/ares.service';
import { CuzkService } from './cuzk/cuzk.service';
import { RuianService } from './ruian/ruian.service';
import { RuianLocalLookupService } from '../knowledge-base/ruian-vfr/ruian-local-lookup.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly ares: AresService,
    private readonly cuzk: CuzkService,
    private readonly ruian: RuianService,
    private readonly ruianLocal: RuianLocalLookupService,
  ) {}

  @Public()
  @Get('ares/ico')
  @ApiOperation({ summary: 'Lookup ARES subject by IČO' })
  async aresLookup(@Query('ico') ico: string) {
    if (!ico) throw new BadRequestException('Query parameter "ico" is required');
    return this.ares.findByIco(ico);
  }

  @Public()
  @Get('ares/search')
  @ApiOperation({ summary: 'Search ARES by company name' })
  async aresSearch(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    if (!q) throw new BadRequestException('Query parameter "q" is required');
    return this.ares.searchByName(q, limit ? parseInt(limit, 10) : 10);
  }

  @Get('cuzk/parcel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lookup ČÚZK parcel info' })
  async cuzkParcel(
    @Query('parcela') parcela: string,
    @Query('ku') ku: string,
    @CurrentUser() _user: AuthUser,
  ) {
    if (!parcela) throw new BadRequestException('Query parameter "parcela" is required');
    if (!ku) throw new BadRequestException('Query parameter "ku" is required');
    return this.cuzk.findParcel(parcela, ku);
  }

  @Public()
  @Get('ruian/address')
  @ApiOperation({ summary: 'RÚIAN address autocomplete (local DB → ArcGIS API fallback)' })
  async ruianAddress(@Query('q') q: string) {
    if (!q || q.length < 2) return [];

    // Try local RÚIAN database first (no API limit)
    const localAvailable = await this.ruianLocal.isAvailable();
    if (localAvailable) {
      const results = await this.ruianLocal.searchAddress(q, 8);
      if (results.length > 0) {
        return results.map(r => ({
          label: r.fullAddress,
          street: r.street || '',
          city: r.city,
          postalCode: r.postalCode || '',
          district: r.district,
          lat: r.lat,
          lng: r.lng,
          ruianCode: String(r.ruianCode),
        }));
      }
    }

    // Fallback to ČÚZK ArcGIS API
    if (q.length < 3) return [];
    return this.ruian.searchAddress(q);
  }
}

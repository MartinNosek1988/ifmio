import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AresService } from './ares/ares.service';
import { CuzkService } from './cuzk/cuzk.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly ares: AresService,
    private readonly cuzk: CuzkService,
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
}

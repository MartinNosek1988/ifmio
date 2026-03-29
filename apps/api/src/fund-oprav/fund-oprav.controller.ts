import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FundOpravService } from './fund-oprav.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FundOpravQueryDto } from './dto/fund-oprav.dto';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Fund Oprav')
@ApiBearerAuth()
@Controller('fund-oprav')
export class FundOpravController {
  constructor(private service: FundOpravService) {}

  @Get(':propertyId')
  @ApiOperation({ summary: 'Přehled fondu oprav nemovitosti' })
  getOverview(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query() query: FundOpravQueryDto,
  ) {
    return this.service.getOverview(user, propertyId, query.year);
  }

  @Get(':propertyId/entries')
  @ApiOperation({ summary: 'Pohyby fondu oprav' })
  getEntries(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getEntries(user, propertyId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
  }

  @Get(':propertyId/report')
  @ApiOperation({ summary: 'Roční výkaz fondu oprav' })
  getReport(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('year') year?: string,
  ) {
    return this.service.getReport(user, propertyId, year ? parseInt(year, 10) : new Date().getFullYear());
  }

  @Get(':propertyId/per-owner')
  @ApiOperation({ summary: 'Přehled fondu oprav per vlastník' })
  getPerOwner(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Query('year') year?: string,
  ) {
    return this.service.getPerOwner(user, propertyId, year ? parseInt(year, 10) : new Date().getFullYear());
  }
}

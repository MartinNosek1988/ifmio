import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Globální vyhledávání napříč entitami' })
  @ApiQuery({ name: 'q', required: true, description: 'Hledaný výraz' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max počet výsledků' })
  search(
    @CurrentUser() user: AuthUser,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.searchService.search(
      user.tenantId,
      q,
      Number.isFinite(parsedLimit) ? parsedLimit : 20,
    );
  }
}

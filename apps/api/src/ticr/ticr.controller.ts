import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicrImportService } from './ticr-import.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES_MANAGE } from '../common/constants/roles.constants';
import type { FastifyRequest } from 'fastify';

@ApiTags('TIČR Evidence')
@ApiBearerAuth()
@Controller('ticr')
export class TicrController {
  constructor(private importService: TicrImportService) {}

  @Post('import/upload')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Import TIČR z nahraného HTML souboru' })
  async importUpload(
    @Req() req: FastifyRequest,
    @Query('registryType') registryType?: string,
  ) {
    const data = await (req as any).file();
    if (!data) throw new BadRequestException('Nahrajte HTML soubor');

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const html = Buffer.concat(chunks).toString('utf-8');

    const type = registryType === 'RT' ? 'RT' : 'OZO';
    return this.importService.importFromHtml(html, type as 'OZO' | 'RT');
  }

  @Get('import/status')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Stav importu' })
  getImportStatus() {
    return { importing: this.importService.isImporting };
  }

  @Get('credentials')
  @ApiOperation({ summary: 'Seznam TIČR oprávnění' })
  search(
    @Query('deviceType') deviceType?: string,
    @Query('ico') ico?: string,
    @Query('search') search?: string,
    @Query('validOnly') validOnly?: string,
    @Query('registryType') registryType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.importService.search({
      deviceType,
      ico,
      search,
      registryType,
      validOnly: validOnly === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('credentials/:id')
  @ApiOperation({ summary: 'Detail TIČR oprávnění' })
  async getOne(@Param('id') id: string) {
    const cred = await this.importService.search({ search: id, limit: 1 });
    return cred.items[0] ?? null;
  }

  @Get('lookup/:ico')
  @ApiOperation({ summary: 'Oprávnění dle IČO (pro enrichment)' })
  lookup(@Param('ico') ico: string) {
    return this.importService.lookup(ico);
  }

  @Get('stats')
  @ApiOperation({ summary: 'TIČR statistiky' })
  stats() {
    return this.importService.getStats();
  }
}

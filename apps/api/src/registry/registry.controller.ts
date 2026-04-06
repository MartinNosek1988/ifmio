import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../common/decorators/public.decorator'
import { RegistryService } from './registry.service'

@ApiTags('Registry')
@Controller('registry')
export class RegistryController {
  constructor(private readonly service: RegistryService) {}

  @Get('persons/search')
  @Public()
  @ApiOperation({ summary: 'Hledat osoby v KB (veřejné)' })
  async searchPersons(
    @Query('q') q?: string,
    @Query('rok') rok?: string,
  ) {
    if (!q || q.length < 2) return []
    return this.service.searchPersons(q, rok ? parseInt(rok, 10) : undefined)
  }

  @Get('persons/:id')
  @Public()
  @ApiOperation({ summary: 'Profil osoby z KB (veřejný)' })
  async getPersonProfile(@Param('id') id: string) {
    const result = await this.service.getPersonProfile(id)
    if (!result) throw new NotFoundException('Osoba nenalezena')
    return result
  }

  @Get('organizations/:ico')
  @Public()
  @ApiOperation({ summary: 'Profil organizace z KB (veřejný)' })
  async getOrganizationProfile(@Param('ico') ico: string) {
    const result = await this.service.getOrganizationProfile(ico)
    if (!result) throw new NotFoundException('Organizace nenalezena')
    return result
  }

  @Get('organizations/:ico/persons')
  @Public()
  @ApiOperation({ summary: 'Osoby angažované v organizaci (veřejné)' })
  async getOrganizationPersons(@Param('ico') ico: string) {
    return this.service.getOrganizationPersons(ico)
  }
}

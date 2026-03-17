import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PartyService } from './party.service'
import { CreatePartyDto } from './dto/create-party.dto'
import { UpdatePartyDto } from './dto/update-party.dto'
import { PartyQueryDto } from './dto/party-query.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Parties')
@ApiBearerAuth()
@Controller('parties')
export class PartyController {
  constructor(private service: PartyService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam subjektů' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PartyQueryDto) {
    return this.service.findAll(user.tenantId, query)
  }

  @Get('search')
  @ApiOperation({ summary: 'Rychlé vyhledávání subjektů' })
  search(@CurrentUser() user: AuthUser, @Query('q') q: string) {
    return this.service.search(user.tenantId, q || '')
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail subjektu' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Vytvořit subjekt' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePartyDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @ApiOperation({ summary: 'Upravit subjekt' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @Roles('tenant_owner', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deaktivovat subjekt' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.remove(user.tenantId, id)
  }
}

import {
  Controller, Get, Post, Patch, Put, Delete,
  Param, Body, Req, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { FloorPlansService } from './floor-plans.service'
import { UpdateZonesDto } from './dto/update-zones.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_WRITE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'
import type { FastifyRequest } from 'fastify'

@ApiTags('FloorPlans')
@ApiBearerAuth()
@Controller('floor-plans')
export class FloorPlansController {
  constructor(private service: FloorPlansService) {}

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Seznam půdorysů pro nemovitost' })
  findByProperty(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    return this.service.findByProperty(user.tenantId, propertyId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail půdorysu se zónami' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Vytvořit půdorys (upload obrázku)' })
  async create(@CurrentUser() user: AuthUser, @Req() req: FastifyRequest) {
    const data = await req.file()
    if (!data) throw new Error('Soubor nebyl nahrán')

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    const fields: Record<string, string> = {}
    for (const [key, field] of Object.entries(data.fields)) {
      if (field && typeof field === 'object' && 'value' in field) {
        fields[key] = (field as any).value
      }
    }

    return this.service.create(user.tenantId, {
      propertyId: fields.propertyId,
      floor: parseInt(fields.floor, 10),
      label: fields.label || undefined,
      sortOrder: fields.sortOrder ? parseInt(fields.sortOrder, 10) : undefined,
    }, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
    })
  }

  @Patch(':id')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Upravit metadata půdorysu' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { label?: string; floor?: number; sortOrder?: number },
  ) {
    return this.service.update(user.tenantId, id, body)
  }

  @Delete(':id')
  @Roles(...ROLES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat půdorys' })
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.delete(user.tenantId, id)
  }

  @Put(':id/zones')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Uložit zóny půdorysu (bulk save)' })
  saveZones(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateZonesDto,
  ) {
    return this.service.saveZones(user.tenantId, id, dto)
  }

  @Put(':id/image')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Nahradit obrázek půdorysu' })
  async uploadImage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: FastifyRequest) {
    const data = await req.file()
    if (!data) throw new Error('Soubor nebyl nahrán')

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    return this.service.uploadImage(user.tenantId, id, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
    })
  }
}

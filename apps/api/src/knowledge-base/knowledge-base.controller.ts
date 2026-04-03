import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator'
import { KnowledgeBaseService } from './knowledge-base.service'
import { PropertyEnrichmentOrchestrator } from './property-enrichment.orchestrator'
import { PrismaService } from '../prisma/prisma.service'

class EnrichAddressDto {
  @IsString() @IsNotEmpty() city!: string
  @IsString() @IsOptional() street?: string
  @IsString() @IsOptional() district?: string
  @IsString() @IsOptional() postalCode?: string
  @IsString() @IsOptional() houseNumber?: string
  @IsNumber() @IsOptional() lat?: number
  @IsNumber() @IsOptional() lng?: number
  @IsString() @IsOptional() ruianCode?: string
}

const VALID_ORG_TYPES = ['SVJ', 'BD', 'SRO', 'AS', 'MUNICIPALITY', 'STATE_ORG', 'OTHER_ORG']

@ApiTags('KnowledgeBase')
@ApiBearerAuth()
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(
    private kb: KnowledgeBaseService,
    private orchestrator: PropertyEnrichmentOrchestrator,
    private prisma: PrismaService,
  ) {}

  @Post('enrich')
  @ApiOperation({ summary: 'Enrichment z adresy — RÚIAN→ARES→ČÚZK chain' })
  async enrichFromAddress(@Body() body: EnrichAddressDto) {
    return this.orchestrator.enrichFromAddress(body)
  }

  @Get('stats')
  @ApiOperation({ summary: 'KB statistiky' })
  async getStats() {
    return this.kb.getStats()
  }

  @Get('buildings')
  @ApiOperation({ summary: 'Hledat budovy v KB' })
  async searchBuildings(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = Math.min(Number(limit) || 20, 100)
    const skip = Math.max(Number(offset) || 0, 0)

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { street: { contains: q, mode: 'insensitive' } },
        { fullAddress: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (district) where.district = { contains: district, mode: 'insensitive' }

    const [data, total] = await Promise.all([
      this.prisma.building.findMany({
        where: where as any,
        take,
        skip,
        orderBy: { dataQualityScore: 'desc' },
        include: { managingOrg: { select: { ico: true, name: true, orgType: true } } },
      }),
      this.prisma.building.count({ where: where as any }),
    ])

    return { data, total, limit: take, offset: skip }
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Detail budovy z KB' })
  async getBuilding(@Param('id') id: string) {
    return this.prisma.building.findUniqueOrThrow({
      where: { id },
      include: {
        units: true,
        managingOrg: true,
        sources: { orderBy: { fetchedAt: 'desc' }, take: 10 },
        // Don't include properties — leaks tenantId across tenants
      },
    })
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Hledat organizace v KB' })
  async searchOrganizations(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Number(limit) || 20, 100)

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { ico: { startsWith: q } },
      ]
    }
    // Validate type against enum
    if (type && VALID_ORG_TYPES.includes(type)) where.orgType = type

    return this.prisma.kbOrganization.findMany({
      where: where as any,
      take,
      orderBy: { name: 'asc' },
    })
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Detail organizace z KB' })
  async getOrganization(@Param('id') id: string) {
    return this.prisma.kbOrganization.findUniqueOrThrow({
      where: { id },
      include: {
        managedBuildings: { select: { id: true, street: true, city: true } },
        statutoryBodies: true,
        sources: { orderBy: { fetchedAt: 'desc' }, take: 10 },
      },
    })
  }
}

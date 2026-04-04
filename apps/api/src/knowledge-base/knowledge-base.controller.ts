import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Res, BadRequestException } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator'
import { KnowledgeBaseService } from './knowledge-base.service'
import { PropertyEnrichmentOrchestrator } from './property-enrichment.orchestrator'
import { BuildingIntelligenceService } from './building-intelligence.service'
import { BulkImportService, type BulkImportStep } from './bulk-import.service'
import { TerritorySeedService } from './territory-seed.service'
import { PrismaService } from '../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { Public } from '../common/decorators/public.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import { SuperAdminService } from '../super-admin/super-admin.service'
import type { AuthUser } from '@ifmio/shared-types'

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

class BulkImportDto {
  @IsString() @IsNotEmpty() region!: string
  @IsString() @IsOptional() district?: string
  @IsString() @IsOptional() cadastralCode?: string
  @IsIn(['RUIAN', 'ARES', 'ENRICHMENT', 'JUSTICE', 'FULL']) step!: BulkImportStep
}

class FullImportDto {
  @IsString() @IsNotEmpty() region!: string
  @IsString() @IsOptional() district?: string
}

class CreateEvidenceTaskDto {
  @IsString() @IsNotEmpty() region!: string
  @IsString() @IsOptional() district?: string
  @IsString() @IsOptional() cadastralArea?: string
  @IsString() @IsOptional() assigneeId?: string
  @IsString() @IsOptional() assigneeName?: string
  @IsNumber() targetCount!: number
  @IsString() @IsOptional() deadline?: string
  @IsString() @IsOptional() note?: string
}

class UpdateEvidenceTaskDto {
  @IsString() @IsOptional() assigneeId?: string
  @IsString() @IsOptional() assigneeName?: string
  @IsNumber() @IsOptional() targetCount?: number
  @IsString() @IsOptional() deadline?: string
  @IsString() @IsOptional() note?: string
  @IsIn(['ACTIVE', 'COMPLETED', 'PAUSED']) @IsOptional() status?: string
}

const VALID_ORG_TYPES = ['SVJ', 'BD', 'SRO', 'AS', 'MUNICIPALITY', 'STATE_ORG', 'OTHER_ORG']

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

@ApiTags('KnowledgeBase')
@ApiBearerAuth()
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(
    private kb: KnowledgeBaseService,
    private orchestrator: PropertyEnrichmentOrchestrator,
    private intelligence: BuildingIntelligenceService,
    private bulkImport: BulkImportService,
    private prisma: PrismaService,
    private config: ConfigService,
    private superAdmin: SuperAdminService,
    private territorySeed: TerritorySeedService,
  ) {}

  @Post('enrich')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Enrichment z adresy — RÚIAN→ARES→ČÚZK chain' })
  async enrichFromAddress(@Body() body: EnrichAddressDto) {
    return this.orchestrator.enrichFromAddress(body)
  }

  @Get('stats')
  @ApiOperation({ summary: 'KB statistiky' })
  async getStats() {
    return this.kb.getStats()
  }

  @Get('stats/territory-coverage')
  @ApiOperation({ summary: 'Coverage tree — počet budov a avg quality per territory' })
  async getTerritoryCoverage(@Query('parentId') parentId?: string) {
    const where = parentId ? { parentId } : { level: 'REGION' as const }

    const territories = await this.prisma.territory.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      select: {
        id: true, code: true, name: true, level: true,
        _count: { select: { children: true } },
      },
    })

    // TODO: N+1 query — optimize with recursive CTE for large datasets (OK for now, max 77 okresů)
    return Promise.all(territories.map(async t => {
      const descendantIds = await this.getDescendantTerritoryIds(t.id)
      const stats = await this.prisma.building.aggregate({
        where: { territoryId: { in: descendantIds } },
        _count: { _all: true },
        _avg: { dataQualityScore: true },
      })
      return {
        id: t.id,
        code: t.code,
        name: t.name,
        level: t.level,
        buildingCount: stats._count._all,
        avgQuality: Math.round(stats._avg.dataQualityScore || 0),
        hasChildren: t._count.children > 0,
      }
    }))
  }

  // ── Territory endpoints ─────────────────────────────

  @Get('territories')
  @ApiOperation({ summary: 'Kaskádový seznam území (level + parentId/parentCode)' })
  async getTerritories(
    @Query('level') level?: string,
    @Query('parentId') parentId?: string,
    @Query('parentCode') parentCode?: string,
    @Query('q') q?: string,
  ) {
    const where: Record<string, unknown> = {}
    if (level) where.level = level
    if (parentId) where.parentId = parentId
    if (parentCode) {
      const parent = await this.prisma.territory.findUnique({ where: { code: parentCode } })
      if (parent) where.parentId = parent.id
    }
    if (q) where.nameNormalized = { contains: removeDiacritics(q), mode: 'insensitive' }

    return this.prisma.territory.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      select: {
        id: true, code: true, name: true, level: true, parentId: true,
        population: true, lat: true, lng: true, isCity: true, hasDistricts: true,
        _count: { select: { buildings: true, children: true } },
      },
    })
  }

  @Get('territories/:code/tree')
  @ApiOperation({ summary: 'Strom území od daného uzlu (depth=1-3)' })
  async getTerritoryTree(@Param('code') code: string, @Query('depth') depth?: string) {
    const maxDepth = Math.min(Number(depth) || 2, 3)
    const includeChildren = (d: number): any =>
      d <= 0 ? false : {
        orderBy: { name: 'asc' as const },
        include: { children: includeChildren(d - 1), _count: { select: { buildings: true } } },
      }

    return this.prisma.territory.findUnique({
      where: { code },
      include: {
        children: includeChildren(maxDepth),
        _count: { select: { buildings: true } },
      },
    })
  }

  @Get('territories/:code/breadcrumb')
  @ApiOperation({ summary: 'Cesta od území ke státu' })
  async getTerritoryBreadcrumb(@Param('code') code: string) {
    const parts: Array<{ code: string; name: string; level: string }> = []
    let current = await this.prisma.territory.findUnique({ where: { code } })
    while (current) {
      parts.unshift({ code: current.code, name: current.name, level: current.level })
      current = current.parentId
        ? await this.prisma.territory.findUnique({ where: { id: current.parentId } })
        : null
    }
    return parts
  }

  @Post('territories/seed')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Seed územní hierarchie z RÚIAN (super admin)' })
  async seedTerritories(@CurrentUser() user: AuthUser) {
    this.superAdmin.assertSuperAdmin(user.email)
    return this.territorySeed.seed()
  }

  @Post('territories/seed-obce/:okresCode')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Seed obcí pro daný okres z RÚIAN' })
  async seedObceForOkres(
    @CurrentUser() user: AuthUser,
    @Param('okresCode') okresCode: string,
  ) {
    this.superAdmin.assertSuperAdmin(user.email)
    const created = await this.territorySeed.seedObceForOkres(okresCode)
    return { created }
  }

  // ── Building endpoints ─────────────────────────────

  @Get('buildings/map-points')
  @ApiOperation({ summary: 'Lightweight body data pro mapu' })
  async getBuildingMapPoints(
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('territoryId') territoryId?: string,
    @Query('minQuality') minQuality?: string,
    @Query('hasOrganization') hasOrg?: string,
  ) {
    const where: Record<string, unknown> = { lat: { not: null }, lng: { not: null } }
    if (territoryId) {
      const ids = await this.getDescendantTerritoryIds(territoryId)
      where.territoryId = { in: ids }
    } else {
      if (city) where.city = { equals: city, mode: 'insensitive' }
      if (district) where.district = { equals: district, mode: 'insensitive' }
    }
    if (minQuality) { const n = Number(minQuality); if (!Number.isNaN(n)) where.dataQualityScore = { gte: n } }
    if (hasOrg === 'true') where.managingOrgId = { not: null }

    return this.prisma.building.findMany({
      where: where as any,
      select: {
        id: true, lat: true, lng: true, street: true, houseNumber: true,
        district: true, dataQualityScore: true, managingOrgId: true,
      },
      take: 10000,
    }).then(rows => rows.map(r => ({
      id: r.id, lat: r.lat, lng: r.lng,
      street: r.street, houseNumber: r.houseNumber, district: r.district,
      quality: r.dataQualityScore || 0, hasOrg: !!r.managingOrgId,
    })))
  }

  @Get('buildings/filter-options')
  @ApiOperation({ summary: 'Kaskádové filtrační hodnoty pro budovy' })
  async getBuildingFilterOptions(
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('quarter') quarter?: string,
    @Query('street') street?: string,
    @Query('houseNumber') houseNumber?: string,
    @Query('territoryId') territoryId?: string,
  ) {
    const base: Record<string, unknown> = {}
    if (territoryId) {
      const ids = await this.getDescendantTerritoryIds(territoryId)
      base.territoryId = { in: ids }
    } else {
      if (city) base.city = { equals: city, mode: 'insensitive' }
      if (district) base.district = { equals: district, mode: 'insensitive' }
      if (quarter) base.quarter = { equals: quarter, mode: 'insensitive' }
    }
    if (street) base.street = { equals: street, mode: 'insensitive' }
    if (houseNumber) base.houseNumber = houseNumber

    const hasScope = !!(territoryId || city || district || quarter)
    const [streets, houseNumbers, orientationNumbers] = await Promise.all([
      hasScope ? this.prisma.building.findMany({ where: { ...base, street: { not: null } } as any, select: { street: true }, distinct: ['street'], orderBy: { street: 'asc' }, take: 500 }) : Promise.resolve([]),
      street ? this.prisma.building.findMany({ where: { ...base, houseNumber: { not: null } } as any, select: { houseNumber: true }, distinct: ['houseNumber'], orderBy: { houseNumber: 'asc' }, take: 200 }) : Promise.resolve([]),
      (street && houseNumber) ? this.prisma.building.findMany({ where: { ...base, orientationNumber: { not: null } } as any, select: { orientationNumber: true }, distinct: ['orientationNumber'], orderBy: { orientationNumber: 'asc' }, take: 100 }) : Promise.resolve([]),
    ])

    return {
      streets: streets.map(s => s.street).filter(Boolean),
      houseNumbers: houseNumbers.map(h => h.houseNumber).filter(Boolean),
      orientationNumbers: orientationNumbers.map(o => o.orientationNumber).filter(Boolean),
    }
  }

  @Get('buildings')
  @ApiOperation({ summary: 'Hledat budovy v KB' })
  async searchBuildings(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('quarter') quarter?: string,
    @Query('territoryId') territoryId?: string,
    @Query('street') streetFilter?: string,
    @Query('houseNumber') houseNumber?: string,
    @Query('orientationNumber') orientationNumber?: string,
    @Query('buildingType') buildingType?: string,
    @Query('minQuality') minQuality?: string,
    @Query('maxQuality') maxQuality?: string,
    @Query('hasOrganization') hasOrganization?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
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
        { managingOrg: { name: { contains: q, mode: 'insensitive' } } },
        { managingOrg: { ico: { startsWith: q } } },
      ]
    }
    if (territoryId) {
      const ids = await this.getDescendantTerritoryIds(territoryId)
      where.territoryId = { in: ids }
    } else {
      if (city) where.city = { equals: city, mode: 'insensitive' }
      if (district) where.district = { equals: district, mode: 'insensitive' }
      if (quarter) where.quarter = { equals: quarter, mode: 'insensitive' }
    }
    if (streetFilter) where.street = { equals: streetFilter, mode: 'insensitive' }
    if (houseNumber) where.houseNumber = houseNumber
    if (orientationNumber) where.orientationNumber = orientationNumber
    if (buildingType) where.buildingType = buildingType
    if (minQuality) { const n = Number(minQuality); if (!Number.isNaN(n)) where.dataQualityScore = { ...((where.dataQualityScore as any) || {}), gte: n } }
    if (maxQuality) { const n = Number(maxQuality); if (!Number.isNaN(n)) where.dataQualityScore = { ...((where.dataQualityScore as any) || {}), lte: n } }
    if (hasOrganization === 'true') where.managingOrgId = { not: null }
    if (hasOrganization === 'false') where.managingOrgId = null

    const validSortFields = ['dataQualityScore', 'city', 'district', 'street', 'houseNumber', 'orientationNumber', 'lastEnrichedAt', 'createdAt']
    const sortField = validSortFields.includes(sort || '') ? sort! : 'dataQualityScore'
    const sortOrder = order === 'asc' ? 'asc' as const : 'desc' as const

    const [data, total] = await Promise.all([
      this.prisma.building.findMany({
        where: where as any,
        take,
        skip,
        orderBy: { [sortField]: sortOrder },
        include: {
          managingOrg: { select: { ico: true, name: true, orgType: true } },
          _count: { select: { units: true } },
        },
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
        managingOrg: {
          include: {
            statutoryBodies: { orderBy: { createdAt: 'desc' } },
            registryChanges: { orderBy: { changeDate: 'desc' }, take: 30 },
            sbirkaListiny: { orderBy: { filingDate: 'desc' }, take: 30 },
          },
        },
        sources: { orderBy: { fetchedAt: 'desc' }, take: 10 },
      },
    })
  }

  @Delete('buildings/purge')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Smazat VŠECHNY budovy z KB (super admin only, pro reimport)' })
  async purgeAllBuildings(
    @CurrentUser() user: AuthUser,
    @Body() body: { confirm?: string },
  ) {
    this.superAdmin.assertSuperAdmin(user.email)
    if (body?.confirm !== 'DELETE ALL BUILDINGS') {
      throw new BadRequestException('Vyžadován potvrzovací parametr: { "confirm": "DELETE ALL BUILDINGS" }')
    }

    return this.prisma.$transaction(async (tx) => {
      // Unlink properties & units before deleting (no cascade on these FKs)
      await tx.property.updateMany({ where: { buildingId: { not: null } }, data: { buildingId: null } })
      await tx.unit.updateMany({ where: { buildingUnitId: { not: null } }, data: { buildingUnitId: null } })
      // BuildingSource, BuildingUnit (+ children) have onDelete: Cascade from Building
      await tx.buildingSource.deleteMany({})
      const result = await tx.building.deleteMany({})
      return { deleted: result.count }
    })
  }

  @Delete('buildings/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Smazat budovu z KB (cascade: units, sources, ownerships)' })
  async deleteBuilding(@Param('id') id: string) {
    await this.prisma.building.delete({ where: { id } })
    return { deleted: true }
  }

  @Get('ortofoto')
  @Public()
  @ApiOperation({ summary: 'Proxy ČÚZK ortofoto (bypasses CORS)' })
  async getOrtofoto(@Query('lat') lat: string, @Query('lng') lng: string, @Res() res: FastifyReply) {
    const latN = Number(lat)
    const lngN = Number(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      return res.status(400).send('Invalid coordinates')
    }
    const r = 80
    const dLat = r / 111320
    const dLng = r / (111320 * Math.cos(latN * Math.PI / 180))
    const url = `https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/export?bbox=${lngN - dLng},${latN - dLat},${lngN + dLng},${latN + dLat}&size=600,400&format=png&f=image&bboxSR=4326&imageSR=4326`
    try {
      const imgRes = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!imgRes.ok) return res.status(502).send('ČÚZK unavailable')
      const buffer = Buffer.from(await imgRes.arrayBuffer())
      return res.header('Content-Type', 'image/png').header('Cache-Control', 'public, max-age=86400').send(buffer)
    } catch {
      return res.status(502).send('ČÚZK timeout')
    }
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
        registryChanges: { orderBy: { changeDate: 'desc' }, take: 20 },
        sbirkaListiny: { orderBy: { filingDate: 'desc' }, take: 30 },
      },
    })
  }

  @Get('properties/:id/qr')
  @ApiOperation({ summary: 'QR kód pro portál nemovitosti' })
  async getPropertyQR(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // Verify tenant owns the property
    await this.prisma.withTenant().property.findUniqueOrThrow({
      where: { id, tenantId: user.tenantId },
      select: { id: true },
    })
    const baseUrl = this.config.get('FRONTEND_URL') || this.config.get('CORS_ORIGIN') || 'https://ifmio.com'
    const qrDataUrl = await this.intelligence.generateQR(id, baseUrl)
    return { qrDataUrl, portalUrl: `${baseUrl}/portal/${id}` }
  }

  @Get('properties/:id/welcome-pack')
  @ApiOperation({ summary: 'Welcome Pack HTML pro tisk' })
  async getWelcomePack(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const property = await this.prisma.withTenant().property.findUniqueOrThrow({
      where: { id, tenantId: user.tenantId },
      select: { name: true, address: true, city: true, postalCode: true, ico: true, contactName: true, contactEmail: true, contactPhone: true },
    })
    const baseUrl = this.config.get('FRONTEND_URL') || 'https://ifmio.com'
    const qrDataUrl = await this.intelligence.generateQR(id, baseUrl)
    const mapped = { ...property, ico: property.ico ?? undefined, contactName: property.contactName ?? undefined, contactEmail: property.contactEmail ?? undefined, contactPhone: property.contactPhone ?? undefined, postalCode: property.postalCode ?? undefined }
    const html = this.intelligence.generateWelcomePackHtml(mapped, qrDataUrl)
    return { html }
  }

  // ── Admin: Coverage Stats ─────────────────────────────

  @Get('stats/coverage')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Pokrytí KB — per district, quality breakdown' })
  async getCoverage(@Query('city') city?: string) {
    const cityFilter = city ? { city: { contains: city, mode: 'insensitive' as const } } : {}

    const [districts, qualityRaw, total, withOrg] = await Promise.all([
      this.prisma.building.groupBy({
        by: ['district'],
        where: cityFilter as any,
        _count: true,
        _avg: { dataQualityScore: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      city
        ? this.prisma.$queryRaw<Array<{ quality_level: string; count: bigint }>>`
            SELECT
              CASE
                WHEN "dataQualityScore" >= 80 THEN 'excellent'
                WHEN "dataQualityScore" >= 50 THEN 'good'
                WHEN "dataQualityScore" >= 20 THEN 'basic'
                ELSE 'empty'
              END as quality_level,
              COUNT(*) as count
            FROM kb_buildings
            WHERE city ILIKE ${'%' + city + '%'}
            GROUP BY quality_level`
        : this.prisma.$queryRaw<Array<{ quality_level: string; count: bigint }>>`
            SELECT
              CASE
                WHEN "dataQualityScore" >= 80 THEN 'excellent'
                WHEN "dataQualityScore" >= 50 THEN 'good'
                WHEN "dataQualityScore" >= 20 THEN 'basic'
                ELSE 'empty'
              END as quality_level,
              COUNT(*) as count
            FROM kb_buildings
            GROUP BY quality_level`,
      this.prisma.building.count({ where: cityFilter as any }),
      this.prisma.building.count({
        where: { ...cityFilter, managingOrgId: { not: null } } as any,
      }),
    ])

    const qualityBreakdown = qualityRaw.map(q => ({
      level: q.quality_level,
      count: Number(q.count),
    }))

    return { total, withOrganization: withOrg, districts, qualityBreakdown }
  }

  // ── Admin: Bulk Import ────────────────────────────────

  @Post('bulk-import')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Spustit bulk import' })
  async startBulkImport(@Body() body: BulkImportDto) {
    return this.bulkImport.startImport(body)
  }

  @Get('bulk-import/jobs')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Seznam všech import jobů' })
  async listImportJobs() {
    return this.bulkImport.listJobs()
  }

  @Get('bulk-import/:jobId')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Stav import jobu' })
  async getImportStatus(@Param('jobId') jobId: string) {
    const job = this.bulkImport.getJobStatus(jobId)
    if (!job) return { error: 'Job not found' }
    return job
  }

  @Post('bulk-import/:jobId/pause')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Pozastavit import job' })
  async pauseImport(@Param('jobId') jobId: string) {
    const ok = this.bulkImport.pauseJob(jobId)
    return { status: ok ? 'paused' : 'not_found' }
  }

  @Post('bulk-import/:jobId/resume')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Pokračovat v import jobu' })
  async resumeImport(@Param('jobId') jobId: string) {
    const ok = this.bulkImport.resumeJob(jobId)
    return { status: ok ? 'resumed' : 'not_found' }
  }

  @Post('bulk-import/full')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Spustit kompletní sekvenční import (RÚIAN→ARES→Enrich→Justice per budova)' })
  async startFullImport(@Body() body: FullImportDto) {
    return this.bulkImport.startImport({ region: body.region, district: body.district, step: 'FULL' })
  }

  // ── Admin: Evidence Tasks ─────────────────────────────

  @Get('evidence-tasks')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Seznam evidence tasků' })
  async listEvidenceTasks(@Query('status') status?: string) {
    const where: Record<string, unknown> = {}
    if (status && ['ACTIVE', 'COMPLETED', 'PAUSED'].includes(status)) {
      where.status = status
    }
    return this.prisma.kbEvidenceTask.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    })
  }

  @Post('evidence-tasks')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Vytvořit evidence task' })
  async createEvidenceTask(@Body() body: CreateEvidenceTaskDto) {
    return this.prisma.kbEvidenceTask.create({
      data: {
        region: body.region,
        district: body.district,
        cadastralArea: body.cadastralArea,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
        targetCount: body.targetCount,
        deadline: body.deadline ? new Date(body.deadline) : null,
        note: body.note,
      },
    })
  }

  @Patch('evidence-tasks/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Upravit evidence task' })
  async updateEvidenceTask(@Param('id') id: string, @Body() body: UpdateEvidenceTaskDto) {
    const data: Record<string, unknown> = {}
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId
    if (body.assigneeName !== undefined) data.assigneeName = body.assigneeName
    if (body.targetCount !== undefined) data.targetCount = body.targetCount
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
    if (body.note !== undefined) data.note = body.note
    if (body.status !== undefined) data.status = body.status

    return this.prisma.kbEvidenceTask.update({
      where: { id },
      data: data as any,
    })
  }

  @Delete('evidence-tasks/:id')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Smazat evidence task' })
  async deleteEvidenceTask(@Param('id') id: string) {
    await this.prisma.kbEvidenceTask.delete({ where: { id } })
    return { deleted: true }
  }

  @Post('evidence-tasks/:id/recalculate')
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Přepočítat progress evidence tasku' })
  async recalculateTaskProgress(@Param('id') id: string) {
    const task = await this.prisma.kbEvidenceTask.findUniqueOrThrow({ where: { id } })

    const where: Record<string, unknown> = {
      dataQualityScore: { gte: 70 },
    }
    if (task.region) where.city = { contains: task.region, mode: 'insensitive' }
    if (task.district) where.district = { contains: task.district, mode: 'insensitive' }
    if (task.cadastralArea) where.cadastralTerritoryName = { contains: task.cadastralArea, mode: 'insensitive' }

    const currentCount = await this.prisma.building.count({ where: where as any })

    return this.prisma.kbEvidenceTask.update({
      where: { id },
      data: {
        currentCount,
        status: currentCount >= task.targetCount ? 'COMPLETED' : task.status,
      },
    })
  }

  // ── Helpers ───────────────────────────────────────────

  /**
   * Recursively resolve territory + all descendant IDs for filtering.
   * Max 3 levels deep to prevent runaway queries.
   */
  private async getDescendantTerritoryIds(territoryId: string): Promise<string[]> {
    const ids = [territoryId]
    let currentLevel = [territoryId]
    for (let depth = 0; depth < 4 && currentLevel.length > 0; depth++) {
      const children = await this.prisma.territory.findMany({
        where: { parentId: { in: currentLevel } },
        select: { id: true },
      })
      const childIds = children.map(c => c.id)
      ids.push(...childIds)
      currentLevel = childIds
    }
    return ids
  }
}

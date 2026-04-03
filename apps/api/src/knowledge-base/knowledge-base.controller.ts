import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator'
import { Prisma } from '@prisma/client'
import { KnowledgeBaseService } from './knowledge-base.service'
import { PropertyEnrichmentOrchestrator } from './property-enrichment.orchestrator'
import { BuildingIntelligenceService } from './building-intelligence.service'
import { BulkImportService, type BulkImportStep } from './bulk-import.service'
import { PrismaService } from '../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
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
}

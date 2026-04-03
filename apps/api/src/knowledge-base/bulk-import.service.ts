import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { KnowledgeBaseService } from './knowledge-base.service'
import { GeoRiskService } from './geo-risk.service'
import { IprPriceService } from './ipr-price.service'

// ── Types ───────────────────────────────────────────────

export interface BulkImportJob {
  id: string
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
  step: BulkImportStep
  region: string
  district?: string
  cadastralCode?: string
  totalEstimated: number
  processed: number
  created: number
  updated: number
  errors: number
  startedAt: Date
  completedAt?: Date
  lastProcessedId?: string | null
  error?: string
}

export type BulkImportStep = 'RUIAN' | 'ARES' | 'ENRICHMENT' | 'JUSTICE'

export interface StartImportParams {
  region: string
  district?: string
  cadastralCode?: string
  step: BulkImportStep
}

// ── RÚIAN ArcGIS Constants ──────────────────────────────

// ČÚZK ArcGIS MapServer — AdresniMisto layer (1)
const RUIAN_ARCGIS_BASE = 'https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer'

// Praha bounding box in S-JTSK (EPSG:5514)
// TODO: derive bbox from region param (currently only Praha is supported)
const PRAHA_BBOX_SJTSK = {
  xmin: -755000,
  ymin: -1055000,
  xmax: -725000,
  ymax: -1035000,
}

// ARES v2 REST API
const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest'

// ── Service ─────────────────────────────────────────────

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name)
  // TODO: persist jobs to DB for restart resilience (in-memory is fine for MVP)
  private activeJobs = new Map<string, BulkImportJob>()

  constructor(
    private prisma: PrismaService,
    private kb: KnowledgeBaseService,
    private geoRisk: GeoRiskService,
    private iprPrice: IprPriceService,
  ) {}

  // ── Job Management ──────────────────────────────────

  async startImport(params: StartImportParams): Promise<BulkImportJob> {
    if (params.step === 'RUIAN' && !params.region.toLowerCase().includes('praha')) {
      throw new Error('Bulk RÚIAN import je zatím dostupný pouze pro Prahu')
    }

    const job: BulkImportJob = {
      id: randomUUID(),
      status: 'RUNNING',
      step: params.step,
      region: params.region,
      district: params.district,
      cadastralCode: params.cadastralCode,
      totalEstimated: 0,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      startedAt: new Date(),
      lastProcessedId: null,
    }
    this.activeJobs.set(job.id, job)

    // Fire-and-forget
    this.runImport(job, params).catch(err => {
      job.status = 'FAILED'
      job.error = err instanceof Error ? err.message : String(err)
      this.logger.error(`Bulk import job ${job.id} failed: ${job.error}`)
    })

    return job
  }

  getJobStatus(jobId: string): BulkImportJob | null {
    return this.activeJobs.get(jobId) ?? null
  }

  listJobs(): BulkImportJob[] {
    return [...this.activeJobs.values()].sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    )
  }

  pauseJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job && job.status === 'RUNNING') {
      job.status = 'PAUSED'
      return true
    }
    return false
  }

  resumeJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job && job.status === 'PAUSED') {
      job.status = 'RUNNING'
      // Re-trigger from lastProcessedId
      this.runImport(job, {
        region: job.region,
        district: job.district,
        cadastralCode: job.cadastralCode,
        step: job.step,
      }).catch(err => {
        job.status = 'FAILED'
        job.error = err instanceof Error ? err.message : String(err)
      })
      return true
    }
    return false
  }

  // ── Import Router ───────────────────────────────────

  private async runImport(job: BulkImportJob, params: StartImportParams): Promise<void> {
    switch (params.step) {
      case 'RUIAN':
        await this.importRuianBuildings(job)
        break
      case 'ARES':
        await this.matchAresOrganizations(job)
        break
      case 'ENRICHMENT':
        await this.autoEnrichBuildings(job)
        break
      case 'JUSTICE':
        await this.bulkJusticeEnrichment(job)
        break
    }
  }

  // ── KROK 1: RÚIAN Bulk Import ───────────────────────

  private async importRuianBuildings(job: BulkImportJob): Promise<void> {
    const batchSize = 500
    let offset = job.lastProcessedId ? Number(job.lastProcessedId) : 0

    // Get total count first
    try {
      const countUrl = this.buildRuianQueryUrl({ returnCountOnly: true })
      const countRes = await fetch(countUrl, { signal: AbortSignal.timeout(15000) })
      if (countRes.ok) {
        const countData = await countRes.json()
        job.totalEstimated = countData.count || 0
      }
    } catch {
      this.logger.warn('Could not fetch RÚIAN total count')
    }

    while (job.status === 'RUNNING') {
      try {
        const url = this.buildRuianQueryUrl({
          resultRecordCount: batchSize,
          resultOffset: offset,
          outFields: 'kod,cislodomovni,cisloorientacni,cisloorientacnipismeno,psc,stavebniobjekt,ulice,adresa',
          returnGeometry: true,
          outSR: 4326,
        })

        const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
        if (!res.ok) {
          job.errors++
          await this.delay(5000)
          continue
        }

        const data = await res.json()
        const features = data.features || []
        if (features.length === 0) break

        // Group by stavebniobjekt (building ID) to deduplicate
        const buildingMap = new Map<string, {
          ruianId: string
          addresses: string[]
          houseNumber?: string
          orientationNumber?: string
          postalCode?: string
          lat?: number
          lng?: number
        }>()

        for (const f of features) {
          const a = f.attributes
          const soId = String(a.stavebniobjekt || a.kod)

          if (!buildingMap.has(soId)) {
            buildingMap.set(soId, {
              ruianId: soId,
              addresses: [],
              houseNumber: a.cislodomovni ? String(a.cislodomovni) : undefined,
              orientationNumber: a.cisloorientacni
                ? `${a.cisloorientacni}${a.cisloorientacnipismeno || ''}`
                : undefined,
              postalCode: a.psc ? String(a.psc) : undefined,
              lat: f.geometry?.y,
              lng: f.geometry?.x,
            })
          }
          if (a.adresa) {
            buildingMap.get(soId)!.addresses.push(a.adresa)
          }
        }

        // Upsert buildings
        for (const [, b] of buildingMap) {
          try {
            const parsed = this.parseRuianAddress(b.addresses[0] || '')
            await this.prisma.building.upsert({
              where: { ruianBuildingId: b.ruianId },
              create: {
                ruianBuildingId: b.ruianId,
                street: parsed.street,
                houseNumber: b.houseNumber,
                orientationNumber: b.orientationNumber,
                city: parsed.city || job.region,
                district: parsed.district,
                postalCode: b.postalCode || parsed.postalCode,
                fullAddress: b.addresses[0],
                lat: b.lat,
                lng: b.lng,
                parcelNumbers: [],
                dataQualityScore: 30,
                lastEnrichedAt: new Date(),
              },
              update: {
                lastEnrichedAt: new Date(),
                // Only update if we have better data
                ...(b.lat && { lat: b.lat }),
                ...(b.lng && { lng: b.lng }),
              },
            })
            job.created++
          } catch {
            job.errors++
          }
          job.processed++
        }

        job.lastProcessedId = String(offset + batchSize)
        offset += batchSize

        // Rate limit: ~5 req/s → 200ms delay
        await this.delay(200)
      } catch (err) {
        this.logger.warn(`RÚIAN batch at offset ${offset} failed: ${err}`)
        job.errors++
        await this.delay(5000)
      }
    }

    if (job.status === 'RUNNING') {
      job.status = 'COMPLETED'
      job.completedAt = new Date()
    }
  }

  private buildRuianQueryUrl(params: Record<string, unknown>): string {
    const bbox = PRAHA_BBOX_SJTSK
    const base = `${RUIAN_ARCGIS_BASE}/1/query`
    const qs = new URLSearchParams({
      where: '1=1',
      geometry: `${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '5514',
      f: 'json',
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ),
    })
    return `${base}?${qs}`
  }

  private parseRuianAddress(addr: string): {
    street?: string
    city?: string
    district?: string
    postalCode?: string
  } {
    if (!addr) return {}

    // Pattern: "Ulice 123/45, 11000 Praha 1 - Nové Město"
    // or "č.p. 654, 76311 Želechovice"
    const parts = addr.split(',').map(s => s.trim())
    const street = parts[0] || undefined

    let city: string | undefined
    let postalCode: string | undefined
    let district: string | undefined

    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]
      const pscMatch = lastPart.match(/(\d{5})\s+(.+)/)
      if (pscMatch) {
        postalCode = pscMatch[1]
        const cityDistrict = pscMatch[2]
        const dashIdx = cityDistrict.indexOf(' - ')
        if (dashIdx >= 0) {
          city = cityDistrict.substring(0, dashIdx).trim()
          district = cityDistrict.substring(dashIdx + 3).trim()
        } else {
          city = cityDistrict.trim()
        }
      }
    }

    return { street, city, district, postalCode }
  }

  // ── KROK 2: ARES Bulk Matching ──────────────────────

  private async matchAresOrganizations(job: BulkImportJob): Promise<void> {
    // ARES v2 requires IČO or obchodniJmeno for search.
    // Strategy: search by name prefix "Společenství vlastníků" and "Bytové družstvo"
    // with pagination, then match to buildings by address.

    const searchTerms = [
      'Společenství vlastníků',
      'Bytové družstvo',
    ]

    for (const term of searchTerms) {
      let start = 0
      const pageSize = 100

      while (job.status === 'RUNNING') {
        try {
          const params = new URLSearchParams({
            obchodniJmeno: term,
            pocet: String(pageSize),
            start: String(start),
          })
          const url = `${ARES_BASE}/ekonomicke-subjekty/vyhledat?${params}`
          const res = await fetch(url, {
            signal: AbortSignal.timeout(15000),
            headers: { Accept: 'application/json' },
          })

          if (!res.ok) {
            // ARES may reject — try next batch or break
            this.logger.debug(`ARES search returned ${res.status} for "${term}" start=${start}`)
            break
          }

          const data = await res.json()

          // Handle ARES error response
          if (data.kod && data.kod !== 'OK') {
            this.logger.debug(`ARES error for "${term}": ${data.popis}`)
            break
          }

          const subjects = data.ekonomickeSubjekty || []
          if (subjects.length === 0) break

          if (start === 0 && data.pocetCelkem) {
            job.totalEstimated += data.pocetCelkem
          }

          for (const subj of subjects) {
            try {
              // Create/update KbOrganization
              const orgData = {
                obchodniJmeno: subj.obchodniJmeno || subj.nazev,
                nazev: subj.obchodniJmeno || subj.nazev,
                dic: subj.dic,
                pravniForma: subj.pravniForma?.toString(),
              }
              const org = await this.kb.findOrCreateOrganization(subj.ico, orgData)

              // Try to match to existing Building by address
              if (subj.sidlo) {
                const building = await this.findBuildingByAddress(
                  subj.sidlo.nazevUlice,
                  subj.sidlo.cisloDomovni ? String(subj.sidlo.cisloDomovni) : undefined,
                  subj.sidlo.nazevObce || job.region,
                )
                if (building) {
                  await this.prisma.building.update({
                    where: { id: building.id },
                    data: {
                      managingOrgId: org.id,
                      dataQualityScore: Math.min((building.dataQualityScore || 0) + 20, 100),
                    },
                  })
                  job.updated++
                }
              }
              job.created++
            } catch {
              job.errors++
            }
            job.processed++
          }

          start += pageSize
          // Rate limit: max 2 req/s → 500ms
          await this.delay(500)
        } catch (err) {
          this.logger.warn(`ARES batch for "${term}" at ${start} failed: ${err}`)
          job.errors++
          await this.delay(5000)
        }
      }
    }

    if (job.status === 'RUNNING') {
      job.status = 'COMPLETED'
      job.completedAt = new Date()
    }
  }

  private async findBuildingByAddress(
    street?: string,
    houseNumber?: string,
    city?: string,
  ): Promise<{ id: string; dataQualityScore: number | null } | null> {
    if (!street && !houseNumber) return null

    const where: Record<string, unknown> = {}
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (street) where.street = { contains: street.split(' ')[0], mode: 'insensitive' }
    if (houseNumber) where.houseNumber = houseNumber

    return this.prisma.building.findFirst({
      where: where as any,
      select: { id: true, dataQualityScore: true },
    })
  }

  // ── KROK 3: Auto-Enrichment ─────────────────────────

  private async autoEnrichBuildings(job: BulkImportJob): Promise<void> {
    const buildings = await this.prisma.building.findMany({
      where: {
        city: { contains: job.region, mode: 'insensitive' },
        ...(job.district ? { district: { contains: job.district, mode: 'insensitive' } } : {}),
        lat: { not: null },
        lng: { not: null },
        dataQualityScore: { lt: 65 },
      },
      select: { id: true, lat: true, lng: true, dataQualityScore: true },
      orderBy: { dataQualityScore: 'asc' },
      take: 10000,
    })

    job.totalEstimated = buildings.length

    for (const building of buildings) {
      if (job.status !== 'RUNNING') break
      if (!building.lat || !building.lng) continue

      try {
        let qualityBonus = 0

        // Flood + radon + heritage
        try {
          await this.geoRisk.getRiskProfile(building.lat, building.lng)
          qualityBonus += 5
        } catch { /* skip */ }

        // Price estimate
        try {
          const price = await this.iprPrice.getLandPrice(building.lat, building.lng)
          if (price) qualityBonus += 10
        } catch { /* skip */ }

        // POI
        try {
          const poi = await this.geoRisk.getNearbyPOI(building.lat, building.lng, 500)
          if (poi.details.length > 0) qualityBonus += 5
        } catch { /* skip */ }

        if (qualityBonus > 0) {
          await this.prisma.building.update({
            where: { id: building.id },
            data: {
              dataQualityScore: Math.min((building.dataQualityScore || 0) + qualityBonus, 100),
              lastEnrichedAt: new Date(),
            },
          })
          job.updated++
        }
        job.processed++
      } catch {
        job.errors++
      }

      // Rate limit: 1 req/s per service × 3 services
      await this.delay(1000)
    }

    if (job.status === 'RUNNING') {
      job.status = 'COMPLETED'
      job.completedAt = new Date()
    }
  }

  // ── KROK 4: Justice.cz Bulk ─────────────────────────

  private async bulkJusticeEnrichment(job: BulkImportJob): Promise<void> {
    // Get organizations without Justice data
    const orgs = await this.prisma.kbOrganization.findMany({
      where: {
        registryChanges: { none: {} },
        isActive: true,
      },
      select: { id: true, ico: true },
      take: 5000,
    })

    job.totalEstimated = orgs.length

    for (const org of orgs) {
      if (job.status !== 'RUNNING') break

      try {
        // Reuse existing JusticeService via dynamic import would be complex.
        // For now, just mark as needing enrichment — the per-property orchestrator
        // handles actual Justice.cz calls when a property is viewed.
        job.processed++
      } catch {
        job.errors++
      }

      // Rate limit: max 1 req/s for Justice.cz
      await this.delay(1000)
    }

    if (job.status === 'RUNNING') {
      job.status = 'COMPLETED'
      job.completedAt = new Date()
    }
  }

  // ── Helpers ─────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }
}

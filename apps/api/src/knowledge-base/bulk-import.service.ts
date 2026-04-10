import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { KnowledgeBaseService } from './knowledge-base.service'
import { GeoRiskService } from './geo-risk.service'
import { IprPriceService } from './ipr-price.service'
import { AresService } from '../integrations/ares/ares.service'
// JusticeService — planned for dataor.justice.cz import (future sprint)
import { CuzkApiKnService } from '../integrations/cuzk/cuzk-api-kn.service'

// ── Types ───────────────────────────────────────────────

export interface BulkImportJob {
  id: string
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
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
  // Sequential full import tracking
  currentBuilding?: string
  currentStep?: string
  avgQuality?: number
}

export type BulkImportStep = 'RUIAN' | 'ARES' | 'ENRICHMENT' | 'JUSTICE' | 'FULL'

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

// Valid Praha districts (whitelist for SQL injection prevention)
const VALID_DISTRICTS = [
  'Praha 1', 'Praha 2', 'Praha 3', 'Praha 4', 'Praha 5', 'Praha 6', 'Praha 7',
  'Praha 8', 'Praha 9', 'Praha 10', 'Praha 11', 'Praha 12', 'Praha 13', 'Praha 14',
  'Praha 15', 'Praha 16', 'Praha 17', 'Praha 18', 'Praha 19', 'Praha 20', 'Praha 21', 'Praha 22',
]

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
    private ares: AresService,
    private cuzkApiKn: CuzkApiKnService,
  ) {}

  // ── Job Management ──────────────────────────────────

  async startImport(params: StartImportParams): Promise<BulkImportJob> {
    if ((params.step === 'RUIAN' || params.step === 'FULL') && !params.region.toLowerCase().includes('praha')) {
      throw new Error('Bulk RÚIAN import je zatím dostupný pouze pro Prahu')
    }
    if (params.district && !VALID_DISTRICTS.includes(params.district)) {
      throw new Error(`Neplatná městská část: ${params.district}`)
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
      if (job.status === 'RUNNING' || job.status === 'PAUSED') {
        job.status = 'FAILED'
        job.error = err instanceof Error ? err.message : String(err)
      }
      this.logger.error(`Bulk import job ${job.id} failed: ${err instanceof Error ? err.message : err}`)
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
        if (job.status === 'RUNNING' || job.status === 'PAUSED') {
          job.status = 'FAILED'
          job.error = err instanceof Error ? err.message : String(err)
        }
      })
      return true
    }
    return false
  }

  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job && (job.status === 'RUNNING' || job.status === 'PAUSED')) {
      job.status = 'CANCELLED'
      job.error = 'Zrušeno uživatelem'
      job.completedAt = new Date()
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
      case 'FULL':
        await this.runFullSequentialImport(job)
        break
    }
  }

  // ── KROK 1: RÚIAN Bulk Import ───────────────────────

  private async importRuianBuildings(job: BulkImportJob): Promise<void> {
    const batchSize = 500
    let offset = job.lastProcessedId ? Number(job.lastProcessedId) : 0

    // Get total count first
    try {
      const countUrl = this.buildRuianQueryUrl({ returnCountOnly: true }, job.district)
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
        }, job.district)

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
          addressCode?: string
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
              addressCode: a.kod ? String(a.kod) : undefined,
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

        // Upsert buildings (Praha only)
        for (const [, b] of buildingMap) {
          try {
            const parsed = this.parseRuianAddress(b.addresses[0] || '')
            // Skip non-Praha (bbox includes suburbs like Vestec, Chýnice)
            // If city parsed → must be 'Praha'; if not parsed → check raw address
            if (parsed.city) {
              if (parsed.city.toLowerCase() !== 'praha') continue
            } else {
              if (!(/Praha/i).test(b.addresses[0] || '')) continue
            }
            const territoryId = await this.findTerritoryForBuilding(parsed)
            await this.prisma.building.upsert({
              where: { ruianBuildingId: b.ruianId },
              create: {
                ruianBuildingId: b.ruianId,
                ruianAddressId: b.addressCode,
                street: parsed.street,
                houseNumber: b.houseNumber,
                orientationNumber: b.orientationNumber,
                city: parsed.city || job.region,
                district: parsed.district,
                quarter: parsed.quarter,
                cadastralTerritoryName: parsed.quarter || undefined,
                postalCode: b.postalCode || parsed.postalCode,
                fullAddress: b.addresses[0],
                lat: b.lat,
                lng: b.lng,
                parcelNumbers: [],
                dataQualityScore: 30,
                lastEnrichedAt: new Date(),
                ...(territoryId && { territoryId }),
              },
              update: {
                lastEnrichedAt: new Date(),
                ...(b.addressCode && { ruianAddressId: b.addressCode }),
                ...(b.lat && { lat: b.lat }),
                ...(b.lng && { lng: b.lng }),
                ...(territoryId && { territoryId }),
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

  private buildRuianQueryUrl(params: Record<string, unknown>, district?: string): string {
    const bbox = PRAHA_BBOX_SJTSK
    const base = `${RUIAN_ARCGIS_BASE}/1/query`

    // Build WHERE clause with optional district filter
    // "Praha 1" must not match "Praha 10" — use boundary patterns + end-of-string
    // RÚIAN addresses end with district: "Rybná 693/20, Staré Město, 11000 Praha 1"
    let where = '1=1'
    if (district && VALID_DISTRICTS.includes(district)) {
      where = `(adresa LIKE '%${district} %' OR adresa LIKE '%${district},%' OR adresa LIKE '%${district}')`
    }

    const qs = new URLSearchParams({
      where,
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
    quarter?: string
    postalCode?: string
  } {
    if (!addr) return {}

    // Patterns:
    // "Neklanova 152/44, Vyšehrad, 12800 Praha 2"  → street, quarter, PSČ district
    // "č.p. 654, 76311 Želechovice"                 → street, PSČ city
    // "K Remízku 419, 25250 Vestec"                 → street, PSČ city
    // "č.p. 30"                                      → single part, no comma
    const parts = addr.split(',').map(s => s.trim())

    // Handle "č.p. NNN" — extract just house number, no street
    const cpMatch = parts[0]?.match(/^č\.?\s?p\.?\s+(\d+)$/i)
    const street = cpMatch ? undefined : (parts[0] || undefined)

    let city: string | undefined
    let postalCode: string | undefined
    let district: string | undefined
    let quarter: string | undefined

    // Last part: "12800 Praha 2" or "76311 Želechovice"
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]
      const pscMatch = lastPart.match(/(\d{5})\s+(.+)/)
      if (pscMatch) {
        postalCode = pscMatch[1]
        const cityDistrict = pscMatch[2]
        // "Praha 1 - Nové Město" → city=Praha, district=Praha 1, quarter=Nové Město
        // "Praha 2"              → city=Praha, district=Praha 2
        const prahaMatch = cityDistrict.match(/^(Praha\s+\d+)\s*-\s*(.+)$/)
        if (prahaMatch) {
          city = 'Praha'
          district = prahaMatch[1].trim() // "Praha 1"
          quarter = prahaMatch[2].trim()  // "Nové Město"
        } else if (/^Praha\s+\d+$/.test(cityDistrict)) {
          city = 'Praha'
          district = cityDistrict
        } else {
          const dashIdx = cityDistrict.indexOf(' - ')
          if (dashIdx >= 0) {
            city = cityDistrict.substring(0, dashIdx).trim()
            district = cityDistrict.substring(dashIdx + 3).trim()
          } else {
            city = cityDistrict.trim()
          }
        }
      }
    }

    // Single-part address with no PSČ — try to extract Praha info from raw text
    if (!city && /Praha\s+\d+/i.test(addr)) {
      city = 'Praha'
      const dMatch = addr.match(/Praha\s+(\d+)/i)
      if (dMatch) district = `Praha ${dMatch[1]}`
    }

    // Middle parts = quarter (Vyšehrad, Letná, etc.) — only if not already set from dash pattern
    if (parts.length >= 3 && !quarter) {
      quarter = parts.slice(1, -1).join(', ').trim() || undefined
    }

    return { street, city, district, quarter, postalCode }
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
          // ARES v2 GET /vyhledat is broken — use POST with JSON body
          const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty/vyhledat`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
            headers: { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' },
            body: JSON.stringify({ obchodniJmeno: term, pocet: pageSize, start }),
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
    if (!street || street.length < 3) return null

    const streetName = street.replace(/\s+\d+[\w/\s-]*$/, '').trim()
    if (streetName.length < 3) return null

    const where: Record<string, unknown> = {
      street: { contains: streetName, mode: 'insensitive' },
    }
    if (city) where.city = { equals: city, mode: 'insensitive' }
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
    job.status = 'FAILED'
    job.error = 'Bulk Justice.cz enrichment není zatím implementován. Použijte per-property enrichment.'
    job.completedAt = new Date()
  }

  // ── FULL Sequential Import ───────────────────────────

  private async runFullSequentialImport(job: BulkImportJob): Promise<void> {
    const batchSize = 200
    let offset = job.lastProcessedId ? Number(job.lastProcessedId) : 0
    let qualitySum = 0
    let qualityCount = 0

    // Get total count
    try {
      const countUrl = this.buildRuianQueryUrl({ returnCountOnly: true }, job.district)
      const countRes = await fetch(countUrl, { signal: AbortSignal.timeout(15000) })
      if (countRes.ok) {
        const countData = await countRes.json()
        job.totalEstimated = countData.count || 0
      }
    } catch { /* ignore */ }

    while (job.status === 'RUNNING') {
      try {
        // 1. Fetch RÚIAN batch
        job.currentStep = 'RÚIAN'
        const url = this.buildRuianQueryUrl({
          resultRecordCount: batchSize,
          resultOffset: offset,
          outFields: 'kod,cislodomovni,cisloorientacni,cisloorientacnipismeno,psc,stavebniobjekt,ulice,adresa',
          returnGeometry: true,
          outSR: 4326,
        }, job.district)

        const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
        if (!res.ok) { job.errors++; await this.delay(5000); continue }

        const data = await res.json()
        const features = data.features || []
        if (features.length === 0) break

        // Group by building
        const buildingMap = new Map<string, {
          ruianId: string; addressCode?: string; address: string; houseNumber?: string
          orientationNumber?: string; postalCode?: string; lat?: number; lng?: number
        }>()

        for (const f of features) {
          const a = f.attributes
          const soId = String(a.stavebniobjekt || a.kod)
          if (!buildingMap.has(soId)) {
            buildingMap.set(soId, {
              ruianId: soId,
              addressCode: a.kod ? String(a.kod) : undefined,
              address: a.adresa || '',
              houseNumber: a.cislodomovni ? String(a.cislodomovni) : undefined,
              orientationNumber: a.cisloorientacni ? `${a.cisloorientacni}${a.cisloorientacnipismeno || ''}` : undefined,
              postalCode: a.psc ? String(a.psc) : undefined,
              lat: f.geometry?.y,
              lng: f.geometry?.x,
            })
          }
        }

        // Filter: Praha-only + optional district
        const filteredBuildings = [...buildingMap.values()].filter(b => {
          const parsed = this.parseRuianAddress(b.address)
          // Skip non-Praha addresses (bbox includes suburbs)
          if (parsed.city) {
            if (parsed.city.toLowerCase() !== 'praha') return false
          } else {
            if (!(/Praha/i).test(b.address)) return false
          }
          // District filter if specified
          if (job.district) {
            if (parsed.district?.toLowerCase() === job.district.toLowerCase()) return true
            // Boundary-aware: "Praha 1" must not match "Praha 10"
            return new RegExp(job.district + '(\\s|,|$)', 'i').test(b.address)
          }
          return true
        })

        // 2. Process each building sequentially: upsert → ARES → enrich
        for (const b of filteredBuildings) {
          if (job.status !== 'RUNNING') break

          job.currentBuilding = b.address.slice(0, 60)

          try {
            // Step A: Upsert building from RÚIAN
            job.currentStep = 'RÚIAN'
            const parsed = this.parseRuianAddress(b.address)
            const territoryId = await this.findTerritoryForBuilding(parsed)
            const building = await this.prisma.building.upsert({
              where: { ruianBuildingId: b.ruianId },
              create: {
                ruianBuildingId: b.ruianId,
                ruianAddressId: b.addressCode,
                street: parsed.street,
                houseNumber: b.houseNumber,
                orientationNumber: b.orientationNumber,
                city: parsed.city || job.region,
                district: parsed.district,
                quarter: parsed.quarter,
                cadastralTerritoryName: parsed.quarter || undefined,
                postalCode: b.postalCode || parsed.postalCode,
                fullAddress: b.address,
                lat: b.lat, lng: b.lng,
                parcelNumbers: [],
                dataQualityScore: 30,
                lastEnrichedAt: new Date(),
                ...(territoryId && { territoryId }),
              },
              update: {
                lastEnrichedAt: new Date(),
                ...(b.addressCode && { ruianAddressId: b.addressCode }),
                ...(b.lat && { lat: b.lat }),
                ...(b.lng && { lng: b.lng }),
                ...(parsed.district && { district: parsed.district }),
                ...(parsed.quarter && { quarter: parsed.quarter, cadastralTerritoryName: parsed.quarter }),
                ...(territoryId && { territoryId }),
              },
            })

            // Step B: ARES search for SVJ/BD
            job.currentStep = 'ARES'
            let aresFound = false
            if (parsed.street && parsed.city) {
              try {
                const streetName = parsed.street.replace(/\s+\d+[\w/\s-]*$/, '').trim()
                if (streetName.length >= 3) {
                  const searchTerm = `Spolecenstvi vlastniku ${streetName} ${b.houseNumber || ''}`.trim()
                  const aresResults = await this.ares.searchByName(searchTerm, 5)
                  const svj = aresResults.ekonomickeSubjekty.find(s =>
                    s.pravniFormaKod === 145 || // SVJ (Společenství vlastníků jednotek)
                    s.pravniFormaKod === 110 || // BD (Bytové družstvo)
                    (s.nazev || '').toLowerCase().includes('společenství vlastníků') ||
                    (s.nazev || '').toLowerCase().includes('družstvo'),
                  )
                  if (svj) {
                    aresFound = true
                    const org = await this.kb.findOrCreateOrganization(svj.ico, {
                      obchodniJmeno: svj.nazev, nazev: svj.nazev, dic: svj.dic, pravniForma: svj.pravniForma, pravniFormaKod: svj.pravniFormaKod,
                    })
                    await this.prisma.building.update({
                      where: { id: building.id },
                      data: { managingOrgId: org.id },
                    }).catch(err => this.logger.warn(`ARES org link failed for building ${building.id}: ${err}`))
                  }
                }
              } catch (err) {
                this.logger.warn(`ARES search failed for ${b.address.slice(0, 40)}: ${err instanceof Error ? err.message : err}`)
              }
              await this.delay(500) // ARES rate limit
            }

            // Step C: Geo enrichment (risks + POI)
            job.currentStep = 'Enrichment'
            const enrichCache: Record<string, unknown> = {}
            const sources: Array<{ name: string; fetchedAt: string; status: string }> = []
            // Track RÚIAN source
            sources.push({ name: 'RÚIAN', fetchedAt: new Date().toISOString(), status: 'ok' })
            if (b.lat && b.lng) {
              try {
                const risks = await this.geoRisk.getRiskProfile(b.lat, b.lng)
                enrichCache.risks = risks
                sources.push({ name: 'GeoRisk', fetchedAt: new Date().toISOString(), status: 'ok' })
              } catch (err) {
                this.logger.warn(`GeoRisk failed for ${building.id}: ${err instanceof Error ? err.message : err}`)
                sources.push({ name: 'GeoRisk', fetchedAt: new Date().toISOString(), status: 'error' })
              }
              try {
                const price = await this.iprPrice.getLandPrice(b.lat, b.lng)
                if (price) { enrichCache.priceEstimate = price }
                sources.push({ name: 'IPR', fetchedAt: new Date().toISOString(), status: price ? 'ok' : 'no_data' })
              } catch (err) {
                this.logger.warn(`IPR price failed for ${building.id}: ${err instanceof Error ? err.message : err}`)
                sources.push({ name: 'IPR', fetchedAt: new Date().toISOString(), status: 'error' })
              }
              try {
                const poi = await this.geoRisk.getNearbyPOI(b.lat, b.lng, 500)
                // Save POI even if details are empty (counts like schools=3 are still valuable)
                const hasAnyPoi = Object.entries(poi).some(([key, value]) => {
                  if (key === 'details') return Array.isArray(value) && value.length > 0
                  return typeof value === 'number' && value > 0
                })
                if (hasAnyPoi) { enrichCache.poi = poi }
                sources.push({ name: 'Overpass', fetchedAt: new Date().toISOString(), status: hasAnyPoi ? 'ok' : 'no_data' })
              } catch (err) {
                this.logger.warn(`POI failed for ${building.id}: ${err instanceof Error ? err.message : err}`)
                sources.push({ name: 'Overpass', fetchedAt: new Date().toISOString(), status: 'error' })
              }
            }
            // Add ARES source
            if (parsed.street && parsed.city) {
              sources.push({ name: 'ARES', fetchedAt: new Date().toISOString(), status: aresFound ? 'ok' : 'no_match' })
            }
            enrichCache.sources = sources

            // Step D: ČÚZK — create BuildingUnit records
            job.currentStep = 'ČÚZK'
            if (this.cuzkApiKn.isConfigured && (b.ruianId || building.ruianAddressId)) {
              try {
                let stavba = building.ruianAddressId
                  ? await this.cuzkApiKn.getStavbaByAdresniMisto(Number(building.ruianAddressId))
                  : null
                if (!stavba && b.ruianId) stavba = await this.cuzkApiKn.getStavbaDetail(Number(b.ruianId))
                if (stavba?.jednotky?.length) {
                  for (const jRef of stavba.jednotky) {
                    try {
                      const j = await this.cuzkApiKn.getJednotkaDetail(jRef.id)
                      if (!j) continue
                      const un = String(j.cisloJednotky)
                      await this.prisma.buildingUnit.upsert({
                        where: { buildingId_unitNumber: { buildingId: building.id, unitNumber: un } },
                        create: {
                          buildingId: building.id, unitNumber: un,
                          unitType: j.zpusobVyuziti?.nazev?.includes('byt') ? 'APARTMENT' : 'NON_RESIDENTIAL',
                          usage: j.zpusobVyuziti?.nazev,
                          shareNumerator: j.podilNaSpolecnychCastechDomu?.citatel,
                          shareDenominator: j.podilNaSpolecnychCastechDomu?.jmenovatel,
                          lvNumber: j.lv?.cislo?.toString(),
                          cuzkStavbaId: stavba!.id,
                        },
                        update: {
                          unitType: j.zpusobVyuziti?.nazev?.includes('byt') ? 'APARTMENT' : 'NON_RESIDENTIAL',
                          usage: j.zpusobVyuziti?.nazev,
                          shareNumerator: j.podilNaSpolecnychCastechDomu?.citatel,
                          shareDenominator: j.podilNaSpolecnychCastechDomu?.jmenovatel,
                          lvNumber: j.lv?.cislo?.toString(),
                          cuzkStavbaId: stavba!.id,
                        },
                      })
                    } catch { /* skip individual unit errors */ }
                  }
                  enrichCache.cuzkUnitsCount = stavba.jednotky.length
                  if (stavba.lv) {
                    await this.prisma.building.update({
                      where: { id: building.id },
                      data: {
                        landRegistrySheet: stavba.lv.cislo?.toString(),
                        cadastralTerritoryCode: stavba.lv.katastralniUzemi?.kod?.toString(),
                        cadastralTerritoryName: stavba.lv.katastralniUzemi?.nazev,
                      },
                    })
                  }
                  sources.push({ name: 'ČÚZK API', fetchedAt: new Date().toISOString(), status: 'ok' })
                } else {
                  sources.push({ name: 'ČÚZK API', fetchedAt: new Date().toISOString(), status: stavba ? 'no_units' : 'no_data' })
                }
              } catch (err) {
                this.logger.warn(`ČÚZK failed for ${building.id}: ${err instanceof Error ? err.message : err}`)
                sources.push({ name: 'ČÚZK API', fetchedAt: new Date().toISOString(), status: 'error' })
              }
              await this.delay(500) // ČÚZK rate limit
            }

            // Step E: Justice.cz (if org found)
            job.currentStep = 'Justice'
            const updatedBuilding = await this.prisma.building.findUnique({
              where: { id: building.id },
              select: {
                managingOrgId: true, lat: true, lng: true,
                houseNumber: true, numberOfFloors: true, numberOfUnits: true,
                builtUpArea: true, ruianAddressId: true, cadastralTerritoryName: true,
              },
            })
            if (updatedBuilding?.managingOrgId) {
              try {
                const org = await this.prisma.kbOrganization.findUnique({
                  where: { id: updatedBuilding.managingOrgId },
                  select: { ico: true },
                })
                if (org) {
                  // Justice.cz integration planned via JusticeService.importFromDataor()
                  sources.push({ name: 'Justice.cz', fetchedAt: new Date().toISOString(), status: 'pending' })
                }
              } catch (err) {
                this.logger.warn(`Justice.cz failed for ${building.id}: ${err instanceof Error ? err.message : err}`)
                sources.push({ name: 'Justice.cz', fetchedAt: new Date().toISOString(), status: 'error' })
              }
              await this.delay(1000) // Justice rate limit
            }

            // Update quality score — component-based (aligned with fullReEnrich)
            const bData = updatedBuilding
            let score = 0
            if (bData?.lat && bData?.lng) score += 5
            if (bData?.houseNumber) score += 5
            if (bData?.numberOfFloors) score += 3
            if (bData?.numberOfUnits) score += 3
            if (bData?.builtUpArea) score += 2
            if (bData?.ruianAddressId) score += 3
            if (bData?.cadastralTerritoryName) score += 2
            if (bData?.managingOrgId) score += 10
            if (enrichCache.cuzkUnitsCount) score += 10
            if (enrichCache.risks) score += 5
            if (enrichCache.poi) score += 5
            if (enrichCache.priceEstimate) score += 5
            if (sources.some(s => s.name === 'ARES' && s.status === 'ok')) score += 5
            if (sources.some(s => s.name === 'Justice.cz' && s.status === 'ok')) score += 10
            const finalScore = Math.min(score, 100)

            await this.prisma.building.update({
              where: { id: building.id },
              data: {
                dataQualityScore: finalScore,
                lastEnrichedAt: new Date(),
                enrichmentData: Object.keys(enrichCache).length > 0 ? JSON.parse(JSON.stringify(enrichCache)) : undefined,
                enrichedAt: Object.keys(enrichCache).length > 0 ? new Date() : undefined,
              },
            })

            qualitySum += finalScore
            qualityCount++
            job.avgQuality = Math.round(qualitySum / qualityCount)
            job.created++
          } catch (err) {
            this.logger.warn(`Full import failed for ${b.address.slice(0, 40)}: ${err instanceof Error ? err.message : err}`)
            job.errors++
          }

          job.processed++
          job.lastProcessedId = String(offset)
        }

        offset += batchSize
        await this.delay(200) // RÚIAN rate limit
      } catch (err) {
        this.logger.warn(`Full import batch at offset ${offset} failed: ${err}`)
        job.errors++
        await this.delay(5000)
      }
    }

    if (job.status === 'RUNNING') {
      job.status = 'COMPLETED'
      job.completedAt = new Date()
    }
  }

  // ── Unified re-enrich pipeline ──────��────────────────

  async fullReEnrich(buildingId: string): Promise<{ qualityScore: number; sources: any[] }> {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } })
    if (!building) throw new Error('Building not found')

    const enrichCache: Record<string, unknown> = {}
    const sources: Array<{ name: string; fetchedAt: string; status: string }> = []

    // 1. RÚIAN backfill — get addressCode from GPS if missing
    if (!building.ruianAddressId && building.lat && building.lng) {
      try {
        const url = `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/1/query?geometry=${building.lng},${building.lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=kod&returnGeometry=false&f=json&inSR=4326`
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (res.ok) {
          const data = await res.json()
          const kod = data.features?.[0]?.attributes?.kod
          this.logger.log(`RÚIAN backfill for ${buildingId}: features=${data.features?.length ?? 0}, kod=${kod ?? 'none'}`)
          if (kod) {
            await this.prisma.building.update({ where: { id: buildingId }, data: { ruianAddressId: String(kod) } })
            building.ruianAddressId = String(kod)
            sources.push({ name: 'RÚIAN backfill', fetchedAt: new Date().toISOString(), status: 'ok' })
          } else {
            sources.push({ name: 'RÚIAN backfill', fetchedAt: new Date().toISOString(), status: 'no_data' })
          }
        }
      } catch (err) { this.logger.warn(`RÚIAN backfill failed: ${(err as Error).message}`); sources.push({ name: 'RÚIAN backfill', fetchedAt: new Date().toISOString(), status: 'error' }) }
    } else {
      sources.push({ name: 'RÚIAN backfill', fetchedAt: new Date().toISOString(), status: building.ruianAddressId ? 'already_set' : 'skipped_no_gps' })
    }

    // 2. ARES — SVJ/BD search
    if (building.street && building.city && !building.managingOrgId) {
      try {
        const streetName = building.street.replace(/\s+\d+[\w/\s-]*$/, '').trim()
        if (streetName.length >= 3) {
          const searchTerm = `Spolecenstvi vlastniku ${streetName} ${building.houseNumber || ''}`.trim()
          const aresResults = await this.ares.searchByName(searchTerm, 5)
          const svj = aresResults.ekonomickeSubjekty.find(s => s.pravniFormaKod === 145 || s.pravniFormaKod === 110 || (s.nazev || '').toLowerCase().includes('společenství vlastníků'))
          if (svj) {
            const org = await this.kb.findOrCreateOrganization(svj.ico, { obchodniJmeno: svj.nazev, nazev: svj.nazev, dic: svj.dic, pravniForma: svj.pravniForma, pravniFormaKod: svj.pravniFormaKod })
            await this.prisma.building.update({ where: { id: buildingId }, data: { managingOrgId: org.id } }).catch(() => {})
          }
          sources.push({ name: 'ARES', fetchedAt: new Date().toISOString(), status: svj ? 'ok' : 'no_match' })
        }
      } catch (err) { this.logger.warn(`ARES failed: ${(err as Error).message}`); sources.push({ name: 'ARES', fetchedAt: new Date().toISOString(), status: 'error' }) }
      await this.delay(500)
    } else {
      sources.push({ name: 'ARES', fetchedAt: new Date().toISOString(), status: !building.street ? 'skipped_no_street' : !building.city ? 'skipped_no_city' : 'already_has_org' })
    }

    // 3-5. GeoRisk + POI + IPR
    if (building.lat && building.lng) {
      try { enrichCache.risks = await this.geoRisk.getRiskProfile(building.lat, building.lng); sources.push({ name: 'GeoRisk', fetchedAt: new Date().toISOString(), status: 'ok' }) }
      catch { sources.push({ name: 'GeoRisk', fetchedAt: new Date().toISOString(), status: 'error' }) }

      try { const p = await this.iprPrice.getLandPrice(building.lat, building.lng); if (p) enrichCache.priceEstimate = p; sources.push({ name: 'IPR', fetchedAt: new Date().toISOString(), status: p ? 'ok' : 'no_data' }) }
      catch { sources.push({ name: 'IPR', fetchedAt: new Date().toISOString(), status: 'error' }) }

      try {
        const poi = await this.geoRisk.getNearbyPOI(building.lat, building.lng, 500)
        const hasAny = Object.entries(poi).some(([k, v]) => k === 'details' ? Array.isArray(v) && v.length > 0 : typeof v === 'number' && v > 0)
        if (hasAny) enrichCache.poi = poi
        sources.push({ name: 'Overpass', fetchedAt: new Date().toISOString(), status: hasAny ? 'ok' : 'no_data' })
      } catch { sources.push({ name: 'Overpass', fetchedAt: new Date().toISOString(), status: 'error' }) }
    }

    // 6. ČÚZK API KN
    if (this.cuzkApiKn.isConfigured && (building.ruianAddressId || building.ruianBuildingId)) {
      this.logger.log(`ČÚZK for ${buildingId}: addressId=${building.ruianAddressId}, buildingId=${building.ruianBuildingId}`)
      try {
        let stavba = building.ruianAddressId ? await this.cuzkApiKn.getStavbaByAdresniMisto(Number(building.ruianAddressId)) : null
        if (!stavba && building.ruianBuildingId) stavba = await this.cuzkApiKn.getStavbaDetail(Number(building.ruianBuildingId))
        this.logger.log(`ČÚZK result for ${buildingId}: stavba=${stavba ? `id=${stavba.id}, units=${stavba.jednotky?.length}` : 'not_found'}`)
        if (stavba) {
          const cuzkData: Record<string, unknown> = {
            stavbaId: stavba.id, typStavby: stavba.typStavby?.nazev, zpusobVyuziti: stavba.zpusobVyuziti?.nazev,
            cislaDomovni: stavba.cislaDomovni, castObce: stavba.castObce?.nazev, obec: stavba.obec?.nazev,
            lv: stavba.lv ? { cislo: stavba.lv.cislo, katastralniUzemi: stavba.lv.katastralniUzemi?.nazev, katastralniUzemiKod: stavba.lv.katastralniUzemi?.kod } : null,
            parcely: (stavba.parcely ?? []).map((p: any) => ({ id: p.id, kmenoveCislo: p.kmenoveCisloParcely, poddeleni: p.poddeleniCislaParcely })),
            zpusobyOchrany: (stavba.zpusobyOchrany ?? []).map((z: any) => z.nazev),
            jednotekCount: stavba.jednotky?.length ?? 0, fetchedAt: new Date().toISOString(),
          }
          // Parcela detail
          if (stavba.parcely?.[0]?.id) {
            try { const p = await this.cuzkApiKn.getParcelaDetail(stavba.parcely[0].id); if (p) cuzkData.parcelaDetail = { vymera: (p as any).vymera, druhPozemku: (p as any).druhPozemku?.nazev } } catch {}
          }
          enrichCache.cuzk = cuzkData
          await this.prisma.building.update({ where: { id: buildingId }, data: { landRegistrySheet: stavba.lv?.cislo?.toString(), cadastralTerritoryCode: stavba.lv?.katastralniUzemi?.kod?.toString(), cadastralTerritoryName: stavba.lv?.katastralniUzemi?.nazev } })
          // Upsert units
          for (const jRef of stavba.jednotky ?? []) {
            try {
              const j = await this.cuzkApiKn.getJednotkaDetail(jRef.id)
              if (!j) continue
              const un = String(j.cisloJednotky)
              await this.prisma.buildingUnit.upsert({
                where: { buildingId_unitNumber: { buildingId, unitNumber: un } },
                create: { buildingId, unitNumber: un, unitType: j.zpusobVyuziti?.nazev?.includes('byt') ? 'APARTMENT' : 'NON_RESIDENTIAL', usage: j.zpusobVyuziti?.nazev, shareNumerator: j.podilNaSpolecnychCastechDomu?.citatel, shareDenominator: j.podilNaSpolecnychCastechDomu?.jmenovatel, lvNumber: j.lv?.cislo?.toString(), cuzkStavbaId: stavba!.id },
                update: { unitType: j.zpusobVyuziti?.nazev?.includes('byt') ? 'APARTMENT' : 'NON_RESIDENTIAL', usage: j.zpusobVyuziti?.nazev, shareNumerator: j.podilNaSpolecnychCastechDomu?.citatel, shareDenominator: j.podilNaSpolecnychCastechDomu?.jmenovatel, lvNumber: j.lv?.cislo?.toString(), cuzkStavbaId: stavba!.id },
              })
            } catch {}
          }
          sources.push({ name: 'ČÚZK API', fetchedAt: new Date().toISOString(), status: 'ok' })
        } else { sources.push({ name: 'ČÚZK API', fetchedAt: new Date().toISOString(), status: 'no_data' }) }
      } catch (err) { this.logger.warn(`ČÚZK failed: ${(err as Error).message}`); sources.push({ name: 'ČÚZK API', fetchedAt: new Date().toISOString(), status: 'error' }) }
    } else {
      sources.push({ name: 'ČÚZK API', fetchedAt: new Date().toISOString(), status: !this.cuzkApiKn.isConfigured ? 'not_configured' : 'no_ruian_ids' })
    }

    // 7. Justice.cz
    const org = await this.prisma.building.findUnique({ where: { id: buildingId }, select: { managingOrgId: true } })
    if (org?.managingOrgId) {
      try {
        const orgData = await this.prisma.kbOrganization.findUnique({ where: { id: org.managingOrgId }, select: { ico: true } })
        if (orgData) { sources.push({ name: 'Justice.cz', fetchedAt: new Date().toISOString(), status: 'pending' }) }
      } catch { sources.push({ name: 'Justice.cz', fetchedAt: new Date().toISOString(), status: 'error' }) }
      await this.delay(1000)
    }

    // 8. Sources
    enrichCache.sources = sources

    // 9. Quality score — real calculation
    const b = await this.prisma.building.findUnique({ where: { id: buildingId } })
    let score = 0
    if (b?.lat && b?.lng) score += 5
    if (b?.houseNumber) score += 5
    if (b?.numberOfFloors) score += 3
    if (b?.numberOfUnits) score += 3
    if (b?.builtUpArea) score += 2
    if (b?.ruianAddressId) score += 3
    if (b?.cadastralTerritoryName) score += 2
    if (b?.managingOrgId) score += 10
    if (enrichCache.cuzk) { const c = enrichCache.cuzk as any; if (c.typStavby) score += 5; if (c.jednotekCount > 0) score += 10; if (c.lv) score += 5; if (c.parcelaDetail) score += 5; if (c.zpusobyOchrany?.length) score += 3 }
    if (enrichCache.risks) score += 5
    if (enrichCache.poi) score += 5
    if (enrichCache.priceEstimate) score += 5
    if (sources.some(s => s.name === 'Justice.cz' && s.status === 'ok')) score += 10
    if (sources.some(s => s.name === 'ARES' && s.status === 'ok')) score += 5
    const finalScore = Math.min(score, 100)

    // 10. Save
    await this.prisma.building.update({
      where: { id: buildingId },
      data: { dataQualityScore: finalScore, lastEnrichedAt: new Date(), enrichmentData: JSON.parse(JSON.stringify(enrichCache)), enrichedAt: new Date() },
    })

    return { qualityScore: finalScore, sources }
  }

  // ── Re-enrich existing buildings ─────────────────────

  async reEnrichBuildings(buildingIds: string[]): Promise<{ enriched: number; errors: number }> {
    let enriched = 0
    let errors = 0

    for (const id of buildingIds) {
      try {
        const building = await this.prisma.building.findUnique({
          where: { id },
          select: { id: true, lat: true, lng: true, street: true, houseNumber: true, city: true, managingOrgId: true, dataQualityScore: true },
        })
        if (!building || !building.lat || !building.lng) { errors++; continue }

        const enrichCache: Record<string, unknown> = {}
        const sources: Array<{ name: string; fetchedAt: string; status: string }> = []
        let qualityBonus = 0

        // GeoRisk
        try {
          const risks = await this.geoRisk.getRiskProfile(building.lat, building.lng)
          enrichCache.risks = risks; qualityBonus += 5
          sources.push({ name: 'GeoRisk', fetchedAt: new Date().toISOString(), status: 'ok' })
        } catch { sources.push({ name: 'GeoRisk', fetchedAt: new Date().toISOString(), status: 'error' }) }

        // IPR Price
        try {
          const price = await this.iprPrice.getLandPrice(building.lat, building.lng)
          if (price) { enrichCache.priceEstimate = price; qualityBonus += 10 }
          sources.push({ name: 'IPR', fetchedAt: new Date().toISOString(), status: price ? 'ok' : 'no_data' })
        } catch { sources.push({ name: 'IPR', fetchedAt: new Date().toISOString(), status: 'error' }) }

        // POI
        try {
          const poi = await this.geoRisk.getNearbyPOI(building.lat, building.lng, 500)
          const hasAny = Object.entries(poi).some(([k, v]) => k === 'details' ? Array.isArray(v) && v.length > 0 : typeof v === 'number' && v > 0)
          if (hasAny) { enrichCache.poi = poi; qualityBonus += 5 }
          sources.push({ name: 'Overpass', fetchedAt: new Date().toISOString(), status: hasAny ? 'ok' : 'no_data' })
        } catch { sources.push({ name: 'Overpass', fetchedAt: new Date().toISOString(), status: 'error' }) }

        // ARES (if has street)
        if (building.street && building.city) {
          try {
            const streetName = building.street.replace(/\s+\d+[\w/\s-]*$/, '').trim()
            if (streetName.length >= 3) {
              const searchTerm = `Spolecenstvi vlastniku ${streetName} ${building.houseNumber || ''}`.trim()
              const aresResults = await this.ares.searchByName(searchTerm, 5)
              const svj = aresResults.ekonomickeSubjekty.find(s =>
                s.pravniFormaKod === 145 || s.pravniFormaKod === 110 ||
                (s.nazev || '').toLowerCase().includes('společenství vlastníků') ||
                (s.nazev || '').toLowerCase().includes('družstvo'),
              )
              if (svj && !building.managingOrgId) {
                const org = await this.kb.findOrCreateOrganization(svj.ico, {
                  obchodniJmeno: svj.nazev, nazev: svj.nazev, dic: svj.dic, pravniForma: svj.pravniForma, pravniFormaKod: svj.pravniFormaKod,
                })
                await this.prisma.building.update({ where: { id }, data: { managingOrgId: org.id } }).catch(() => {})
              }
              sources.push({ name: 'ARES', fetchedAt: new Date().toISOString(), status: svj ? 'ok' : 'no_match' })
            }
          } catch { sources.push({ name: 'ARES', fetchedAt: new Date().toISOString(), status: 'error' }) }
          await this.delay(500)
        }

        enrichCache.sources = sources

        const finalScore = Math.min((building.dataQualityScore || 30) + qualityBonus, 100)
        await this.prisma.building.update({
          where: { id },
          data: {
            dataQualityScore: finalScore,
            lastEnrichedAt: new Date(),
            enrichmentData: JSON.parse(JSON.stringify(enrichCache)),
            enrichedAt: new Date(),
          },
        })
        enriched++
      } catch {
        errors++
      }
      await this.delay(500) // Rate limit between buildings
    }

    return { enriched, errors }
  }

  // ── Helpers ─────────────────────────────────────────

  /**
   * Find the best matching Territory for a parsed building address.
   * Priority: KÚ (by quarter name) → MČ (by district name) → Obec (by city name)
   */
  private async findTerritoryForBuilding(parsed: {
    city?: string; district?: string; quarter?: string
  }): Promise<string | null> {
    // Resolve parent obec first for scoped lookups (avoids name collisions across cities)
    const obec = parsed.city
      ? await this.prisma.territory.findFirst({
          where: { level: 'MUNICIPALITY', name: { equals: parsed.city, mode: 'insensitive' } },
          select: { id: true },
        })
      : null

    // 1. Try KÚ by quarter name — scoped to obec
    if (parsed.quarter && obec) {
      const ku = await this.prisma.territory.findFirst({
        where: { level: 'CADASTRAL', name: { equals: parsed.quarter, mode: 'insensitive' }, parentId: obec.id },
        select: { id: true },
      })
      if (ku) return ku.id
    }

    // 2. Try MČ by district name — scoped to obec
    if (parsed.district && obec) {
      const mc = await this.prisma.territory.findFirst({
        where: { level: 'CITY_PART', name: { equals: parsed.district, mode: 'insensitive' }, parentId: obec.id },
        select: { id: true },
      })
      if (mc) return mc.id
    }

    // 3. Fall back to obec
    if (obec) return obec.id

    return null
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }
}

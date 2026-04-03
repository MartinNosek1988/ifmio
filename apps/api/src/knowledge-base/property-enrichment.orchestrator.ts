import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KnowledgeBaseService } from './knowledge-base.service'
import { AresService } from '../integrations/ares/ares.service'
import { IprPriceService, type PriceEstimate } from './ipr-price.service'

export interface EnrichmentResult {
  buildingId?: string
  address: { street: string; city: string; district?: string; postalCode?: string; verified: boolean }
  sources: string[]
  qualityScore: number
  freeData: {
    organization?: {
      ico: string; name: string; type: string; dic?: string;
      legalFormName?: string; dateEstablished?: string
    }
    detectedPropertyType?: string
    statutoryBodies?: Array<{ role: string; fullName: string; dateFrom?: string }>
  }
  paidDataAvailable: Array<{
    source: string; name: string; description: string
    estimatedCost: number; currency: string; qualityBonus: number
  }>
  priceEstimate?: PriceEstimate
  visual?: {
    orthoUrl?: string
    streetViewUrl?: string
    mapUrl?: string
  }
}

@Injectable()
export class PropertyEnrichmentOrchestrator {
  private readonly logger = new Logger(PropertyEnrichmentOrchestrator.name)

  constructor(
    private kb: KnowledgeBaseService,
    private ares: AresService,
    private iprPrice: IprPriceService,
    private prisma: PrismaService,
  ) {}

  async enrichFromAddress(input: {
    street?: string
    city: string
    district?: string
    postalCode?: string
    houseNumber?: string
    lat?: number
    lng?: number
    ruianCode?: string
  }): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      address: { street: input.street || '', city: input.city, district: input.district, postalCode: input.postalCode, verified: true },
      sources: ['RUIAN'],
      qualityScore: 30,
      freeData: {},
      paidDataAvailable: [],
    }

    // === KROK 1: ARES — hledej SVJ/BD na adrese ===
    try {
      // Extract street name for search (remove house number)
      const streetName = input.street?.replace(/\s*\d+.*$/, '').trim()
      if (streetName && input.city) {
        const searchTerm = `${streetName} ${input.houseNumber || ''}`.trim()
        const aresResults = await this.ares.searchByName(searchTerm, 5)

        // Filter for SVJ/BD by legal form name
        const svjBd = aresResults.ekonomickeSubjekty.filter(s => {
          const pf = (s.pravniForma || '').toLowerCase()
          return pf.includes('společenství vlastníků') || pf.includes('družstvo')
        })

        if (svjBd.length > 0) {
          const best = svjBd[0]
          const isSvj = (best.pravniForma || '').toLowerCase().includes('společenství vlastníků')
          result.freeData.organization = {
            ico: best.ico,
            name: best.nazev,
            type: isSvj ? 'SVJ' : 'BD',
            dic: best.dic,
            legalFormName: best.pravniForma,
            dateEstablished: best.datumVzniku,
          }
          result.freeData.detectedPropertyType = isSvj ? 'SVJ' : 'BD'
          result.sources.push('ARES')
          result.qualityScore += 20

          // KB enrichment
          await this.kb.findOrCreateOrganization(best.ico, best as any).catch(() => {})

          // Statutární orgány z ARES detail
          if (best.zastupci?.length) {
            result.freeData.statutoryBodies = best.zastupci.map(z => ({
              role: z.funkce || 'Člen',
              fullName: `${z.jmeno} ${z.prijmeni}`.trim(),
              dateFrom: z.datumNarozeni,
            }))
            result.sources.push('ARES_OR')
            result.qualityScore += 10
          }
        }
      }
    } catch (err) {
      this.logger.debug(`ARES search failed: ${err}`)
    }

    // === KROK 2: ČÚZK Nahlížení — STUB ===
    // TODO: Napojit ČÚZK Dálkový přístup (placený) nebo VDP službu
    // ČÚZK Nahlížení nemá stabilní REST API (HTML + CAPTCHA)

    // === KROK 3: IPR Praha cenová mapa ===
    if (input.lat && input.lng) {
      try {
        const landPrice = await this.iprPrice.getLandPrice(input.lat, input.lng)
        if (landPrice) {
          result.priceEstimate = this.iprPrice.estimatePrice(landPrice)
          result.sources.push('IPR_PRAHA')
          result.qualityScore += 10
        }
      } catch (err) {
        this.logger.debug(`IPR Praha query failed: ${err}`)
      }
    }
    if (!result.priceEstimate) {
      result.priceEstimate = {
        confidence: 'low',
        disclaimer: 'Cenový odhad nedostupný — chybí GPS souřadnice nebo IPR Praha neodpověděl.',
      }
    }

    // === KROK 4: Vizuální data ===
    if (input.lat && input.lng) {
      const bbox = this.getOrthoBbox(input.lat, input.lng)
      result.visual = {
        orthoUrl: `https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/export?bbox=${bbox.lngMin},${bbox.latMin},${bbox.lngMax},${bbox.latMax}&size=600,400&format=png&f=image&bboxSR=4326&imageSR=4326`,
        streetViewUrl: `https://mapy.cz/panorama?x=${input.lng}&y=${input.lat}&z=18`,
        mapUrl: `https://mapy.cz/zakladni?x=${input.lng}&y=${input.lat}&z=18`,
      }
    }

    // === KROK 4: Nabídni placené zdroje ===
    result.paidDataAvailable = [
      {
        source: 'CUZK_DALKOV',
        name: 'ČÚZK Dálkový přístup',
        description: 'Kompletní výpis z katastru — vlastníci, podíly, LV, věcná břemena, zástavy',
        estimatedCost: 50,
        currency: 'CZK',
        qualityBonus: 25,
      },
      {
        source: 'PENB',
        name: 'Energetický štítek (PENB)',
        description: 'Třída A-G, roční spotřeba energie, platnost průkazu',
        estimatedCost: 50,
        currency: 'CZK',
        qualityBonus: 5,
      },
      {
        source: 'IPR_CENOVA_MAPA',
        name: 'IPR Praha cenová mapa',
        description: 'Cena pozemku za m², orientační odhad ceny bytů',
        estimatedCost: 0,
        currency: 'CZK',
        qualityBonus: 10,
      },
    ]

    // === Ulož Building do KB ===
    try {
      const building = await this.kb.findOrCreateBuilding({
        street: input.street,
        city: input.city,
        district: input.district,
        postalCode: input.postalCode,
        lat: input.lat,
        lng: input.lng,
        ruianBuildingId: input.ruianCode,
      })
      result.buildingId = building.id

      // Link org to building if found
      if (result.freeData.organization) {
        const org = await this.prisma.kbOrganization.findUnique({
          where: { ico: result.freeData.organization.ico },
        })
        if (org) {
          await this.prisma.building.update({
            where: { id: building.id },
            data: { managingOrgId: org.id },
          }).catch(() => {})
        }
      }
    } catch (err) {
      this.logger.warn(`KB building creation failed: ${err}`)
    }

    result.qualityScore = Math.min(result.qualityScore, 100)
    return result
  }

  private getOrthoBbox(lat: number, lng: number, radiusMeters = 80) {
    const dLat = radiusMeters / 111320
    const dLng = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180))
    return { latMin: lat - dLat, latMax: lat + dLat, lngMin: lng - dLng, lngMax: lng + dLng }
  }
}

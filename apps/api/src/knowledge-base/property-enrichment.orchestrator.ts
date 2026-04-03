import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KnowledgeBaseService } from './knowledge-base.service'
import { AresService } from '../integrations/ares/ares.service'

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
  priceEstimate?: {
    landPricePerSqm?: number
    source?: string
    disclaimer: string
  }
}

@Injectable()
export class PropertyEnrichmentOrchestrator {
  private readonly logger = new Logger(PropertyEnrichmentOrchestrator.name)

  constructor(
    private kb: KnowledgeBaseService,
    private ares: AresService,
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

    // === KROK 2: ČÚZK Nahlížení — STUB (plné napojení v další iteraci) ===
    // ČÚZK Nahlížení nemá stabilní REST API — HTML scraping s CAPTCHA
    // TODO: Napojit ČÚZK Dálkový přístup (placený) nebo VDP službu
    result.qualityScore += 0 // no data from ČÚZK yet

    // === KROK 3: Cenový odhad — STUB ===
    // IPR Praha cenová mapa endpoint není stabilně dostupný
    // TODO: Napojit po ověření funkčního ArcGIS endpointu
    result.priceEstimate = {
      disclaimer: 'Cenový odhad bude dostupný po napojení na cenovou mapu IPR Praha.',
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
}

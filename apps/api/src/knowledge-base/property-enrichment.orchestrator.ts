import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KnowledgeBaseService } from './knowledge-base.service'
import { AresService } from '../integrations/ares/ares.service'
import { JusticeService, type RegistryChange, type SbirkaDocument } from '../integrations/justice/justice.service'
import { IprPriceService, type PriceEstimate } from './ipr-price.service'
import { GeoRiskService, type NearbyPOI, type GeoRiskProfile } from './geo-risk.service'
import { BuildingIntelligenceService, type ConditionPrediction, type ChecklistItem, type DuplicateResult } from './building-intelligence.service'

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
  nearbyPOI?: NearbyPOI
  risks?: GeoRiskProfile
  conditionPrediction?: ConditionPrediction
  checklist?: ChecklistItem[]
  duplicate?: DuplicateResult
  justice?: {
    subject?: { subjektId: string; spisovaZnacka?: string; rejstrik?: string; soud?: string }
    registryChanges: RegistryChange[]
    sbirkaListin: SbirkaDocument[]
  }
}

@Injectable()
export class PropertyEnrichmentOrchestrator {
  private readonly logger = new Logger(PropertyEnrichmentOrchestrator.name)

  constructor(
    private kb: KnowledgeBaseService,
    private ares: AresService,
    private justice: JusticeService,
    private iprPrice: IprPriceService,
    private geoRisk: GeoRiskService,
    private intelligence: BuildingIntelligenceService,
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

    // === KROK 0: Duplicitní detekce ===
    if (input.street && input.city) {
      result.duplicate = await this.intelligence.checkDuplicate(input.street, input.city) ?? undefined
    }

    // === KROK 1: ARES — hledej SVJ/BD na adrese ===
    try {
      // Extract street name for search (remove house number)
      const streetName = input.street?.replace(/\s+\d+[\w/\s-]*$/, '').trim()
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
          const kbOrgData = { obchodniJmeno: best.nazev, nazev: best.nazev, dic: best.dic, pravniForma: best.pravniForma, datumVzniku: best.datumVzniku }
          await this.kb.findOrCreateOrganization(best.ico, kbOrgData).catch(() => {})

          // Statutární orgány z ARES detail
          if (best.zastupci?.length) {
            result.freeData.statutoryBodies = best.zastupci.map(z => ({
              role: z.funkce || 'Člen',
              fullName: `${z.jmeno} ${z.prijmeni}`.trim(),
              dateFrom: undefined, // ARES zastupci nemají datum jmenování, jen datumNarozeni
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
    // TODO: ČÚZK Nahlížení do KN — real integration
    // Free: https://nahlizenidokn.cuzk.cz/ — HTML scraping (cheerio), rate limited, CAPTCHA risk
    // Paid: https://dpkn.cuzk.cz/ — SOAP API, ~2 Kč/dotaz, spolehlivé
    // Data: jednotky, vlastníci, podíly na SČ, LV, zástavní práva, exekuce
    // Priority: HIGH — bez ČÚZK nemáme vlastníky ani jednotky z katastru

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

    // === KROK 5: POI v okolí (Overpass/OSM) ===
    if (input.lat && input.lng) {
      try {
        result.nearbyPOI = await this.geoRisk.getNearbyPOI(input.lat, input.lng, 500)
        if (result.nearbyPOI.details.length > 0) {
          result.sources.push('OSM')
          result.qualityScore += 5
        }
      } catch (err) {
        this.logger.debug(`POI query failed: ${err}`)
      }
    }

    // === KROK 6: Rizikový profil ===
    if (input.lat && input.lng) {
      try {
        result.risks = await this.geoRisk.getRiskProfile(
          input.lat, input.lng,
          result.freeData.organization?.ico,
        )
        result.qualityScore += 5
      } catch (err) {
        this.logger.debug(`Risk profile failed: ${err}`)
      }
    }

    // === Ulož Building do KB (before prediction so we have constructionYear) ===
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

    // === KROK 7: Predikce stavu + checklist ===
    const buildingData = result.buildingId
      ? await this.prisma.building.findUnique({ where: { id: result.buildingId } }).catch(() => null)
      : null

    result.conditionPrediction = this.intelligence.predictCondition(
      buildingData?.constructionYear ?? undefined,
      buildingData?.materialType ?? undefined,
    )
    result.checklist = this.intelligence.generateChecklist({
      constructionYear: buildingData?.constructionYear ?? undefined,
      numberOfFloors: buildingData?.numberOfFloors ?? undefined,
      numberOfUnits: buildingData?.numberOfUnits ?? undefined,
      materialType: buildingData?.materialType ?? undefined,
    })

    // === KROK 8: Nabídni placené zdroje ===
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

    // === KROK 9: Justice.cz — OR history + Sbírka listin ===
    if (result.freeData.organization?.ico) {
      try {
        const subject = await this.justice.getSubjectByIco(result.freeData.organization.ico)
        if (subject) {
          const [registryChanges, sbirkaListin] = await Promise.all([
            this.justice.getRegistryHistory(subject.subjektId),
            this.justice.getDocumentList(subject.subjektId),
          ])
          result.justice = {
            subject: {
              subjektId: subject.subjektId,
              spisovaZnacka: subject.spisovaZnacka,
              rejstrik: subject.rejstrik,
              soud: subject.soud,
            },
            registryChanges,
            sbirkaListin,
          }
          result.sources.push('JUSTICE_OR')
          result.qualityScore += 10

          // Persist to KB — upsert to preserve history
          const org = await this.prisma.kbOrganization.findUnique({
            where: { ico: result.freeData.organization.ico },
          })
          if (org) {
            for (const change of registryChanges.slice(0, 20)) {
              const changeDate = change.changeDate ? new Date(change.changeDate) : null
              if (!changeDate) continue // null changeDate breaks unique constraint
              await this.prisma.kbRegistryChange.upsert({
                where: {
                  organizationId_changeDate_changeType: {
                    organizationId: org.id,
                    changeDate: changeDate!,
                    changeType: change.changeType,
                  },
                },
                create: {
                  organizationId: org.id,
                  changeDate,
                  changeType: change.changeType,
                  description: change.description,
                },
                update: {
                  description: change.description,
                },
              }).catch(() => {})
            }
            for (const doc of sbirkaListin.slice(0, 30)) {
              if (!doc.documentId) continue // skip docs without justiceDocId
              await this.prisma.kbSbirkaListina.upsert({
                where: {
                  organizationId_justiceDocId: {
                    organizationId: org.id,
                    justiceDocId: doc.documentId,
                  },
                },
                create: {
                  organizationId: org.id,
                  documentType: doc.documentType,
                  documentName: doc.documentName,
                  filingDate: doc.filingDate ? new Date(doc.filingDate) : null,
                  periodFrom: doc.periodFrom ? new Date(doc.periodFrom) : null,
                  periodTo: doc.periodTo ? new Date(doc.periodTo) : null,
                  justiceDocId: doc.documentId,
                  downloadUrl: doc.downloadUrl,
                },
                update: {
                  documentName: doc.documentName,
                  downloadUrl: doc.downloadUrl,
                },
              }).catch(() => {})
            }
          }
        }
      } catch (err) {
        this.logger.debug(`Justice.cz enrichment failed: ${err}`)
      }
    }

    result.qualityScore = Math.min(result.qualityScore, 100)

    // Cache enrichment data on Building
    if (result.buildingId) {
      await this.prisma.building.update({
        where: { id: result.buildingId },
        data: {
          enrichmentData: JSON.parse(JSON.stringify({
            poi: result.nearbyPOI ?? null,
            risks: result.risks ?? null,
            priceEstimate: result.priceEstimate ?? null,
            visual: result.visual ?? null,
            conditionPrediction: result.conditionPrediction ?? null,
            checklist: result.checklist ?? null,
            paidDataAvailable: result.paidDataAvailable ?? null,
          })),
          enrichedAt: new Date(),
          dataQualityScore: result.qualityScore,
        },
      }).catch(err => this.logger.debug(`Failed to cache enrichment data: ${err}`))
    }

    return result
  }

  private getOrthoBbox(lat: number, lng: number, radiusMeters = 80) {
    const dLat = radiusMeters / 111320
    const dLng = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180))
    return { latMin: lat - dLat, latMax: lat + dLat, lngMin: lng - dLng, lngMax: lng + dLng }
  }
}

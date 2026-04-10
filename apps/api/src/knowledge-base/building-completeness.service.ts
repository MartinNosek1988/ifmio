import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export interface CompletenessField {
  key: string
  label: string
  present: boolean
  value?: string | number | null
  source: string
}

export interface CompletenessCategory {
  key: string
  label: string
  status: 'complete' | 'partial' | 'missing'
  score: number
  fields: CompletenessField[]
}

export interface BuildingCompleteness {
  buildingId: string
  overallScore: number
  categories: CompletenessCategory[]
  missingCount: number
  totalCount: number
}

@Injectable()
export class BuildingCompletenessService {
  constructor(private prisma: PrismaService) {}

  async getCompleteness(buildingId: string): Promise<BuildingCompleteness> {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        managingOrg: {
          include: {
            statutoryBodies: { take: 1, select: { id: true } },
            sbirkaListiny: { take: 1, select: { id: true } },
          },
        },
        units: { select: { id: true, area: true } },
      },
    })

    if (!building) throw new NotFoundException(`Budova ${buildingId} nebyla nalezena`)

    const enrichment = (building.enrichmentData as any) ?? {}
    const categories: CompletenessCategory[] = []

    // ADDRESS (weight 20)
    const addressFields: CompletenessField[] = [
      { key: 'street', label: 'Ulice', present: !!building.street, value: building.street, source: 'RÚIAN' },
      { key: 'houseNumber', label: 'Číslo popisné', present: !!building.houseNumber, value: building.houseNumber, source: 'RÚIAN' },
      { key: 'city', label: 'Město', present: !!building.city, value: building.city, source: 'RÚIAN' },
      { key: 'district', label: 'Městská část', present: !!building.district, value: building.district, source: 'RÚIAN' },
      { key: 'postalCode', label: 'PSČ', present: !!building.postalCode, value: building.postalCode, source: 'RÚIAN' },
      { key: 'cadastralTerritoryName', label: 'Katastrální území', present: !!building.cadastralTerritoryName, value: building.cadastralTerritoryName, source: 'RÚIAN' },
    ]
    categories.push(this.buildCategory('address', 'Adresa', addressFields, 20))

    // RUIAN (weight 20)
    const ruianFields: CompletenessField[] = [
      { key: 'lat', label: 'GPS šířka', present: building.lat != null, value: building.lat, source: 'RÚIAN' },
      { key: 'lng', label: 'GPS délka', present: building.lng != null, value: building.lng, source: 'RÚIAN' },
      { key: 'numberOfUnits', label: 'Počet jednotek', present: building.numberOfUnits != null, value: building.numberOfUnits, source: 'RÚIAN' },
      { key: 'numberOfFloors', label: 'Počet podlaží', present: building.numberOfFloors != null, value: building.numberOfFloors, source: 'RÚIAN' },
      { key: 'builtUpArea', label: 'Zastavěná plocha', present: building.builtUpArea != null, value: building.builtUpArea != null ? Number(building.builtUpArea) : null, source: 'RÚIAN' },
      { key: 'ruianBuildingId', label: 'RÚIAN ID', present: !!building.ruianBuildingId, value: building.ruianBuildingId, source: 'RÚIAN' },
    ]
    categories.push(this.buildCategory('ruian', 'RÚIAN', ruianFields, 20))

    // ARES (weight 20)
    const org = building.managingOrg
    const aresFields: CompletenessField[] = [
      { key: 'hasOrg', label: 'Organizace', present: !!org, value: org?.name ?? null, source: 'ARES' },
      { key: 'ico', label: 'IČO', present: !!org?.ico, value: org?.ico ?? null, source: 'ARES' },
      { key: 'legalForm', label: 'Právní forma', present: !!org?.legalFormName, value: org?.legalFormName ?? null, source: 'ARES' },
    ]
    categories.push(this.buildCategory('ares', 'ARES', aresFields, 20))

    // JUSTICE (weight 15)
    const justiceFields: CompletenessField[] = [
      { key: 'statutoryBodies', label: 'Statutární orgán', present: (org?.statutoryBodies?.length ?? 0) > 0, value: org?.statutoryBodies?.length ?? 0, source: 'Justice.cz' },
      { key: 'sbirkaListiny', label: 'Sbírka listin', present: (org?.sbirkaListiny?.length ?? 0) > 0, value: org?.sbirkaListiny?.length ?? 0, source: 'Justice.cz' },
    ]
    categories.push(this.buildCategory('justice', 'Justice.cz', justiceFields, 15))

    // UNITS (weight 15)
    const unitCount = building.units?.length ?? 0
    const unitsWithArea = building.units?.filter(u => u.area && Number(u.area) > 0).length ?? 0
    const unitsFields: CompletenessField[] = [
      { key: 'unitCount', label: 'Počet jednotek v KB', present: unitCount > 0, value: unitCount, source: 'ČÚZK' },
      { key: 'unitsWithArea', label: 'Jednotky s plochou', present: unitsWithArea > 0, value: unitsWithArea, source: 'ČÚZK' },
    ]
    categories.push(this.buildCategory('units', 'Jednotky', unitsFields, 15))

    // RISKS (weight 5)
    const risks = enrichment.risks ?? {}
    const risksFields: CompletenessField[] = [
      { key: 'flood', label: 'Záplavová zóna', present: risks.flood != null, value: risks.flood ?? null, source: 'GeoRisk' },
      { key: 'radon', label: 'Radon', present: risks.radon != null, value: risks.radon ?? null, source: 'GeoRisk' },
    ]
    categories.push(this.buildCategory('risks', 'Rizika', risksFields, 5))

    // POI (weight 5)
    const poi = enrichment.poi ?? []
    const poiFields: CompletenessField[] = [
      { key: 'poi', label: 'Body zájmu', present: Array.isArray(poi) && poi.length > 0, value: Array.isArray(poi) ? poi.length : 0, source: 'Enrichment' },
    ]
    categories.push(this.buildCategory('poi', 'POI', poiFields, 5))

    const totalCount = categories.reduce((s, c) => s + c.fields.length, 0)
    const missingCount = categories.reduce((s, c) => s + c.fields.filter(f => !f.present).length, 0)
    const overallScore = Math.round(categories.reduce((s, c) => s + c.score, 0))

    return { buildingId, overallScore, categories, missingCount, totalCount }
  }

  async getCompletenessSummary(ids: string[]): Promise<Record<string, { score: number; missingCount: number; unitCount: number }>> {
    const buildings = await this.prisma.building.findMany({
      where: { id: { in: ids.slice(0, 100) } },
      select: {
        id: true,
        dataQualityScore: true,
        _count: { select: { units: true } },
      },
    })

    const result: Record<string, { score: number; missingCount: number; unitCount: number }> = {}
    for (const b of buildings) {
      result[b.id] = {
        score: Math.round(b.dataQualityScore ?? 0),
        missingCount: 0,
        unitCount: b._count.units,
      }
    }
    return result
  }

  private buildCategory(key: string, label: string, fields: CompletenessField[], weight: number): CompletenessCategory {
    const present = fields.filter(f => f.present).length
    const total = fields.length
    const ratio = total > 0 ? present / total : 0
    const score = Math.round(ratio * weight)
    const status: 'complete' | 'partial' | 'missing' =
      ratio === 1 ? 'complete' : ratio > 0 ? 'partial' : 'missing'
    return { key, label, status, score, fields }
  }
}

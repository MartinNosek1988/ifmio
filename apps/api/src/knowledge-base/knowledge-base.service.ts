import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Building, KbOrganization, KbOrgType } from '@prisma/client'

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name)

  constructor(private prisma: PrismaService) {}

  async findOrCreateBuilding(data: {
    street?: string
    city: string
    district?: string
    postalCode?: string
    lat?: number
    lng?: number
    ruianBuildingId?: string
    fullAddress?: string
  }): Promise<Building> {
    // 1. Match by RÚIAN ID (most precise)
    if (data.ruianBuildingId) {
      const existing = await this.prisma.building.findUnique({
        where: { ruianBuildingId: data.ruianBuildingId },
      })
      if (existing) return existing
    }

    // 2. Match by full street name (without house number) + exact city
    if (data.street && data.city) {
      const streetName = data.street.replace(/\s+\d+[\w/\s-]*$/, '').trim()
      if (streetName.length >= 3) {
        const existing = await this.prisma.building.findFirst({
          where: {
            street: { contains: streetName, mode: 'insensitive' },
            city: { equals: data.city, mode: 'insensitive' },
          },
        })
        if (existing) return existing
      }
    }

    // 3. Create new
    return this.prisma.building.create({
      data: {
        street: data.street,
        city: data.city,
        district: data.district,
        postalCode: data.postalCode,
        lat: data.lat,
        lng: data.lng,
        ruianBuildingId: data.ruianBuildingId,
        fullAddress: data.fullAddress,
        parcelNumbers: [],
        dataQualityScore: this.calculateQuality(data),
        lastEnrichedAt: new Date(),
      },
    })
  }

  async findOrCreateOrganization(
    ico: string,
    aresData?: Record<string, unknown>,
  ): Promise<KbOrganization> {
    const existing = await this.prisma.kbOrganization.findUnique({ where: { ico } })

    if (existing) {
      if (aresData) {
        return this.prisma.kbOrganization.update({
          where: { ico },
          data: {
            name: String(aresData.obchodniJmeno || aresData.nazev || existing.name),
            dic: aresData.dic ? String(aresData.dic) : existing.dic,
            isVatPayer: !!aresData.dic,
            isActive: !aresData.datumZaniku,
            dateCancelled: aresData.datumZaniku ? new Date(String(aresData.datumZaniku)) : null,
            lastAresSync: new Date(),
          },
        })
      }
      return existing
    }

    return this.prisma.kbOrganization.create({
      data: {
        ico,
        name: String(aresData?.obchodniJmeno || aresData?.nazev || `IČO ${ico}`),
        dic: aresData?.dic ? String(aresData.dic) : null,
        isVatPayer: !!aresData?.dic,
        isActive: !aresData?.datumZaniku,
        dateCancelled: aresData?.datumZaniku ? new Date(String(aresData.datumZaniku)) : null,
        orgType: this.detectOrgType(aresData?.pravniForma as string | undefined, aresData?.pravniFormaKod as number | undefined),
        lastAresSync: aresData ? new Date() : null,
        czNace: [],
        dataQualityScore: aresData ? 60 : 10,
      },
    })
  }

  async linkPropertyToBuilding(propertyId: string, buildingId: string): Promise<void> {
    await this.prisma.property.update({
      where: { id: propertyId },
      data: { buildingId },
    })
  }

  async getStats() {
    const [buildings, units, organizations, persons] = await Promise.all([
      this.prisma.building.count(),
      this.prisma.buildingUnit.count(),
      this.prisma.kbOrganization.count(),
      this.prisma.kbPerson.count(),
    ])

    const avgQuality = await this.prisma.building.aggregate({
      _avg: { dataQualityScore: true },
    })

    return {
      buildings,
      units,
      organizations,
      persons,
      avgQualityScore: Math.round(avgQuality._avg.dataQualityScore ?? 0),
    }
  }

  async getBuildingUnit(buildingId: string, unitId: string) {
    const unit = await this.prisma.buildingUnit.findFirst({
      where: { id: unitId, buildingId },
      include: {
        building: {
          select: { id: true, street: true, houseNumber: true, orientationNumber: true, city: true, district: true, managingOrgId: true },
        },
        ownerships: {
          include: {
            person: { select: { id: true, firstName: true, lastName: true, titulPred: true, titulZa: true } },
            organization: { select: { id: true, name: true, ico: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        // KB endpoint is SUPER_ADMIN only — showing all linked tenants intentionally
        units: {
          select: { id: true, name: true, propertyId: true, property: { select: { id: true, name: true, tenantId: true } } },
          take: 10,
        },
      },
    })

    if (!unit) throw new NotFoundException('Jednotka nenalezena')
    return unit
  }

  async updateBuildingUnit(buildingId: string, unitId: string, dto: { area?: number | null; floor?: number | null; roomLayout?: string | null }) {
    const unit = await this.prisma.buildingUnit.findFirst({ where: { id: unitId, buildingId } })
    if (!unit) throw new NotFoundException('Jednotka nenalezena')

    return this.prisma.buildingUnit.update({
      where: { id: unitId },
      data: {
        ...(dto.area !== undefined ? { area: dto.area } : {}),
        ...(dto.floor !== undefined ? { floor: dto.floor } : {}),
        ...(dto.roomLayout !== undefined ? { roomLayout: dto.roomLayout } : {}),
      },
    })
  }

  private calculateQuality(data: Partial<Building>): number {
    let score = 0
    if (data.street) score += 10
    if (data.city) score += 10
    if (data.postalCode) score += 5
    if (data.lat && data.lng) score += 15
    if (data.ruianBuildingId) score += 15
    if (data.district) score += 5
    if (data.fullAddress) score += 5
    return Math.min(score, 100)
  }

  detectOrgType(legalFormName?: string, legalFormCode?: number): KbOrgType | null {
    // Check numeric code first (most reliable)
    if (legalFormCode === 145) return 'SVJ'
    if (legalFormCode === 110) return 'BD'
    if (legalFormCode === 112) return 'SRO'
    if (legalFormCode === 121) return 'AS'
    // Fallback to text matching
    if (!legalFormName) return null
    const lower = legalFormName.toLowerCase()
    if (lower.includes('společenství vlastníků') || lower.includes('spolecenstvi vlastniku')) return 'SVJ'
    if (lower.includes('družstvo') || lower.includes('druzstvo')) return 'BD'
    if (lower.includes('s.r.o.') || lower.includes('společnost s ručením')) return 'SRO'
    if (lower.includes('a.s.') || lower.includes('akciová')) return 'AS'
    return 'OTHER_ORG'
  }
}

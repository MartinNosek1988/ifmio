import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KnowledgeBaseService } from './knowledge-base.service'

@Injectable()
export class BuildingEnrichmentService {
  private readonly logger = new Logger(BuildingEnrichmentService.name)

  constructor(
    private kb: KnowledgeBaseService,
    private prisma: PrismaService,
  ) {}

  /**
   * Async enrichment pipeline — called after Property creation.
   * Non-blocking: failures are logged but don't affect the caller.
   */
  async enrichFromProperty(property: {
    id: string
    address?: string
    city?: string
    postalCode?: string
    ico?: string | null
    district?: string
    lat?: number
    lng?: number
    ruianCode?: string
  }): Promise<void> {
    if (!property.city) {
      this.logger.debug(`Skipping KB enrichment for property ${property.id} — no city`)
      return
    }

    try {
      // 1. Find or create Building
      const building = await this.kb.findOrCreateBuilding({
        street: property.address,
        city: property.city || '',
        district: property.district,
        postalCode: property.postalCode,
        lat: property.lat,
        lng: property.lng,
        ruianBuildingId: property.ruianCode,
      })

      // 2. Link Property → Building
      await this.kb.linkPropertyToBuilding(property.id, building.id)

      // 3. Log source
      await this.prisma.buildingSource.create({
        data: {
          buildingId: building.id,
          source: 'MANUAL',
          fieldsUpdated: ['street', 'city', 'postalCode', 'district'],
        },
      })

      // 4. If has IČO → enrich Organization
      if (property.ico) {
        await this.enrichOrganization(property.ico, building.id)
      }

      this.logger.log(`KB enrichment OK for property ${property.id} → building ${building.id}`)
    } catch (error) {
      this.logger.warn(`KB enrichment failed for property ${property.id}: ${error}`)
    }
  }

  private async enrichOrganization(ico: string, buildingId: string): Promise<void> {
    try {
      const org = await this.kb.findOrCreateOrganization(ico)

      // Link Building → managing Organization
      await this.prisma.building.update({
        where: { id: buildingId },
        data: { managingOrgId: org.id },
      })

      // Log source
      await this.prisma.organizationSource.create({
        data: {
          organizationId: org.id,
          source: 'MANUAL',
          fieldsUpdated: ['ico'],
        },
      })
    } catch (error) {
      this.logger.warn(`Organization enrichment failed for IČO ${ico}: ${error}`)
    }
  }
}

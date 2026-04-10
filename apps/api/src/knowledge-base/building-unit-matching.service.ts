import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BuildingUnitMatchingService {
  private readonly logger = new Logger(BuildingUnitMatchingService.name)

  constructor(private prisma: PrismaService) {}

  /** Find the best matching BuildingUnit for a business Unit */
  async findMatch(unit: { name: string; knDesignation?: string | null; propertyId: string }): Promise<string | null> {
    // 1. Get buildingId via Property
    const property = await this.prisma.property.findUnique({
      where: { id: unit.propertyId },
      select: { buildingId: true },
    })
    if (!property?.buildingId) return null

    // 2. Get all BuildingUnits for this building
    const buildingUnits = await this.prisma.buildingUnit.findMany({
      where: { buildingId: property.buildingId },
      select: { id: true, unitNumber: true },
    })
    if (buildingUnits.length === 0) return null

    // 3a. Exact match knDesignation <-> unitNumber
    if (unit.knDesignation) {
      const exact = buildingUnits.find(bu => bu.unitNumber === unit.knDesignation)
      if (exact) return exact.id
    }

    // 3b. Exact match name <-> unitNumber
    const byName = buildingUnits.find(bu => bu.unitNumber === unit.name)
    if (byName) return byName.id

    // 3c. Numeric match — extract trailing numbers
    const unitNum = this.extractNumber(unit.knDesignation || unit.name)
    if (unitNum !== null) {
      const byNumber = buildingUnits.find(bu => this.extractNumber(bu.unitNumber) === unitNum)
      if (byNumber) return byNumber.id
    }

    return null
  }

  /** After CUZK enrichment creates BuildingUnits, try to link existing Units */
  async linkUnitsToBuilding(buildingId: string): Promise<{ linked: number }> {
    const properties = await this.prisma.property.findMany({
      where: { buildingId },
      select: { id: true },
    })

    let linked = 0
    for (const prop of properties) {
      const unlinkedUnits = await this.prisma.unit.findMany({
        where: { propertyId: prop.id, buildingUnitId: null },
        select: { id: true, name: true, knDesignation: true, propertyId: true },
      })

      for (const unit of unlinkedUnits) {
        try {
          const matchId = await this.findMatch(unit)
          if (matchId) {
            await this.prisma.unit.update({
              where: { id: unit.id },
              data: { buildingUnitId: matchId },
            })
            linked++
            this.logger.log(`Linked Unit ${unit.id} -> BuildingUnit ${matchId}`)
          }
        } catch (err) {
          this.logger.warn(`Match failed for unit ${unit.id}: ${err}`)
        }
      }
    }
    return { linked }
  }

  /** Bulk migration: link all unlinked Units where Property has buildingId */
  async bulkLinkAll(dryRun = false): Promise<{ total: number; matched: number; unmatched: number; errors: number; dryRun: boolean }> {
    const unlinked = await this.prisma.unit.findMany({
      where: {
        buildingUnitId: null,
        property: { buildingId: { not: null } },
      },
      select: { id: true, name: true, knDesignation: true, propertyId: true },
    })

    let matched = 0, unmatched = 0, errors = 0

    for (const unit of unlinked) {
      try {
        const matchId = await this.findMatch(unit)
        if (matchId) {
          if (!dryRun) {
            await this.prisma.unit.update({
              where: { id: unit.id },
              data: { buildingUnitId: matchId },
            })
          }
          matched++
        } else {
          unmatched++
        }
      } catch {
        errors++
      }
    }

    this.logger.log(`Bulk link: ${matched} matched, ${unmatched} unmatched, ${errors} errors (dryRun=${dryRun})`)
    return { total: unlinked.length, matched, unmatched, errors, dryRun }
  }

  private extractNumber(s: string | null | undefined): number | null {
    if (!s) return null
    const match = s.match(/(\d+)$/)
    return match ? parseInt(match[1], 10) : null
  }
}

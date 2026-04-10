import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BuildingUnitMatchingService {
  private readonly logger = new Logger(BuildingUnitMatchingService.name)
  private propertyBuildingCache = new Map<string, string | null>()
  private buildingUnitsCache = new Map<string, { id: string; unitNumber: string | null }[]>()

  constructor(private prisma: PrismaService) {}

  clearCache() {
    this.propertyBuildingCache.clear()
    this.buildingUnitsCache.clear()
  }

  /** Find the best matching BuildingUnit for a business Unit */
  async findMatch(unit: { name: string; knDesignation?: string | null; propertyId: string }): Promise<string | null> {
    // 1. Get buildingId via Property (cached for bulk)
    let buildingId = this.propertyBuildingCache.get(unit.propertyId)
    if (buildingId === undefined) {
      const property = await this.prisma.property.findUnique({
        where: { id: unit.propertyId },
        select: { buildingId: true },
      })
      buildingId = property?.buildingId ?? null
      this.propertyBuildingCache.set(unit.propertyId, buildingId)
    }
    if (!buildingId) return null

    // 2. Get all BuildingUnits for this building (cached for bulk)
    let buildingUnits = this.buildingUnitsCache.get(buildingId)
    if (!buildingUnits) {
      buildingUnits = await this.prisma.buildingUnit.findMany({
        where: { buildingId },
        select: { id: true, unitNumber: true },
      })
      this.buildingUnitsCache.set(buildingId, buildingUnits)
    }
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
          const msg = err instanceof Error ? err.message : String(err)
          this.logger.warn(`Match failed for unit ${unit.id}: ${msg}`)
        }
      }
    }
    return { linked }
  }

  /** Bulk migration: link all unlinked Units (cursor-based batching) */
  async bulkLinkAll(dryRun = false): Promise<{ total: number; matched: number; unmatched: number; errors: number; dryRun: boolean }> {
    this.clearCache()
    const batchSize = 100
    const where = { buildingUnitId: null, property: { buildingId: { not: null } } } as any

    const total = await this.prisma.unit.count({ where })
    let matched = 0, unmatched = 0, errors = 0
    let cursor: string | undefined

    while (true) {
      const batch = await this.prisma.unit.findMany({
        where,
        select: { id: true, name: true, knDesignation: true, propertyId: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })
      if (batch.length === 0) break

      for (const unit of batch) {
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
        } catch { errors++ }
      }

      cursor = batch[batch.length - 1].id
    }

    this.clearCache()
    this.logger.log(`Bulk link: ${matched}/${total} matched, ${unmatched} unmatched, ${errors} errors (dryRun=${dryRun})`)
    return { total, matched, unmatched, errors, dryRun }
  }

  private extractNumber(s: string | null | undefined): number | null {
    if (!s) return null
    const match = s.match(/(\d+)$/)
    return match ? parseInt(match[1], 10) : null
  }
}

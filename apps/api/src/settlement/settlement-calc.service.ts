import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

interface UnitData {
  id: string
  heatedArea: number
  personCount: number
  meterReading: number  // heat meter
  waterReading: number  // hot water meter
}

@Injectable()
export class SettlementCalcService {
  private readonly logger = new Logger(SettlementCalcService.name)

  constructor(private prisma: PrismaService) {}

  async calculate(settlementId: string): Promise<void> {
    const settlement = await this.prisma.settlement.findUniqueOrThrow({
      where: { id: settlementId },
      include: {
        costEntries: true,
        items: { include: { unit: true } },
        property: { include: { units: true } },
      },
    })

    const units: UnitData[] = settlement.items.map(item => ({
      id: item.unitId,
      heatedArea: Number(item.heatedArea ?? item.unit.heatingArea ?? item.unit.area ?? 0),
      personCount: item.personCount ?? item.unit.personCount ?? 1,
      meterReading: Number(item.meterReading ?? 0),
      waterReading: Number(item.waterReading ?? 0),
    }))

    const totalHeatedArea = units.reduce((s, u) => s + u.heatedArea, 0)
    if (totalHeatedArea <= 0) {
      this.logger.warn(`Settlement ${settlementId}: totalHeatedArea is 0, cannot calculate`)
      return
    }

    // Accumulate costs per unit
    const unitCosts: Record<string, {
      heatingBasic: number; heatingConsumption: number; heatingCorrected: number
      hotWaterBasic: number; hotWaterConsumption: number
      otherCosts: number; breakdown: Array<{ costType: string; amount: number; key: string }>
    }> = {}

    for (const u of units) {
      unitCosts[u.id] = {
        heatingBasic: 0, heatingConsumption: 0, heatingCorrected: 0,
        hotWaterBasic: 0, hotWaterConsumption: 0,
        otherCosts: 0, breakdown: [],
      }
    }

    // Process each cost entry
    for (const cost of settlement.costEntries) {
      const totalAmount = Number(cost.totalAmount)

      if (cost.costType === 'heating') {
        const result = this.calculateHeating(totalAmount, cost.basicPercent ?? settlement.heatingBasicPercent, units, totalHeatedArea)
        for (const [unitId, values] of result) {
          unitCosts[unitId].heatingBasic += values.basic
          unitCosts[unitId].heatingConsumption += values.consumption
          unitCosts[unitId].heatingCorrected += values.corrected
        }
      } else if (cost.costType === 'hot_water') {
        const result = this.calculateHotWater(totalAmount, settlement.hotWaterBasicPercent, units, totalHeatedArea)
        for (const [unitId, values] of result) {
          unitCosts[unitId].hotWaterBasic += values.basic
          unitCosts[unitId].hotWaterConsumption += values.consumption
        }
      } else {
        const result = this.calculateServiceCost(totalAmount, cost.distributionKey, units, totalHeatedArea)
        for (const [unitId, amount] of result) {
          unitCosts[unitId].otherCosts += amount
          unitCosts[unitId].breakdown.push({ costType: cost.costType, amount, key: cost.distributionKey })
        }
      }
    }

    // Get advances per unit
    const advances = await this.getUnitAdvances(
      settlement.tenantId, settlement.propertyId,
      settlement.periodFrom, settlement.periodTo,
    )

    // Update each settlement item
    for (const item of settlement.items) {
      const c = unitCosts[item.unitId]
      if (!c) continue

      const heatingTotal = c.heatingCorrected > 0 ? c.heatingCorrected : (c.heatingBasic + c.heatingConsumption)
      const hotWaterTotal = c.hotWaterBasic + c.hotWaterConsumption
      const totalCost = heatingTotal + hotWaterTotal + c.otherCosts
      const totalAdv = advances.get(item.unitId) ?? 0
      const balance = totalAdv - totalCost // positive = overpayment

      await this.prisma.settlementItem.update({
        where: { id: item.id },
        data: {
          heatingBasic: this.round2(c.heatingBasic),
          heatingConsumption: this.round2(c.heatingConsumption),
          heatingTotal: this.round2(heatingTotal),
          heatingCorrected: this.round2(c.heatingCorrected),
          hotWaterBasic: this.round2(c.hotWaterBasic),
          hotWaterConsumption: this.round2(c.hotWaterConsumption),
          hotWaterTotal: this.round2(hotWaterTotal),
          otherCosts: this.round2(c.otherCosts),
          totalCost: this.round2(totalCost),
          totalAdvances: this.round2(totalAdv),
          balance: this.round2(balance),
          costBreakdown: c.breakdown,
        },
      })
    }

    // Update settlement
    await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'calculated',
        calculatedAt: new Date(),
        totalHeatedArea: this.round2(totalHeatedArea),
      },
    })
  }

  // ─── Heating calculation per vyhláška 269/2015 + novela 274/2023 ───

  private calculateHeating(
    totalCost: number, basicPercent: number, units: UnitData[], totalHeatedArea: number,
  ): Map<string, { basic: number; consumption: number; corrected: number }> {
    const result = new Map<string, { basic: number; consumption: number; corrected: number }>()

    const basicTotal = totalCost * basicPercent / 100
    const consumptionTotal = totalCost - basicTotal

    // Total meter readings
    const totalReadings = units.reduce((s, u) => s + u.meterReading, 0)
    const hasMeters = totalReadings > 0

    for (const u of units) {
      const areaShare = totalHeatedArea > 0 ? u.heatedArea / totalHeatedArea : 0
      const basic = basicTotal * areaShare

      let consumption: number
      if (hasMeters && u.meterReading > 0) {
        consumption = consumptionTotal * (u.meterReading / totalReadings)
      } else {
        // No meter: distribute consumption by heated area
        consumption = consumptionTotal * areaShare
      }

      result.set(u.id, { basic, consumption, corrected: 0 })
    }

    // 70-200% correction (vyhláška 269/2015 §4 odst. 5)
    const avgCostPerM2 = totalCost / totalHeatedArea
    const minPerM2 = avgCostPerM2 * 0.7
    const maxPerM2 = avgCostPerM2 * 2.0

    let correctionNeeded = false
    const corrected = new Map<string, number>()
    let totalRedistribute = 0
    let uncorrectedArea = 0

    for (const u of units) {
      const r = result.get(u.id)!
      const unitTotal = r.basic + r.consumption
      const unitPerM2 = u.heatedArea > 0 ? unitTotal / u.heatedArea : 0

      if (unitPerM2 < minPerM2 && u.heatedArea > 0) {
        const correctedTotal = minPerM2 * u.heatedArea
        corrected.set(u.id, correctedTotal)
        totalRedistribute += correctedTotal - unitTotal // positive: this unit pays more
        correctionNeeded = true
      } else if (unitPerM2 > maxPerM2 && u.heatedArea > 0) {
        const correctedTotal = maxPerM2 * u.heatedArea
        corrected.set(u.id, correctedTotal)
        totalRedistribute += correctedTotal - unitTotal // negative: this unit pays less
        correctionNeeded = true
      } else {
        uncorrectedArea += u.heatedArea
      }
    }

    if (correctionNeeded && uncorrectedArea > 0) {
      // Redistribute the difference to uncorrected units proportionally by area
      for (const u of units) {
        const r = result.get(u.id)!
        if (corrected.has(u.id)) {
          r.corrected = corrected.get(u.id)!
        } else {
          const areaShare = u.heatedArea / uncorrectedArea
          r.corrected = r.basic + r.consumption - (totalRedistribute * areaShare)
        }
      }
    }

    return result
  }

  // ─── Hot water calculation ────────────────────────────────────────

  private calculateHotWater(
    totalCost: number, basicPercent: number, units: UnitData[], totalHeatedArea: number,
  ): Map<string, { basic: number; consumption: number }> {
    const result = new Map<string, { basic: number; consumption: number }>()

    const basicTotal = totalCost * basicPercent / 100
    const consumptionTotal = totalCost - basicTotal

    const totalWaterReadings = units.reduce((s, u) => s + u.waterReading, 0)
    const hasWaterMeters = totalWaterReadings > 0
    const totalPersons = units.reduce((s, u) => s + u.personCount, 0)

    for (const u of units) {
      const areaShare = totalHeatedArea > 0 ? u.heatedArea / totalHeatedArea : 0
      const basic = basicTotal * areaShare

      let consumption: number
      if (hasWaterMeters && u.waterReading > 0) {
        consumption = consumptionTotal * (u.waterReading / totalWaterReadings)
      } else {
        // No water meter: distribute by person count
        consumption = totalPersons > 0 ? consumptionTotal * (u.personCount / totalPersons) : 0
      }

      result.set(u.id, { basic, consumption })
    }

    return result
  }

  // ─── Generic service cost distribution ────────────────────────────

  private calculateServiceCost(
    totalCost: number, distributionKey: string, units: UnitData[], totalHeatedArea: number,
  ): Map<string, number> {
    const result = new Map<string, number>()

    const totalPersons = units.reduce((s, u) => s + u.personCount, 0)
    const totalArea = units.reduce((s, u) => s + u.heatedArea, 0)

    for (const u of units) {
      let share = 0

      switch (distributionKey) {
        case 'heated_area':
        case 'floor_area':
          share = totalArea > 0 ? u.heatedArea / totalArea : 0
          break
        case 'person_count':
          share = totalPersons > 0 ? u.personCount / totalPersons : 0
          break
        case 'equal':
          share = units.length > 0 ? 1 / units.length : 0
          break
        case 'meter_reading':
          // For water: use waterReading; for others: use meterReading
          const totalReadings = units.reduce((s, u2) => s + u2.waterReading, 0)
          share = totalReadings > 0 ? u.waterReading / totalReadings : (totalArea > 0 ? u.heatedArea / totalArea : 0)
          break
        default:
          share = totalArea > 0 ? u.heatedArea / totalArea : 0
      }

      result.set(u.id, totalCost * share)
    }

    return result
  }

  // ─── Get advances per unit ────────────────────────────────────────

  private async getUnitAdvances(
    tenantId: string, propertyId: string, periodFrom: Date, periodTo: Date,
  ): Promise<Map<string, number>> {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        propertyId,
        unitId: { not: null },
        validFrom: { gte: periodFrom },
        validTo: { lte: periodTo },
      },
      select: { unitId: true, amount: true },
    })

    const map = new Map<string, number>()
    for (const p of prescriptions) {
      if (!p.unitId) continue
      map.set(p.unitId, (map.get(p.unitId) ?? 0) + Number(p.amount))
    }
    return map
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100
  }
}

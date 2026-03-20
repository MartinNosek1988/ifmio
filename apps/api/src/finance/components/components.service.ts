import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import type { CreateComponentDto, UpdateComponentDto } from './dto/component.dto'

@Injectable()
export class ComponentsService {
  constructor(private prisma: PrismaService) {}

  // ─── LIST COMPONENTS ──────────────────────────────────────────

  async listComponents(
    tenantId: string,
    propertyId: string,
    options?: { activeOnly?: boolean },
  ) {
    const where: Record<string, unknown> = { tenantId, propertyId }
    if (options?.activeOnly !== false) {
      where.isActive = true
    }

    const rows = await this.prisma.prescriptionComponent.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { assignments: true } } },
    })

    return rows.map((r) => ({
      ...r,
      defaultAmount: Number(r.defaultAmount),
    }))
  }

  // ─── GET COMPONENT ────────────────────────────────────────────

  async getComponent(tenantId: string, componentId: string) {
    const row = await this.prisma.prescriptionComponent.findFirst({
      where: { id: componentId, tenantId },
      include: {
        assignments: {
          include: { unit: { select: { id: true, name: true, area: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!row) throw new NotFoundException('Složka předpisu nenalezena')

    return {
      ...row,
      defaultAmount: Number(row.defaultAmount),
      assignments: row.assignments.map((a) => ({
        ...a,
        overrideAmount: a.overrideAmount != null ? Number(a.overrideAmount) : null,
      })),
    }
  }

  // ─── CREATE COMPONENT ─────────────────────────────────────────

  async createComponent(
    tenantId: string,
    propertyId: string,
    dto: CreateComponentDto,
  ) {
    const row = await this.prisma.prescriptionComponent.create({
      data: {
        tenantId,
        propertyId,
        name: dto.name,
        code: dto.code,
        componentType: dto.componentType as never,
        calculationMethod: dto.calculationMethod as never,
        allocationMethod: (dto.allocationMethod as never) ?? 'area',
        defaultAmount: new Decimal(dto.defaultAmount),
        vatRate: dto.vatRate ?? 0,
        description: dto.description,
        accountingCode: dto.accountingCode,
        sortOrder: dto.sortOrder ?? 0,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    })

    return { ...row, defaultAmount: Number(row.defaultAmount) }
  }

  // ─── UPDATE COMPONENT ─────────────────────────────────────────

  async updateComponent(
    tenantId: string,
    componentId: string,
    dto: UpdateComponentDto,
  ) {
    const existing = await this.prisma.prescriptionComponent.findFirst({
      where: { id: componentId, tenantId },
    })
    if (!existing) throw new NotFoundException('Složka předpisu nenalezena')

    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.code !== undefined) data.code = dto.code
    if (dto.componentType !== undefined) data.componentType = dto.componentType
    if (dto.calculationMethod !== undefined) data.calculationMethod = dto.calculationMethod
    if (dto.allocationMethod !== undefined) data.allocationMethod = dto.allocationMethod
    if (dto.defaultAmount !== undefined) data.defaultAmount = new Decimal(dto.defaultAmount)
    if (dto.vatRate !== undefined) data.vatRate = dto.vatRate
    if (dto.description !== undefined) data.description = dto.description
    if (dto.accountingCode !== undefined) data.accountingCode = dto.accountingCode
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder
    if (dto.effectiveFrom !== undefined) data.effectiveFrom = new Date(dto.effectiveFrom)
    if (dto.effectiveTo !== undefined) data.effectiveTo = new Date(dto.effectiveTo)

    const row = await this.prisma.prescriptionComponent.update({
      where: { id: componentId },
      data,
    })

    return { ...row, defaultAmount: Number(row.defaultAmount) }
  }

  // ─── ARCHIVE COMPONENT ───────────────────────────────────────

  async archiveComponent(tenantId: string, componentId: string) {
    const existing = await this.prisma.prescriptionComponent.findFirst({
      where: { id: componentId, tenantId },
    })
    if (!existing) throw new NotFoundException('Složka předpisu nenalezena')

    const row = await this.prisma.prescriptionComponent.update({
      where: { id: componentId },
      data: { isActive: false, effectiveTo: new Date() },
    })

    return { ...row, defaultAmount: Number(row.defaultAmount) }
  }

  // ─── ASSIGN TO UNITS ─────────────────────────────────────────

  async assignToUnits(
    tenantId: string,
    componentId: string,
    unitIds: string[],
    effectiveFrom: Date,
    overrideAmount?: number,
  ) {
    const component = await this.prisma.prescriptionComponent.findFirst({
      where: { id: componentId, tenantId },
    })
    if (!component) throw new NotFoundException('Složka předpisu nenalezena')

    let created = 0
    let skipped = 0

    for (const unitId of unitIds) {
      const existing = await this.prisma.componentAssignment.findFirst({
        where: { componentId, unitId, isActive: true },
      })

      if (existing) {
        skipped++
        continue
      }

      await this.prisma.componentAssignment.create({
        data: {
          tenantId,
          componentId,
          unitId,
          effectiveFrom,
          overrideAmount: overrideAmount != null ? new Decimal(overrideAmount) : null,
          isActive: true,
        },
      })
      created++
    }

    return { created, skipped }
  }

  // ─── REMOVE ASSIGNMENT ────────────────────────────────────────

  async removeAssignment(tenantId: string, assignmentId: string) {
    const existing = await this.prisma.componentAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    })
    if (!existing) throw new NotFoundException('Přiřazení nenalezeno')

    return this.prisma.componentAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false, effectiveTo: new Date() },
    })
  }

  // ─── UPDATE ASSIGNMENT OVERRIDE ───────────────────────────────

  async updateAssignmentOverride(
    tenantId: string,
    assignmentId: string,
    overrideAmount: number | null,
    note?: string,
  ) {
    const existing = await this.prisma.componentAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    })
    if (!existing) throw new NotFoundException('Přiřazení nenalezeno')

    const row = await this.prisma.componentAssignment.update({
      where: { id: assignmentId },
      data: {
        overrideAmount: overrideAmount != null ? new Decimal(overrideAmount) : null,
        note: note !== undefined ? note : undefined,
      },
    })

    return {
      ...row,
      overrideAmount: row.overrideAmount != null ? Number(row.overrideAmount) : null,
    }
  }

  // ─── GET UNIT COMPONENTS ──────────────────────────────────────

  async getUnitComponents(tenantId: string, unitId: string, asOfDate?: Date) {
    const date = asOfDate ?? new Date()

    const assignments = await this.prisma.componentAssignment.findMany({
      where: {
        tenantId,
        unitId,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: date } },
        ],
        component: { isActive: true },
      },
      include: {
        component: true,
      },
      orderBy: { component: { sortOrder: 'asc' } },
    })

    return assignments.map((a) => ({
      ...a,
      overrideAmount: a.overrideAmount != null ? Number(a.overrideAmount) : null,
      component: {
        ...a.component,
        defaultAmount: Number(a.component.defaultAmount),
      },
    }))
  }

  // ─── CALCULATE UNIT PRESCRIPTION ──────────────────────────────

  async calculateUnitPrescription(
    tenantId: string,
    unitId: string,
    asOfDate?: Date,
  ) {
    const date = asOfDate ?? new Date()
    const assignments = await this.getUnitComponents(tenantId, unitId, date)

    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId },
      select: {
        id: true,
        name: true,
        area: true,
        heatingArea: true,
        personCount: true,
        commonAreaShare: true,
      },
    })
    if (!unit) throw new NotFoundException('Jednotka nenalezena')

    // Load active occupancy personCount (overrides unit.personCount)
    const activeOccupancy = await this.prisma.occupancy.findFirst({
      where: {
        unitId,
        tenantId,
        isActive: true,
        startDate: { lte: date },
        OR: [
          { endDate: null },
          { endDate: { gt: date } },
        ],
      },
      select: { personCount: true },
      orderBy: { startDate: 'desc' },
    })

    const effectivePersonCount =
      activeOccupancy?.personCount ?? unit.personCount ?? 1

    const items: Array<{
      componentId: string
      componentName: string
      componentType: string
      calculationMethod: string
      amount: number
      calculationDetail: string
    }> = []

    for (const assignment of assignments) {
      const comp = assignment.component
      const rate = new Decimal(comp.defaultAmount)
      let amount: Decimal | null = null
      let detail = ''

      if (assignment.overrideAmount != null) {
        amount = new Decimal(assignment.overrideAmount)
        detail = `individuální: ${amount.toFixed(2)} Kč`
      } else {
        switch (comp.calculationMethod) {
          case 'FIXED':
            amount = rate
            detail = `pevná: ${rate.toFixed(2)} Kč`
            break

          case 'PER_AREA':
            if (unit.area == null) continue
            amount = rate.mul(unit.area)
            detail = `${rate.toFixed(2)} × ${unit.area} m² = ${amount.toDecimalPlaces(2).toFixed(2)} Kč`
            break

          case 'PER_HEATING_AREA': {
            const area = unit.heatingArea ?? unit.area
            if (area == null) continue
            amount = rate.mul(area)
            detail = `${rate.toFixed(2)} × ${area} m² = ${amount.toDecimalPlaces(2).toFixed(2)} Kč`
            break
          }

          case 'PER_PERSON':
            amount = rate.mul(effectivePersonCount)
            detail = `${rate.toFixed(2)} × ${effectivePersonCount} os. = ${amount.toDecimalPlaces(2).toFixed(2)} Kč`
            break

          case 'PER_SHARE': {
            const share = Number(unit.commonAreaShare ?? 0)
            amount = rate.mul(share)
            detail = `${rate.toFixed(2)} × ${share} = ${amount.toDecimalPlaces(2).toFixed(2)} Kč`
            break
          }

          case 'MANUAL':
            // MANUAL requires overrideAmount; skip if not set
            continue

          default:
            continue
        }
      }

      amount = amount.toDecimalPlaces(2)

      items.push({
        componentId: comp.id,
        componentName: comp.name,
        componentType: comp.componentType,
        calculationMethod: comp.calculationMethod,
        amount: Number(amount),
        calculationDetail: detail,
      })
    }

    const total = items.reduce((sum, i) => sum + i.amount, 0)
    const rounded = Math.round(total * 100) / 100

    return { total: rounded, items }
  }

  // ─── PREVIEW PROPERTY PRESCRIPTIONS ───────────────────────────

  async previewPropertyPrescriptions(
    tenantId: string,
    propertyId: string,
    month: number,
    year: number,
  ) {
    // Build the "as-of" date: first day of the given month
    const asOfDate = new Date(year, month - 1, 1)

    // Get occupied units with active occupancies (primary payer)
    const occupancies = await this.prisma.occupancy.findMany({
      where: {
        tenantId,
        unit: { propertyId },
        isActive: true,
        isPrimaryPayer: true,
        startDate: { lte: asOfDate },
        OR: [
          { endDate: null },
          { endDate: { gt: asOfDate } },
        ],
      },
      include: {
        unit: { select: { id: true, name: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { unit: { name: 'asc' } },
    })

    const results: Array<{
      unitId: string
      unitName: string
      residentId: string
      residentName: string
      total: number
      items: Array<{
        componentId: string
        componentName: string
        componentType: string
        calculationMethod: string
        amount: number
        calculationDetail: string
      }>
    }> = []

    for (const occ of occupancies) {
      const calc = await this.calculateUnitPrescription(
        tenantId,
        occ.unit.id,
        asOfDate,
      )

      results.push({
        unitId: occ.unit.id,
        unitName: occ.unit.name,
        residentId: occ.resident.id,
        residentName: `${occ.resident.firstName} ${occ.resident.lastName}`.trim(),
        total: calc.total,
        items: calc.items,
      })
    }

    return results
  }
}

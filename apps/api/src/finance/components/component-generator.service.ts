import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { KontoService } from '../../konto/konto.service'
import { ComponentsService } from './components.service'
import { Decimal } from '@prisma/client/runtime/library'

export interface GenerationDetail {
  unitId: string
  unitName: string
  residentName: string | null
  amount: number
  items: Array<{ name: string; amount: number }>
  status: 'created' | 'skipped_duplicate' | 'skipped_no_components' | 'skipped_unoccupied' | 'error'
  error?: string
}

export interface GenerationResult {
  generated: number
  skipped: number
  totalAmount: number
  details: GenerationDetail[]
}

@Injectable()
export class ComponentGeneratorService {
  private readonly logger = new Logger(ComponentGeneratorService.name)

  constructor(
    private prisma: PrismaService,
    private componentsService: ComponentsService,
    private kontoService: KontoService,
  ) {}

  async generateFromComponents(
    tenantId: string,
    propertyId: string,
    month: number,
    year: number,
    options?: { dueDay?: number; dryRun?: boolean },
  ): Promise<GenerationResult> {
    const dueDay = options?.dueDay ?? 15
    const dryRun = options?.dryRun ?? false

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    const validFrom = new Date(year, month - 1, 1)
    const validTo = new Date(year, month, 0) // last day of month
    const asOfDate = validFrom

    // Get occupied units with primary payer occupancy
    const occupancies = await this.prisma.occupancy.findMany({
      where: {
        tenantId,
        unit: { propertyId },
        isActive: true,
        isPrimaryPayer: true,
        startDate: { lte: asOfDate },
        OR: [{ endDate: null }, { endDate: { gt: asOfDate } }],
      },
      include: {
        unit: { select: { id: true, name: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { unit: { name: 'asc' } },
    })

    const details: GenerationDetail[] = []
    let generated = 0
    let skipped = 0
    let totalAmount = 0

    for (const occ of occupancies) {
      const unitId = occ.unit.id
      const unitName = occ.unit.name
      const residentName = `${occ.resident.firstName} ${occ.resident.lastName}`.trim()
      const residentId = occ.resident.id

      try {
        // Calculate prescription from components
        const calc = await this.componentsService.calculateUnitPrescription(
          tenantId, unitId, asOfDate,
        )

        if (calc.total === 0 || calc.items.length === 0) {
          details.push({ unitId, unitName, residentName, amount: 0, items: [], status: 'skipped_no_components' })
          skipped++
          continue
        }

        // Check for duplicate: existing COMPONENTS prescription for this unit+month
        const existing = await this.prisma.prescription.findFirst({
          where: {
            tenantId,
            unitId,
            propertyId,
            source: 'COMPONENTS',
            validFrom: { gte: validFrom, lte: validTo },
          },
        })
        if (existing) {
          details.push({
            unitId, unitName, residentName, amount: calc.total,
            items: calc.items.map(i => ({ name: i.componentName, amount: i.amount })),
            status: 'skipped_duplicate',
          })
          skipped++
          continue
        }

        if (dryRun) {
          details.push({
            unitId, unitName, residentName, amount: calc.total,
            items: calc.items.map(i => ({ name: i.componentName, amount: i.amount })),
            status: 'created',
          })
          totalAmount += calc.total
          generated++
          continue
        }

        // Determine prescription type from dominant component
        const hasAdvance = calc.items.some(i => i.componentType === 'ADVANCE')
        const hasRent = calc.items.some(i => i.componentType === 'RENT')
        const prescriptionType = hasRent ? 'rent' : hasAdvance ? 'advance' : 'service'

        // Generate VS: YYYYMM + unit number
        const unitNum = unitName.replace(/\D/g, '').padStart(4, '0')
        const vs = `${year}${String(month).padStart(2, '0')}${unitNum}`

        // Create prescription with items
        const prescription = await this.prisma.prescription.create({
          data: {
            tenantId,
            propertyId,
            unitId,
            residentId,
            type: prescriptionType,
            status: 'active',
            amount: new Decimal(calc.total.toFixed(2)),
            dueDay,
            variableSymbol: vs,
            description: `Předpis ${month}/${year}`,
            source: 'COMPONENTS',
            validFrom,
            validTo,
            items: {
              create: calc.items.map(item => ({
                componentId: item.componentId,
                name: item.componentName,
                amount: new Decimal(item.amount.toFixed(2)),
                vatRate: 0,
                quantity: 1,
                unit: item.calculationDetail,
              })),
            },
          },
        })

        // Auto-post DEBIT to konto
        try {
          const account = await this.kontoService.getOrCreateAccount(tenantId, propertyId, unitId, residentId)
          const entry = await this.kontoService.postDebit(
            account.id, calc.total, 'PRESCRIPTION', prescription.id,
            `Předpis ${unitName} ${month}/${year}`, validFrom,
          )
          await this.prisma.prescription.update({
            where: { id: prescription.id },
            data: { ledgerEntryId: entry.id },
          })
        } catch (err) {
          this.logger.error(`Auto-posting prescription ${prescription.id} to konto failed: ${err}`)
        }

        details.push({
          unitId, unitName, residentName, amount: calc.total,
          items: calc.items.map(i => ({ name: i.componentName, amount: i.amount })),
          status: 'created',
        })
        totalAmount += calc.total
        generated++
      } catch (err: any) {
        details.push({
          unitId, unitName, residentName, amount: 0, items: [],
          status: 'error', error: err.message,
        })
        skipped++
      }
    }

    return { generated, skipped, totalAmount: Math.round(totalAmount * 100) / 100, details }
  }
}

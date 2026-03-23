import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { KontoService } from '../konto/konto.service'
import { Decimal } from '@prisma/client/runtime/library'
import * as iconv from 'iconv-lite'
import type { SipoEncoding } from '@prisma/client'

// ─── SIPO formatting helpers ────────────────────────────────────

function padRight(str: string, len: number): string {
  return str.substring(0, len).padEnd(len, ' ')
}
function padLeft(str: string, len: number): string {
  return str.substring(0, len).padStart(len, ' ')
}
function formatAmount(amount: number): string {
  const rounded = Math.round(amount)
  return padLeft(`${rounded}.00`, 9)
}
function getCharset(encoding: SipoEncoding): string {
  return encoding === 'WIN1250' ? 'win1250' : 'cp852'
}

@Injectable()
export class SipoService {
  private readonly logger = new Logger(SipoService.name)

  constructor(
    private prisma: PrismaService,
    private konto: KontoService,
  ) {}

  // ─── CONFIG ────────────────────────────────────────────────────

  async getConfig(tenantId: string, propertyId: string) {
    return this.prisma.sipoConfig.findFirst({ where: { tenantId, propertyId } })
  }

  async createConfig(tenantId: string, dto: {
    propertyId: string; recipientNumber: string; feeCode: string;
    deliveryMode?: string; encoding?: string;
  }) {
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, tenantId } })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')
    this.validateRecipientNumber(dto.recipientNumber)
    this.validateFeeCode(dto.feeCode)
    return this.prisma.sipoConfig.create({
      data: {
        tenantId,
        propertyId: dto.propertyId,
        recipientNumber: dto.recipientNumber,
        feeCode: dto.feeCode.padStart(3, ' '),
        deliveryMode: (dto.deliveryMode as any) ?? 'FULL_REGISTER',
        encoding: (dto.encoding as any) ?? 'WIN1250',
      },
    })
  }

  async updateConfig(tenantId: string, id: string, dto: Partial<{
    recipientNumber: string; feeCode: string; deliveryMode: string;
    encoding: string; isActive: boolean;
  }>) {
    const config = await this.prisma.sipoConfig.findFirst({ where: { id, tenantId } })
    if (!config) throw new NotFoundException('SIPO konfigurace nenalezena')
    if (dto.recipientNumber) this.validateRecipientNumber(dto.recipientNumber)
    if (dto.feeCode) this.validateFeeCode(dto.feeCode)
    return this.prisma.sipoConfig.update({
      where: { id },
      data: {
        ...(dto.recipientNumber ? { recipientNumber: dto.recipientNumber } : {}),
        ...(dto.feeCode ? { feeCode: dto.feeCode.padStart(3, ' ') } : {}),
        ...(dto.deliveryMode ? { deliveryMode: dto.deliveryMode as any } : {}),
        ...(dto.encoding ? { encoding: dto.encoding as any } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    })
  }

  // ─── PREVIEW ───────────────────────────────────────────────────

  async getExportPreview(tenantId: string, propertyId: string, period: string) {
    this.validatePeriod(period)
    const config = await this.requireConfig(tenantId, propertyId)
    const payers = await this.loadPayers(tenantId, propertyId)

    const items = payers.map(p => ({
      unitName: p.unit?.name ?? '—',
      residentName: `${p.resident?.firstName ?? ''} ${p.resident?.lastName ?? ''}`.trim(),
      sipoNumber: p.sipoNumber,
      amount: p.prescriptionAmount,
      warnings: [
        ...(!p.sipoNumber ? ['Chybí spojovací číslo'] : []),
        ...(p.prescriptionAmount === 0 ? ['Předpis je 0 Kč'] : []),
        ...(p.prescriptionAmount !== Math.round(p.prescriptionAmount) ? ['Předpis obsahuje haléře'] : []),
      ],
    }))

    const validItems = items.filter(i => i.sipoNumber && i.amount > 0)
    return {
      totalPayers: items.length,
      validPayers: validItems.length,
      totalAmount: validItems.reduce((s, i) => s + Math.round(i.amount), 0),
      items,
      config: { recipientNumber: config.recipientNumber, feeCode: config.feeCode },
    }
  }

  // ─── GENERATE CHANGE FILE (ZM + OP) ──────────────────────────

  async generateChangeFile(tenantId: string, propertyId: string, period: string): Promise<{
    changeFile: Buffer; coverFile: Buffer; fileName: string; coverFileName: string;
    recordCount: number; totalAmount: number;
  }> {
    this.validatePeriod(period)
    const config = await this.requireConfig(tenantId, propertyId)
    const payers = await this.loadPayers(tenantId, propertyId)
    const validPayers = payers.filter(p => p.sipoNumber && p.prescriptionAmount > 0)

    if (validPayers.length === 0) throw new BadRequestException('Žádní plátci s platným spojovacím číslem a předpisem')

    const indikace = config.deliveryMode === 'FULL_REGISTER' ? '1' : '2'
    const lines: string[] = []
    let totalAmount = 0

    for (const p of validPayers) {
      const amount = Math.round(p.prescriptionAmount)
      totalAmount += amount
      const unitLabel = padRight(p.unit?.name ?? '', 18)

      // ZM row: exactly 70 chars
      let row = '  '                                          // pos 1: 2 spaces
      row += period                                           // pos 2: MMRRRR (6)
      row += indikace                                         // pos 3: indikace (1)
      row += p.sipoNumber!                                    // pos 4: spojovací číslo (10)
      row += config.recipientNumber                           // pos 5: číslo příjemce (6)
      row += '      '                                         // pos 6: 6 spaces
      row += padLeft(config.feeCode, 3)                       // pos 7: kód poplatku (3)
      row += formatAmount(amount)                             // pos 8: předpis (9)
      row += padLeft('', 9)                                   // pos 9: původní předpis (9, prázdný pro indikace 1)
      row += unitLabel                                        // pos 10: text příjemce (18)

      if (row.length !== 70) throw new Error(`SIPO row length ${row.length}, expected 70`)
      lines.push(row)
    }

    const zmContent = lines.join('\r\n') + '\r\n'
    const changeFile = iconv.encode(zmContent, getCharset(config.encoding))
    const fileName = `ZM${config.recipientNumber}.TXT`

    // Generate cover file (OP)
    const now = new Date()
    const dateDDMMRRRR = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
    let opRow = config.recipientNumber                        // 6
    opRow += period                                           // 6
    opRow += padLeft(String(validPayers.length), 8)           // 8
    opRow += dateDDMMRRRR                                     // 8
    if (opRow.length !== 28) throw new Error(`SIPO OP row length ${opRow.length}, expected 28`)
    const opContent = opRow + '\r\n'
    const coverFile = iconv.encode(opContent, getCharset(config.encoding))
    const coverFileName = `OP${config.recipientNumber}.TXT`

    // Save export record
    await this.prisma.sipoExport.create({
      data: {
        tenantId, propertyId, period,
        recordCount: validPayers.length,
        totalAmount: new Decimal(totalAmount),
        fileName,
      },
    })

    return { changeFile, coverFile, fileName, coverFileName, recordCount: validPayers.length, totalAmount }
  }

  // ─── IMPORT PAYMENTS (ZA file) ────────────────────────────────

  async importPayments(tenantId: string, propertyId: string, fileBuffer: Buffer, encoding: SipoEncoding = 'WIN1250') {
    const config = await this.requireConfig(tenantId, propertyId)
    const content = iconv.decode(fileBuffer, getCharset(encoding))
    const lines = content.split(/\r?\n/).filter(l => l.trim().length >= 44)

    let imported = 0, matched = 0, skipped = 0
    const errors: string[] = []

    for (const line of lines) {
      try {
        const recipientNumber = line.substring(0, 6).trim()
        const sipoNumber = line.substring(6, 16).trim()
        const period = line.substring(16, 22).trim()
        const feeCode = line.substring(22, 25).trim()
        const amountStr = line.substring(25, 34).trim()
        const dateStr = line.substring(34, 44).trim()

        if (recipientNumber !== config.recipientNumber) { skipped++; continue }

        const amount = parseFloat(amountStr)
        if (isNaN(amount) || amount <= 0) { skipped++; continue }

        // Parse date DD.MM.RRRR
        const [dd, mm, yyyy] = dateStr.split('.')
        const paymentDate = new Date(`${yyyy}-${mm}-${dd}`)

        const payment = await this.prisma.sipoPayment.create({
          data: {
            tenantId, propertyId, period, sipoNumber,
            recipientNumber, feeCode,
            amount: new Decimal(amount.toFixed(2)),
            paymentDate,
          },
        })
        imported++

        // Match to konto
        const occ = await this.prisma.occupancy.findFirst({
          where: { tenantId, sipoNumber, isActive: true },
          include: { unit: { select: { propertyId: true } } },
        })
        if (occ) {
          try {
            const account = await this.konto.getOrCreateAccount(
              tenantId, occ.unit.propertyId!, occ.unitId, occ.residentId,
            )
            await this.konto.postCredit(
              account.id, amount, 'SIPO', payment.id,
              `SIPO platba ${period}`, paymentDate,
            )
            await this.prisma.sipoPayment.update({
              where: { id: payment.id },
              data: { matchedToKonto: true },
            })
            matched++
          } catch (err) {
            this.logger.error(`SIPO konto posting failed for ${sipoNumber}: ${err}`)
          }
        }
      } catch (err: any) {
        errors.push(err.message)
      }
    }

    return { imported, matched, skipped, errors, totalLines: lines.length }
  }

  // ─── IMPORT ERRORS (ZZ file) ─────────────────────────────────

  async importErrors(tenantId: string, propertyId: string, fileBuffer: Buffer, encoding: SipoEncoding = 'WIN1250') {
    const config = await this.requireConfig(tenantId, propertyId)
    const content = iconv.decode(fileBuffer, getCharset(encoding))
    const lines = content.split(/\r?\n/).filter(l => l.trim().length >= 71)

    const ERROR_CODES: Record<string, string> = {
      A: 'Chybná indikace změny', B: 'Nesouhlasí období', D: 'Neexistující spojovací číslo',
      E: 'Neexistující kód poplatku', F: 'Předpis nulový/záporný/s haléři', G: 'Duplicitní záznam',
      H: 'Nesouhlasí původní předpis', J: 'Blokace spojovacího čísla', L: 'Chybná struktura věty',
    }

    const errors = lines.map(line => {
      const period = line.substring(2, 8).trim()
      const sipoNumber = line.substring(9, 19).trim()
      const errorCode = line.substring(70, 80).trim()
      return {
        period, sipoNumber, errorCode,
        errorDescription: ERROR_CODES[errorCode] ?? `Neznámý kód: ${errorCode}`,
      }
    })

    // Update latest export status
    const latestExport = await this.prisma.sipoExport.findFirst({
      where: { tenantId, propertyId },
      orderBy: { createdAt: 'desc' },
    })
    if (latestExport) {
      await this.prisma.sipoExport.update({
        where: { id: latestExport.id },
        data: {
          status: errors.length > 0 ? 'REJECTED' : 'ACCEPTED',
          errorFile: JSON.stringify(errors),
        },
      })
    }

    return { errorCount: errors.length, errors }
  }

  // ─── PAYER MANAGEMENT ─────────────────────────────────────────

  async getPayers(tenantId: string, propertyId: string) {
    return this.prisma.occupancy.findMany({
      where: { tenantId, unit: { propertyId }, isActive: true, isPrimaryPayer: true },
      include: {
        unit: { select: { id: true, name: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { unit: { name: 'asc' } },
    })
  }

  async updatePayerSipoNumber(tenantId: string, occupancyId: string, sipoNumber: string) {
    if (sipoNumber && !/^\d{10}$/.test(sipoNumber)) {
      throw new BadRequestException('Spojovací číslo musí být přesně 10 číslic')
    }
    const occ = await this.prisma.occupancy.findFirst({ where: { id: occupancyId, tenantId } })
    if (!occ) throw new NotFoundException('Obsazenost nenalezena')
    return this.prisma.occupancy.update({
      where: { id: occupancyId },
      data: { sipoNumber: sipoNumber || null },
    })
  }

  async getExportHistory(tenantId: string, propertyId: string) {
    return this.prisma.sipoExport.findMany({
      where: { tenantId, propertyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private async requireConfig(tenantId: string, propertyId: string) {
    const config = await this.prisma.sipoConfig.findFirst({ where: { tenantId, propertyId, isActive: true } })
    if (!config) throw new NotFoundException('SIPO konfigurace nenalezena. Nastavte číslo příjemce a kód poplatku.')
    return config
  }

  private async loadPayers(tenantId: string, propertyId: string) {
    const occupancies = await this.prisma.occupancy.findMany({
      where: { tenantId, unit: { propertyId }, isActive: true, isPrimaryPayer: true },
      include: {
        unit: { select: { id: true, name: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Get prescription amounts per unit
    const unitIds = occupancies.map(o => o.unitId)
    const prescriptions = await this.prisma.prescription.findMany({
      where: { tenantId, propertyId, unitId: { in: unitIds }, status: 'active' },
      select: { unitId: true, amount: true },
    })
    const amountMap = new Map<string, number>()
    for (const p of prescriptions) {
      if (p.unitId) amountMap.set(p.unitId, (amountMap.get(p.unitId) ?? 0) + Number(p.amount))
    }

    return occupancies.map(o => ({
      ...o,
      prescriptionAmount: amountMap.get(o.unitId) ?? 0,
    }))
  }

  private validateRecipientNumber(n: string) {
    if (!/^\d{6}$/.test(n)) throw new BadRequestException('Číslo Příjemce musí být přesně 6 číslic')
  }
  private validateFeeCode(c: string) {
    if (!/^\d{1,3}$/.test(c.trim())) throw new BadRequestException('Kód poplatku musí být 1-3 číslice')
  }
  private validatePeriod(p: string) {
    if (!/^\d{6}$/.test(p)) throw new BadRequestException('Období musí být ve formátu MMRRRR')
    const month = parseInt(p.substring(0, 2))
    if (month < 1 || month > 12) throw new BadRequestException('Měsíc musí být 01-12')
  }
}

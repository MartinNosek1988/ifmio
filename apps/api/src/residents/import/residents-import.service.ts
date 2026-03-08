import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as XLSX from 'xlsx'

interface AuthUser {
  id: string
  tenantId: string
  role: string
}

export interface ResidentImportRow {
  rowIndex: number
  firstName: string
  lastName: string
  email?: string
  phone?: string
  propertyName?: string
  unitName?: string
  role?: string
}

export interface ImportValidationResult {
  valid: ResidentImportRow[]
  invalid: Array<ResidentImportRow & { errors: string[] }>
  total: number
  preview: boolean
}

const COLUMN_ALIASES: Record<string, string> = {
  'jmeno': 'firstName', 'jméno': 'firstName', 'krestni': 'firstName',
  'křestní': 'firstName', 'firstname': 'firstName', 'first_name': 'firstName',
  'prijmeni': 'lastName', 'příjmení': 'lastName', 'lastname': 'lastName',
  'last_name': 'lastName', 'surname': 'lastName',
  'email': 'email', 'e-mail': 'email', 'mail': 'email',
  'telefon': 'phone', 'tel': 'phone', 'phone': 'phone', 'mobil': 'phone',
  'nemovitost': 'propertyName', 'budova': 'propertyName', 'property': 'propertyName',
  'jednotka': 'unitName', 'byt': 'unitName', 'unit': 'unitName', 'label': 'unitName',
  'role': 'role', 'typ': 'role',
}

@Injectable()
export class ResidentsImportService {
  constructor(private prisma: PrismaService) {}

  parseFile(buffer: Buffer, _mimetype: string): ResidentImportRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
      wb.Sheets[wb.SheetNames[0]], { defval: '' },
    )

    if (!rawRows.length) {
      throw new BadRequestException('Soubor neobsahuje zadna data')
    }

    return rawRows.map((row, i) => this.normalizeRow(row, i + 2))
  }

  private normalizeRow(raw: Record<string, unknown>, rowIndex: number): ResidentImportRow {
    const normalized: Record<string, string> = {}

    for (const [key, value] of Object.entries(raw)) {
      const aliasKey = key.toLowerCase().trim().replace(/\s+/g, '_')
      const mapped = COLUMN_ALIASES[aliasKey]
      if (mapped) normalized[mapped] = String(value ?? '').trim()
    }

    return {
      rowIndex,
      firstName: normalized.firstName ?? '',
      lastName: normalized.lastName ?? '',
      email: normalized.email || undefined,
      phone: normalized.phone || undefined,
      propertyName: normalized.propertyName || undefined,
      unitName: normalized.unitName || undefined,
      role: normalized.role || 'tenant',
    }
  }

  async validate(rows: ResidentImportRow[], tenantId: string): Promise<ImportValidationResult> {
    const properties = await this.prisma.property.findMany({
      where: { tenantId, status: 'active' },
      include: { units: true },
    })

    const existingEmails = await this.prisma.resident.findMany({
      where: { tenantId, isActive: true },
      select: { email: true },
    })
    const emailSet = new Set(
      existingEmails.map((r) => r.email?.toLowerCase()).filter(Boolean),
    )

    const valid: ResidentImportRow[] = []
    const invalid: Array<ResidentImportRow & { errors: string[] }> = []

    for (const row of rows) {
      const errors: string[] = []

      if (!row.firstName?.trim()) errors.push('Jmeno je povinne')
      if (!row.lastName?.trim()) errors.push('Prijmeni je povinne')

      if (row.email) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRe.test(row.email)) {
          errors.push(`Neplatny email: ${row.email}`)
        } else if (emailSet.has(row.email.toLowerCase())) {
          errors.push(`Email ${row.email} jiz existuje`)
        }
      }

      if (row.propertyName) {
        const prop = properties.find(
          (p) => p.name.toLowerCase() === row.propertyName!.toLowerCase(),
        )
        if (!prop) {
          errors.push(`Nemovitost "${row.propertyName}" nenalezena`)
        } else if (row.unitName) {
          const unit = prop.units.find(
            (u) => u.name.toLowerCase() === row.unitName!.toLowerCase(),
          )
          if (!unit) {
            errors.push(`Jednotka "${row.unitName}" v "${prop.name}" nenalezena`)
          }
        }
      }

      if (errors.length) {
        invalid.push({ ...row, errors })
      } else {
        valid.push(row)
      }
    }

    return { valid, invalid, total: rows.length, preview: true }
  }

  async executeImport(user: AuthUser, rows: ResidentImportRow[]) {
    const properties = await this.prisma.property.findMany({
      where: { tenantId: user.tenantId, status: 'active' },
      include: { units: true },
    })

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        let propertyId: string | undefined
        let unitId: string | undefined

        if (row.propertyName) {
          const prop = properties.find(
            (p) => p.name.toLowerCase() === row.propertyName!.toLowerCase(),
          )
          if (prop) {
            propertyId = prop.id
            if (row.unitName) {
              const unit = prop.units.find(
                (u) => u.name.toLowerCase() === row.unitName!.toLowerCase(),
              )
              if (unit) unitId = unit.id
            }
          }
        }

        await this.prisma.resident.create({
          data: {
            tenantId: user.tenantId,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email || null,
            phone: row.phone || null,
            role: (row.role as any) || 'tenant',
            isActive: true,
            ...(propertyId ? { propertyId } : {}),
            ...(unitId ? { unitId } : {}),
          },
        })
        imported++
      } catch (err: any) {
        errors.push(`Radek ${row.rowIndex}: ${err.message}`)
        skipped++
      }
    }

    await this.prisma.importLog.create({
      data: {
        tenantId: user.tenantId,
        format: 'residents' as any,
        fileName: 'import',
        totalRows: rows.length,
        importedRows: imported,
        skippedRows: skipped,
        errorRows: errors.length,
        status: 'done',
        errors: errors.length ? errors : undefined,
      },
    }).catch(() => {})

    return { imported, skipped, errors, total: rows.length }
  }

  generateTemplate(): Buffer {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['jmeno', 'prijmeni', 'email', 'telefon', 'nemovitost', 'jednotka'],
      ['Jan', 'Novak', 'jan.novak@email.cz', '+420777123456', 'Bytovy dum A', 'Byt 2+1'],
      ['Jana', 'Novakova', 'jana@email.cz', '', 'Bytovy dum A', 'Byt 1+1'],
    ])
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 25 },
      { wch: 16 }, { wch: 20 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Najemnici')
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  }
}

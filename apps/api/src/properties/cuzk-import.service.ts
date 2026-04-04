import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as cheerio from 'cheerio'
import type { AuthUser } from '@ifmio/shared-types'
import type { PartyType, SpaceType, PropertyType, OwnershipType } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────

export interface CuzkOwner {
  name: string
  address: string
  share: string | null
  shareNumerator: number | null
  shareDenominator: number | null
  isSJM: boolean
  sjmPartners?: { name: string; address: string }[]
  isLegalEntity: boolean
}

export interface CuzkProceeding {
  reference: string
  date: string
}

export interface CuzkParsedUnit {
  unitNumber: string
  unitType: string
  usage: string
  cadastralTerritory: string
  cadastralTerritoryCode: string
  lvNumber: string
  commonAreaShare: string
  commonAreaSharePercent: number
  buildingNumber: string
  parcelNumber: string
  owners: CuzkOwner[]
  protections: string[]
  restrictions: string[]
  otherRecords: string[]
  proceedings: CuzkProceeding[]
  cadastralOffice: string
  dataValidAt: string
}

export interface CuzkImportResult {
  buildingNumber: string
  parcelNumber: string
  cadastralTerritory: string
  cadastralTerritoryCode: string
  units: CuzkParsedUnit[]
}

export interface CuzkImportConfirmDto {
  importData: CuzkImportResult
  propertyName: string
  propertyAddress: string
  propertyCity: string
  postalCode: string
  propertyType?: string
  ownership?: string
}

// ─── Service ─────────────────────────────────────────────────

const LEGAL_SUFFIXES = ['s.r.o.', 'a.s.', 'z.s.', 'v.o.s.', 'k.s.', 'z.ú.', 'o.p.s.', 'spol.', 'SE', 'a.g.']

@Injectable()
export class CuzkImportService {
  private readonly logger = new Logger(CuzkImportService.name)

  constructor(private prisma: PrismaService) {}

  parseDomsysJson(jsonContent: string): CuzkImportResult {
    let items: Array<{ unit_name: string; unit_data: string }>
    try {
      items = JSON.parse(jsonContent)
    } catch {
      throw new BadRequestException('Neplatný JSON soubor')
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('JSON soubor neobsahuje žádné jednotky')
    }

    const units = items.map(item => this.parseUnitHtml(item.unit_data, item.unit_name))

    const first = units[0]
    return {
      buildingNumber: first.buildingNumber,
      parcelNumber: first.parcelNumber,
      cadastralTerritory: first.cadastralTerritory,
      cadastralTerritoryCode: first.cadastralTerritoryCode,
      units,
    }
  }

  private parseUnitHtml(html: string, fallbackName: string): CuzkParsedUnit {
    const $ = cheerio.load(html)

    // Parse unit attributes — replace <br> with space before extracting text
    // (cheerio's .text() collapses <br> without adding whitespace)
    $('td.nazev br').replaceWith(' ')

    const getAttr = (label: string): string => {
      let val = ''
      const normalizedLabel = label.replace(/\s+/g, ' ').trim()
      $('table.atributy tr, table[summary="Atributy jednotky"] tr').each((_, tr) => {
        const labelTd = $(tr).find('td').first()
        const labelText = labelTd.text().replace(/\s+/g, ' ').trim()
        if (labelText.startsWith(normalizedLabel)) {
          val = $(tr).find('td').last().text().trim()
        }
      })
      return val
    }

    const unitNumber = $('td.nazev:contains("Číslo jednotky")').parent().find('td').last().find('strong, b').text().trim()
      || getAttr('Číslo jednotky') || fallbackName

    const unitType = getAttr('Typ jednotky')
    const usage = getAttr('Způsob využití')

    // Cadastral territory: "Nové Město [727181]"
    const kuRaw = getAttr('Katastrální území')
    const kuMatch = kuRaw.match(/^(.+?)\s*\[(\d+)\]/)
    const cadastralTerritory = kuMatch?.[1]?.trim() ?? kuRaw
    const cadastralTerritoryCode = kuMatch?.[2] ?? ''

    const lvNumber = getAttr('Číslo LV')

    // Common area share: "30/17021"
    const shareRaw = getAttr('Podíl na společných částech')
    let commonAreaSharePercent = 0
    if (shareRaw) {
      const shareParts = shareRaw.match(/(\d+)\s*\/\s*(\d+)/)
      if (shareParts) {
        commonAreaSharePercent = (parseInt(shareParts[1]) / parseInt(shareParts[2])) * 100
      }
    }

    // Building number from "Vymezena v:" section
    let buildingNumber = ''
    let parcelNumber = ''
    const fullText = $.text()
    const bldgMatch = fullText.match(/stavba\s+č\.\s*p\.\s*(\d+)/i)
    if (bldgMatch) buildingNumber = bldgMatch[1]
    // Parcel from link
    $('a[title*="parcele"], a[title*="Parcela"]').each((_, el) => {
      const txt = $(el).text().trim()
      if (/^\d+/.test(txt) && !parcelNumber) parcelNumber = txt
    })

    // Owners
    const owners: CuzkOwner[] = []
    $('table[summary*="Vlastníci"], table[summary*="vlastníci"]').find('tr').each((_, tr) => {
      const tds = $(tr).find('td')
      if (tds.length < 1) return
      const firstTd = $(tds[0]).text().trim()
      if (!firstTd || firstTd === 'Vlastnické právo' || firstTd.startsWith('Jméno')) return

      // Check SJM
      if (firstTd.startsWith('SJM') || firstTd.startsWith('SJ ')) {
        const sjmComma = firstTd.indexOf(',')
        const sjmRaw = sjmComma > 0 ? firstTd.slice(0, sjmComma).trim() : firstTd
        // Normalize "SJM " → "SJ " for display
        const sjmName = sjmRaw.replace(/^SJM\s+/i, 'SJ ')
        const sjmAddr = sjmComma > 0 ? firstTd.slice(sjmComma + 1).trim() : ''
        const sjmOwner: CuzkOwner = {
          name: sjmName, address: sjmAddr, share: tds.length > 1 ? $(tds[tds.length - 1]).text().trim() || null : null,
          shareNumerator: null, shareDenominator: null,
          isSJM: true, sjmPartners: [], isLegalEntity: false,
        }
        // Parse share
        if (sjmOwner.share) {
          const sp = sjmOwner.share.match(/(\d+)\s*\/\s*(\d+)/)
          if (sp) { sjmOwner.shareNumerator = parseInt(sp[1]); sjmOwner.shareDenominator = parseInt(sp[2]) }
        }
        owners.push(sjmOwner)
        return
      }

      // Check partner rows (italic)
      if ($(tr).find('i').length > 0 && $(tr).hasClass('partnerSJM')) {
        const lastSJM = owners.filter(o => o.isSJM).pop()
        if (lastSJM) {
          const partnerText = $(tds[0]).find('i').text().trim() || firstTd
          const parts = partnerText.split(',').map(s => s.trim())
          lastSJM.sjmPartners = lastSJM.sjmPartners || []
          lastSJM.sjmPartners.push({ name: parts[0] ?? partnerText, address: parts.slice(1).join(', ') })
        }
        return
      }

      // Regular owner — name is before first comma, address is rest
      const commaIdx = firstTd.indexOf(',')
      const name = commaIdx > 0 ? firstTd.slice(0, commaIdx).trim() : firstTd
      const address = commaIdx > 0 ? firstTd.slice(commaIdx + 1).trim() : ''
      const shareText = tds.length > 1 ? $(tds[tds.length - 1]).text().trim() || null : null
      let shareNum: number | null = null, shareDen: number | null = null
      if (shareText) {
        const sp = shareText.match(/(\d+)\s*\/\s*(\d+)/)
        if (sp) { shareNum = parseInt(sp[1]); shareDen = parseInt(sp[2]) }
      }
      const isLegalEntity = LEGAL_SUFFIXES.some(s => name.includes(s))

      owners.push({
        name, address, share: shareText,
        shareNumerator: shareNum, shareDenominator: shareDen,
        isSJM: false, isLegalEntity,
      })
    })

    // Protection, restrictions, other records
    const parseSimpleTable = (summaryPattern: string): string[] => {
      const results: string[] = []
      $(`table[summary*="${summaryPattern}"]`).find('tr td').each((_, td) => {
        const text = $(td).text().trim()
        if (text && !text.startsWith('Typ') && text !== 'Listina') results.push(text)
      })
      // Check "nenalezeny" indicators
      if (results.length === 0) {
        const section = $(`table[summary*="${summaryPattern}"]`).parent()
        if (section.find('.nenalezenydata, .nenalezena').length > 0) return []
      }
      return [...new Set(results)]
    }

    const protections = parseSimpleTable('ochrany')
    const restrictions = parseSimpleTable('Omezení')
    const otherRecords = parseSimpleTable('Jiné zápisy')

    // Proceedings
    const proceedings: CuzkProceeding[] = []
    $('table[summary*="Řízení"]').find('tr').each((_, tr) => {
      const tds = $(tr).find('td')
      if (tds.length >= 2) {
        const ref = $(tds[0]).text().trim()
        const date = $(tds[1]).text().trim()
        if (ref && /^[A-Z]/.test(ref)) proceedings.push({ reference: ref, date })
      }
    })

    // Cadastral office
    const cadastralOffice = $('td:contains("Katastrální úřad")').parent().find('td').last().text().trim()
      || $('div:contains("katastrální úřad")').text().replace(/.*katastrální úřad/i, '').trim()

    // Data validity — from footer paragraph "Platnost dat k DD.MM.YYYY HH:MM"
    const footerText = $('#nemovitost-paticka').text() || $('p:contains("Platnost")').text() || ''
    const validMatch = footerText.match(/[Pp]latnost\s+dat\s+k\s+(.+?)\.?\s*$/)
    const dataValidAt = validMatch?.[1]?.trim() ?? ''

    return {
      unitNumber, unitType, usage,
      cadastralTerritory, cadastralTerritoryCode,
      lvNumber, commonAreaShare: shareRaw, commonAreaSharePercent,
      buildingNumber, parcelNumber,
      owners, protections, restrictions, otherRecords, proceedings,
      cadastralOffice, dataValidAt,
    }
  }

  // ─── Import Confirm ─────────────────────────────────────────

  async confirmImport(user: AuthUser, dto: CuzkImportConfirmDto) {
    const { importData } = dto

    // 166 units × ~3 queries = ~500 ops — increase timeout from default 5s
    return this.prisma.$transaction(async (tx) => {
      // 1. Create property
      const property = await tx.property.create({
        data: {
          tenantId: user.tenantId,
          name: dto.propertyName,
          address: dto.propertyAddress,
          city: dto.propertyCity,
          postalCode: dto.postalCode,
          type: (dto.propertyType ?? 'SVJ') as PropertyType,
          ownership: (dto.ownership ?? 'vlastnictvi') as OwnershipType,
          importSource: 'cuzk_domsys',
          importedAt: new Date(),
          cadastralData: {
            buildingNumber: importData.buildingNumber,
            parcelNumber: importData.parcelNumber,
            cadastralTerritory: importData.cadastralTerritory,
            cadastralTerritoryCode: importData.cadastralTerritoryCode,
          } as any,
        },
      })

      // 2. Create units + owners
      for (const parsedUnit of importData.units) {
        // Map usage to SpaceType
        const spaceType = this.mapUsageToSpaceType(parsedUnit.usage)

        // Calculate share decimal
        let shareDecimal: number | undefined
        const shareParts = parsedUnit.commonAreaShare?.match(/(\d+)\s*\/\s*(\d+)/)
        if (shareParts) {
          shareDecimal = parseInt(shareParts[1]) / parseInt(shareParts[2])
        }

        const unit = await tx.unit.create({
          data: {
            propertyId: property.id,
            name: parsedUnit.unitNumber,
            knDesignation: parsedUnit.unitNumber,
            spaceType: spaceType as SpaceType,
            commonAreaShare: shareDecimal,
            cadastralData: {
              unitType: parsedUnit.unitType,
              usage: parsedUnit.usage,
              lvNumber: parsedUnit.lvNumber,
              commonAreaShareRaw: parsedUnit.commonAreaShare,
              protections: parsedUnit.protections,
              restrictions: parsedUnit.restrictions,
              otherRecords: parsedUnit.otherRecords,
              proceedings: parsedUnit.proceedings,
              cadastralOffice: parsedUnit.cadastralOffice,
              dataValidAt: parsedUnit.dataValidAt,
            } as any,
          },
        })

        // 3. Create Party + UnitOwnership for each owner
        // Skip SJM partner rows (isSJM=false, share=null, preceded by SJM row)
        // They are informational duplicates — the SJM row is the real owner
        const realOwners = parsedUnit.owners.filter((o, i, arr) => {
          // Keep if has explicit share or is first owner (sole owner)
          if (o.share || o.isSJM || o.isLegalEntity) return true
          // Skip if preceded by SJM owner (this is a partner detail row)
          const prev = arr.slice(0, i).reverse().find(p => p.isSJM)
          if (prev && !o.share) return false
          return true
        })

        for (const owner of realOwners) {
          const partyType: PartyType = owner.isLegalEntity ? 'company' : 'person'
          // Normalize SJM→SJ prefix for display; keep full SJ name for co-ownership
          const displayName = owner.isSJM
            ? owner.name.replace(/^SJM\s+/i, 'SJ ').trim()
            : owner.name

          // Find or create Party
          let party = await tx.party.findFirst({
            where: { tenantId: user.tenantId, displayName, isActive: true },
          })
          if (!party) {
            party = await tx.party.create({
              data: {
                tenantId: user.tenantId,
                type: partyType,
                displayName,
                companyName: owner.isLegalEntity ? displayName : undefined,
                street: owner.address || undefined,
              },
            })
          }

          // Create UnitOwnership — skip if already exists (same party+unit+null validFrom)
          const existingOwnership = await tx.unitOwnership.findFirst({
            where: { unitId: unit.id, partyId: party.id, validFrom: null },
          })
          if (existingOwnership) continue

          await tx.unitOwnership.create({
            data: {
              tenantId: user.tenantId,
              unitId: unit.id,
              partyId: party.id,
              shareNumerator: owner.shareNumerator,
              shareDenominator: owner.shareDenominator,
              sharePercent: owner.shareNumerator && owner.shareDenominator
                ? (owner.shareNumerator / owner.shareDenominator) * 100
                : undefined,
              isActive: true,
              note: owner.isSJM ? `SJ: ${(owner.sjmPartners ?? []).map(p => p.name).join(', ')}` : undefined,
            },
          })
        }
      }

      return tx.property.findUnique({
        where: { id: property.id },
        include: { units: true },
      })
    }, { timeout: 60_000, maxWait: 10_000 })
  }

  private mapUsageToSpaceType(usage: string): string {
    const lower = usage.toLowerCase()
    if (lower.includes('byt')) return 'RESIDENTIAL'
    if (lower.includes('nebytový') || lower.includes('nebyt')) return 'NON_RESIDENTIAL'
    if (lower.includes('garáž')) return 'GARAGE'
    if (lower.includes('sklep') || lower.includes('sklepní')) return 'CELLAR'
    if (lower.includes('parkov')) return 'PARKING'
    return 'NON_RESIDENTIAL'
  }
}

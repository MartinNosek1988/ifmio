import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { XMLParser } from 'fast-xml-parser'

export interface ImportStats {
  processed: number
  created: number
  updated: number
  personsCreated: number
  engagementsCreated: number
  errors: number
  skipped: number
}

interface ParsedSubjekt {
  ico: string
  nazev: string
  pravniForma?: string
  sidlo?: string
  datumVzniku?: string
  spisovaZnacka?: { oddil: string; vlozka: string; soud: string }
  clenove: ParsedClen[]
}

interface ParsedClen {
  type: 'F' | 'P' // FyzickaOsoba | PravnickaOsoba
  jmeno?: string
  prijmeni?: string
  titulPred?: string
  datumNarozeni?: string
  adresa?: string
  // PO fields
  icoOsoby?: string
  nazevOsoby?: string
  // Engagement fields
  funkce: string
  clenstviOd?: string
  clenstviDo?: string
  funkceOd?: string
  funkceDo?: string
  zapisDatum?: string
  vymazDatum?: string
}

const SOUDY = [
  'praha', 'brno', 'ostrava', 'plzen',
  'hradec-kralove', 'usti-nad-labem', 'olomouc', 'ceske-budejovice',
]

const PRAVNI_FORMY = ['svj', 'sro', 'as', 'druzstvo']

const DATAOR_BASE = 'https://dataor.justice.cz/api/file'
const DOWNLOAD_TIMEOUT_MS = 120_000 // 2 min for large files
const BATCH_SIZE = 100 // upsert batch size

@Injectable()
export class DataorService {
  private readonly logger = new Logger(DataorService.name)
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === 'Subjekt' || name === 'Udaj',
  })

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import all available data for given year and type.
   */
  async importAll(
    rok: number,
    typ: 'full' | 'actual',
    filterPravniForma?: string,
    filterSoud?: string,
  ): Promise<ImportStats> {
    const total: ImportStats = {
      processed: 0, created: 0, updated: 0,
      personsCreated: 0, engagementsCreated: 0,
      errors: 0, skipped: 0,
    }

    const formy = filterPravniForma ? [filterPravniForma] : PRAVNI_FORMY
    const soudy = filterSoud ? [filterSoud] : SOUDY

    for (const forma of formy) {
      for (const soud of soudy) {
        const url = `${DATAOR_BASE}/${forma}-${typ}-${soud}-${rok}.xml`
        this.logger.log(`Importing ${url}...`)
        try {
          const subjekty = await this.downloadAndParse(url)
          this.logger.log(`Parsed ${subjekty.length} subjects from ${forma}-${typ}-${soud}-${rok}`)

          for (const subjekt of subjekty) {
            try {
              const result = await this.upsertSubjekt(subjekt)
              total.processed++
              if (result === 'created') total.created++
              else if (result === 'updated') total.updated++
              total.personsCreated += result === 'created' ? subjekt.clenove.filter(c => c.type === 'F').length : 0
            } catch (err) {
              total.errors++
              if (total.errors <= 10) {
                this.logger.warn(`Failed to upsert ${subjekt.ico}: ${err}`)
              }
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to download/parse ${url}: ${(err as Error).message}`)
          total.errors++
        }
      }
    }

    this.logger.log(`Import done: ${JSON.stringify(total)}`)
    return total
  }

  /**
   * Download XML from dataor.justice.cz and parse into structured data.
   */
  async downloadAndParse(url: string): Promise<ParsedSubjekt[]> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`)
    }

    const xmlText = await res.text()
    const parsed = this.xmlParser.parse(xmlText)

    const subjekty = parsed?.xml?.Subjekt
    if (!Array.isArray(subjekty)) {
      this.logger.debug(`No Subjekt array found in ${url}`)
      return []
    }

    return subjekty
      .map((s: any) => this.mapSubjekt(s))
      .filter((s): s is ParsedSubjekt => s !== null)
  }

  private mapSubjekt(raw: any): ParsedSubjekt | null {
    const ico = String(raw.ico ?? '').trim()
    const nazev = String(raw.nazev ?? '').trim()
    if (!ico || !nazev) return null

    const udaje: any[] = this.ensureArray(raw.udaje?.Udaj)

    let pravniForma: string | undefined
    let sidlo: string | undefined
    let datumVzniku = raw.zapisDatum ? String(raw.zapisDatum) : undefined
    let spisovaZnacka: ParsedSubjekt['spisovaZnacka']
    const clenove: ParsedClen[] = []

    for (const udaj of udaje) {
      const kod = udaj.udajTyp?.kod
      switch (kod) {
        case 'PRAVNI_FORMA':
          pravniForma = udaj.pravniForma?.kod ? String(udaj.pravniForma.kod) : udaj.hodnotaText
          break
        case 'SIDLO':
          sidlo = this.buildAdresa(udaj.adresa)
          break
        case 'SPIS_ZN':
          if (udaj.spisZn) {
            spisovaZnacka = {
              oddil: String(udaj.spisZn.oddil ?? ''),
              vlozka: String(udaj.spisZn.vlozka ?? ''),
              soud: String(udaj.spisZn.soud?.nazev ?? udaj.spisZn.soud?.kod ?? ''),
            }
          }
          break
        case 'STATUTARNI_ORGAN': {
          const podudaje: any[] = this.ensureArray(udaj.podudaje?.Udaj)
          for (const pod of podudaje) {
            if (pod.udajTyp?.kod !== 'STATUTARNI_ORGAN_CLEN') continue
            const clen = this.mapClen(pod)
            if (clen) clenove.push(clen)
          }
          break
        }
      }
    }

    return { ico, nazev, pravniForma, sidlo, datumVzniku, spisovaZnacka, clenove }
  }

  private mapClen(raw: any): ParsedClen | null {
    const osoba = raw.osoba
    if (!osoba) return null

    const isPO = raw.hodnotaText === 'AngazmaPravnicke' || raw.hodnotaUdaje?.T === 'P'
    const funkce = String(raw.funkce ?? raw.hlavicka ?? 'člen')

    if (isPO) {
      return {
        type: 'P',
        icoOsoby: osoba.ico ? String(osoba.ico) : undefined,
        nazevOsoby: osoba.nazev ? String(osoba.nazev) : undefined,
        funkce,
        clenstviOd: raw.clenstviOd ? String(raw.clenstviOd) : undefined,
        clenstviDo: raw.clenstviDo ? String(raw.clenstviDo) : undefined,
        funkceOd: raw.funkceOd ? String(raw.funkceOd) : undefined,
        funkceDo: raw.funkceDo ? String(raw.funkceDo) : undefined,
        zapisDatum: raw.zapisDatum ? String(raw.zapisDatum) : undefined,
        vymazDatum: raw.vymazDatum ? String(raw.vymazDatum) : undefined,
      }
    }

    const jmeno = osoba.jmeno ? String(osoba.jmeno) : undefined
    const prijmeni = osoba.prijmeni ? String(osoba.prijmeni) : undefined
    if (!prijmeni) return null

    return {
      type: 'F',
      jmeno,
      prijmeni,
      titulPred: osoba.titulPredJmenem ? String(osoba.titulPredJmenem) : undefined,
      datumNarozeni: osoba.narozDatum ? String(osoba.narozDatum) : undefined,
      adresa: this.buildAdresa(raw.adresa),
      funkce,
      clenstviOd: raw.clenstviOd ? String(raw.clenstviOd) : undefined,
      clenstviDo: raw.clenstviDo ? String(raw.clenstviDo) : undefined,
      funkceOd: raw.funkceOd ? String(raw.funkceOd) : undefined,
      funkceDo: raw.funkceDo ? String(raw.funkceDo) : undefined,
      zapisDatum: raw.zapisDatum ? String(raw.zapisDatum) : undefined,
      vymazDatum: raw.vymazDatum ? String(raw.vymazDatum) : undefined,
    }
  }

  /**
   * Upsert a single subject + its statutory members into KB.
   */
  async upsertSubjekt(data: ParsedSubjekt): Promise<'created' | 'updated'> {
    const spiszn = data.spisovaZnacka
      ? `${data.spisovaZnacka.oddil} ${data.spisovaZnacka.vlozka}`.trim()
      : undefined

    const existing = await this.prisma.kbOrganization.findUnique({
      where: { ico: data.ico },
    })

    await this.prisma.kbOrganization.upsert({
      where: { ico: data.ico },
      create: {
        ico: data.ico,
        name: data.nazev,
        legalFormCode: data.pravniForma,
        street: data.sidlo,
        dateEstablished: data.datumVzniku ? new Date(data.datumVzniku) : undefined,
        spisovaZnacka: spiszn,
        isActive: true,
      },
      update: {
        name: data.nazev,
        ...(data.pravniForma && { legalFormCode: data.pravniForma }),
        ...(data.sidlo && { street: data.sidlo }),
        ...(spiszn && { spisovaZnacka: spiszn }),
      },
    })

    // Process statutory members
    for (const clen of data.clenove) {
      try {
        if (clen.type === 'F') {
          await this.upsertFyzickaOsoba(data.ico, data.nazev, clen)
        } else if (clen.type === 'P' && clen.icoOsoby) {
          await this.upsertPravnickaOsoba(data.ico, data.nazev, clen)
        }
      } catch (err) {
        this.logger.debug(`Failed to upsert member for ${data.ico}: ${err}`)
      }
    }

    return existing ? 'updated' : 'created'
  }

  private async upsertFyzickaOsoba(ico: string, nazevFirmy: string, clen: ParsedClen): Promise<void> {
    if (!clen.prijmeni) return

    // Upsert person — deduplicate by lastName + datumNarozeni
    const person = await this.prisma.kbPerson.upsert({
      where: {
        lastName_datumNarozeni: {
          lastName: clen.prijmeni!,
          datumNarozeni: clen.datumNarozeni ?? '',
        },
      },
      create: {
        firstName: clen.jmeno,
        lastName: clen.prijmeni,
        titulPred: clen.titulPred,
        datumNarozeni: clen.datumNarozeni,
        adresa: clen.adresa,
        nameNormalized: [clen.jmeno, clen.prijmeni].filter(Boolean).join(' ').toLowerCase(),
      },
      update: {
        // Update address (may have moved) and title
        ...(clen.adresa && { adresa: clen.adresa }),
        ...(clen.titulPred && { titulPred: clen.titulPred }),
        ...(clen.jmeno && { firstName: clen.jmeno }),
      },
    })

    // Upsert engagement
    const datumZapisu = clen.zapisDatum ? new Date(clen.zapisDatum) : undefined
    const datumVymazu = clen.vymazDatum ? new Date(clen.vymazDatum) : undefined
    const aktivni = !clen.vymazDatum

    // Find existing or create — unique constraint includes nullable fields
    const existing = await this.prisma.kbPersonEngagement.findFirst({
      where: { personId: person.id, ico, funkce: clen.funkce, datumZapisu: datumZapisu ?? null },
    })

    if (existing) {
      await this.prisma.kbPersonEngagement.update({
        where: { id: existing.id },
        data: {
          aktivni,
          datumVymazu,
          do: clen.funkceDo ? new Date(clen.funkceDo) : (clen.clenstviDo ? new Date(clen.clenstviDo) : undefined),
          nazevFirmy,
        },
      })
    } else {
      await this.prisma.kbPersonEngagement.create({
        data: {
          personId: person.id,
          ico,
          nazevFirmy,
          funkce: clen.funkce,
          od: clen.funkceOd ? new Date(clen.funkceOd) : (clen.clenstviOd ? new Date(clen.clenstviOd) : undefined),
          do: clen.funkceDo ? new Date(clen.funkceDo) : (clen.clenstviDo ? new Date(clen.clenstviDo) : undefined),
          aktivni,
          datumZapisu,
          datumVymazu,
          zdrojDat: 'dataor',
        },
      })
    }
  }

  private async upsertPravnickaOsoba(ico: string, nazevFirmy: string, clen: ParsedClen): Promise<void> {
    if (!clen.icoOsoby) return

    // Ensure the partner org exists in KB
    await this.prisma.kbOrganization.upsert({
      where: { ico: clen.icoOsoby },
      create: {
        ico: clen.icoOsoby,
        name: clen.nazevOsoby ?? `IČO ${clen.icoOsoby}`,
        isActive: true,
      },
      update: {
        ...(clen.nazevOsoby && { name: clen.nazevOsoby }),
      },
    })

    // Create engagement with null personId, partnerIco set
    const datumZapisu = clen.zapisDatum ? new Date(clen.zapisDatum) : undefined
    const datumVymazu = clen.vymazDatum ? new Date(clen.vymazDatum) : undefined

    const existing = await this.prisma.kbPersonEngagement.findFirst({
      where: { personId: null, ico, funkce: clen.funkce, partnerIco: clen.icoOsoby, datumZapisu: datumZapisu ?? null },
    })

    if (existing) {
      await this.prisma.kbPersonEngagement.update({
        where: { id: existing.id },
        data: { aktivni: !clen.vymazDatum, datumVymazu, partnerNazev: clen.nazevOsoby },
      })
    } else {
      await this.prisma.kbPersonEngagement.create({
        data: {
          ico,
          nazevFirmy,
          funkce: clen.funkce,
          od: clen.funkceOd ? new Date(clen.funkceOd) : undefined,
          do: clen.funkceDo ? new Date(clen.funkceDo) : undefined,
          aktivni: !clen.vymazDatum,
          datumZapisu,
          datumVymazu,
          zdrojDat: 'dataor',
          partnerIco: clen.icoOsoby,
          partnerNazev: clen.nazevOsoby,
        },
      })
    }
  }

  private buildAdresa(adresa: any): string | undefined {
    if (!adresa) return undefined
    const parts: string[] = []
    if (adresa.ulice) {
      let street = String(adresa.ulice)
      if (adresa.cisloPo) street += ` ${adresa.cisloPo}`
      if (adresa.cisloOr) street += `/${adresa.cisloOr}`
      parts.push(street)
    }
    if (adresa.castObce) parts.push(String(adresa.castObce))
    if (adresa.obec) {
      const psc = adresa.psc ? `${adresa.psc} ` : ''
      parts.push(`${psc}${adresa.obec}`)
    }
    return parts.length ? parts.join(', ') : undefined
  }

  private ensureArray(val: any): any[] {
    if (!val) return []
    return Array.isArray(val) ? val : [val]
  }
}

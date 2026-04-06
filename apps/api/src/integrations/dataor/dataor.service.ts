import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { XMLParser } from 'fast-xml-parser'
import { gunzipSync } from 'zlib'

export interface ImportStats {
  startedAt: string
  finishedAt?: string
  totalSubjektu: number
  totalOsob: number
  totalEngagements: number
  errors: string[]
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
  type: 'F' | 'P'
  jmeno?: string
  prijmeni?: string
  titulPred?: string
  datumNarozeni?: string
  adresaObec?: string    // GDPR: pouze obec z adresy
  icoOsoby?: string
  nazevOsoby?: string
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

const PRAVNI_FORMY = [
  { kod: 'svj', label: '145' },
  { kod: 'sro', label: '112' },
  { kod: 'as', label: '121' },
  { kod: 'druzstvo', label: '110' },
  { kod: 'spolek', label: '706' },
  { kod: 'komanditni', label: '113' },
  { kod: 'vos', label: '111' },
  { kod: 'statni', label: '312' },
  { kod: 'obecni', label: '801' },
]

const DATAOR_BASE = 'https://dataor.justice.cz/api/file'
const DOWNLOAD_TIMEOUT_MS = 120_000
const BATCH_SIZE = 100

@Injectable()
export class DataorService {
  private readonly logger = new Logger(DataorService.name)
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === 'Subjekt' || name === 'Udaj',
  })

  constructor(private readonly prisma: PrismaService) {}

  async importAll(
    rok: number,
    typ: 'full' | 'actual',
    filterPravniForma?: string,
    filterSoud?: string,
  ): Promise<ImportStats> {
    const stats: ImportStats = {
      startedAt: new Date().toISOString(),
      totalSubjektu: 0,
      totalOsob: 0,
      totalEngagements: 0,
      errors: [],
    }

    const formy = filterPravniForma
      ? PRAVNI_FORMY.filter(f => f.kod === filterPravniForma)
      : PRAVNI_FORMY
    const soudy = filterSoud ? [filterSoud] : SOUDY

    for (const forma of formy) {
      for (const soud of soudy) {
        try {
          const result = await this.importDataset(forma.kod, soud, rok, typ)
          stats.totalSubjektu += result.processed
          stats.totalOsob += result.persons
          stats.totalEngagements += result.engagements
        } catch (err) {
          const msg = `${forma.kod}-${typ}-${soud}-${rok}: ${(err as Error).message}`
          stats.errors.push(msg)
          if (stats.errors.length <= 20) this.logger.warn(`Dataor import error: ${msg}`)
        }
      }
    }

    stats.finishedAt = new Date().toISOString()
    this.logger.log(`Dataor import done: ${stats.totalSubjektu} subjects, ${stats.totalOsob} persons, ${stats.totalEngagements} engagements, ${stats.errors.length} errors`)
    return stats
  }

  async importDataset(
    pravniForma: string,
    soud: string,
    rok: number,
    typ: 'full' | 'actual',
  ): Promise<{ processed: number; persons: number; engagements: number }> {
    const url = `${DATAOR_BASE}/${pravniForma}-${typ}-${soud}-${rok}.xml`
    this.logger.log(`Importing ${pravniForma}-${typ}-${soud}-${rok}...`)

    const subjekty = await this.fetchAndParse(url)
    if (subjekty.length === 0) return { processed: 0, persons: 0, engagements: 0 }

    this.logger.log(`Parsed ${subjekty.length} subjects from ${pravniForma}-${typ}-${soud}-${rok}`)

    let totalPersons = 0
    let totalEngagements = 0

    // Process in batches
    for (let i = 0; i < subjekty.length; i += BATCH_SIZE) {
      const batch = subjekty.slice(i, i + BATCH_SIZE)
      for (const subjekt of batch) {
        try {
          const result = await this.upsertSubjekt(subjekt)
          totalPersons += result.persons
          totalEngagements += result.engagements
        } catch (err) {
          this.logger.debug(`Failed to upsert ${subjekt.ico}: ${err}`)
        }
      }
    }

    return { processed: subjekty.length, persons: totalPersons, engagements: totalEngagements }
  }

  async fetchAndParse(url: string): Promise<ParsedSubjekt[]> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })

    if (res.status === 404) {
      this.logger.debug(`Dataset not found: ${url}`)
      return []
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`)
    }

    let xmlText: string
    const buffer = Buffer.from(await res.arrayBuffer())

    // Check for gzip magic bytes (1f 8b)
    if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
      xmlText = gunzipSync(buffer).toString('utf-8')
    } else {
      xmlText = buffer.toString('utf-8')
    }

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
    const datumVzniku = raw.zapisDatum ? String(raw.zapisDatum) : undefined
    let spisovaZnacka: ParsedSubjekt['spisovaZnacka']
    const clenove: ParsedClen[] = []

    for (const udaj of udaje) {
      const kod = udaj.udajTyp?.kod
      switch (kod) {
        case 'PRAVNI_FORMA':
          // Normalize to numeric code
          pravniForma = udaj.pravniForma?.kod ? String(udaj.pravniForma.kod) : undefined
          if (!pravniForma) {
            // Try to map text to code
            const text = String(udaj.hodnotaText ?? '').toLowerCase()
            if (text.includes('svj') || text.includes('společenství')) pravniForma = 'svj'
            else if (text.includes('družstvo')) pravniForma = 'druzstvo'
            else if (text.includes('s.r.o')) pravniForma = 'sro'
            else if (text.includes('a.s')) pravniForma = 'as'
            else pravniForma = text
          }
          break
        case 'SIDLO':
          sidlo = this.buildSidlo(udaj.adresa)
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

    const base = {
      funkce,
      clenstviOd: raw.clenstviOd ? String(raw.clenstviOd) : undefined,
      clenstviDo: raw.clenstviDo ? String(raw.clenstviDo) : undefined,
      funkceOd: raw.funkceOd ? String(raw.funkceOd) : undefined,
      funkceDo: raw.funkceDo ? String(raw.funkceDo) : undefined,
      zapisDatum: raw.zapisDatum ? String(raw.zapisDatum) : undefined,
      vymazDatum: raw.vymazDatum ? String(raw.vymazDatum) : undefined,
    }

    if (isPO) {
      return {
        type: 'P',
        icoOsoby: osoba.ico ? String(osoba.ico) : undefined,
        nazevOsoby: osoba.nazev ? String(osoba.nazev) : undefined,
        ...base,
      }
    }

    const prijmeni = osoba.prijmeni ? String(osoba.prijmeni) : undefined
    if (!prijmeni) return null

    return {
      type: 'F',
      jmeno: osoba.jmeno ? String(osoba.jmeno) : undefined,
      prijmeni,
      titulPred: osoba.titulPredJmenem ? String(osoba.titulPredJmenem) : undefined,
      datumNarozeni: osoba.narozDatum ? String(osoba.narozDatum) : undefined,
      adresaObec: this.extractObec(raw.adresa),
      ...base,
    }
  }

  async upsertSubjekt(data: ParsedSubjekt): Promise<{ persons: number; engagements: number }> {
    const spiszn = data.spisovaZnacka
      ? `${data.spisovaZnacka.oddil} ${data.spisovaZnacka.vlozka}`.trim()
      : undefined

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

    let persons = 0
    let engagements = 0

    for (const clen of data.clenove) {
      try {
        if (clen.type === 'F') {
          const r = await this.upsertFyzickaOsoba(data.ico, data.nazev, clen)
          persons += r.personCreated ? 1 : 0
          engagements += 1
        } else if (clen.type === 'P' && clen.icoOsoby) {
          await this.upsertPravnickaOsoba(data.ico, data.nazev, clen)
          engagements += 1
        }
      } catch (err) {
        this.logger.debug(`Failed to upsert member for ${data.ico}: ${err}`)
      }
    }

    return { persons, engagements }
  }

  private async upsertFyzickaOsoba(ico: string, nazevFirmy: string, clen: ParsedClen): Promise<{ personCreated: boolean }> {
    if (!clen.prijmeni) return { personCreated: false }

    let person: { id: string }
    let personCreated = false

    if (clen.datumNarozeni) {
      // Dedup by lastName + datumNarozeni
      const existing = await this.prisma.kbPerson.findFirst({
        where: { lastName: clen.prijmeni, datumNarozeni: clen.datumNarozeni },
        select: { id: true },
      })
      if (existing) {
        person = existing
        await this.prisma.kbPerson.update({
          where: { id: person.id },
          data: {
            ...(clen.adresaObec && { city: clen.adresaObec }),
            ...(clen.titulPred && { titulPred: clen.titulPred }),
            ...(clen.jmeno && { firstName: clen.jmeno }),
          },
        })
      } else {
        person = await this.prisma.kbPerson.create({
          data: {
            firstName: clen.jmeno,
            lastName: clen.prijmeni,
            titulPred: clen.titulPred,
            datumNarozeni: clen.datumNarozeni,
            city: clen.adresaObec,
            nameNormalized: [clen.jmeno, clen.prijmeni].filter(Boolean).join(' ').toLowerCase(),
          },
        })
        personCreated = true
      }
    } else {
      // No datumNarozeni — create without unique check (accept duplicates)
      person = await this.prisma.kbPerson.create({
        data: {
          firstName: clen.jmeno,
          lastName: clen.prijmeni,
          titulPred: clen.titulPred,
          city: clen.adresaObec,
          nameNormalized: [clen.jmeno, clen.prijmeni].filter(Boolean).join(' ').toLowerCase(),
        },
      })
      personCreated = true
    }

    // Upsert engagement
    const datumZapisu = clen.zapisDatum ? new Date(clen.zapisDatum) : undefined
    const datumVymazu = clen.vymazDatum ? new Date(clen.vymazDatum) : undefined

    const existing = await this.prisma.kbPersonEngagement.findFirst({
      where: { personId: person.id, ico, funkce: clen.funkce, datumZapisu: datumZapisu ?? null },
    })

    if (existing) {
      await this.prisma.kbPersonEngagement.update({
        where: { id: existing.id },
        data: {
          aktivni: !clen.vymazDatum,
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
          aktivni: !clen.vymazDatum,
          datumZapisu,
          datumVymazu,
          zdrojDat: 'dataor',
        },
      })
    }

    return { personCreated }
  }

  private async upsertPravnickaOsoba(ico: string, nazevFirmy: string, clen: ParsedClen): Promise<void> {
    if (!clen.icoOsoby) return

    await this.prisma.kbOrganization.upsert({
      where: { ico: clen.icoOsoby },
      create: { ico: clen.icoOsoby, name: clen.nazevOsoby ?? `IČO ${clen.icoOsoby}`, isActive: true },
      update: { ...(clen.nazevOsoby && { name: clen.nazevOsoby }) },
    })

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
          ico, nazevFirmy, funkce: clen.funkce,
          od: clen.funkceOd ? new Date(clen.funkceOd) : undefined,
          do: clen.funkceDo ? new Date(clen.funkceDo) : undefined,
          aktivni: !clen.vymazDatum, datumZapisu, datumVymazu,
          zdrojDat: 'dataor', partnerIco: clen.icoOsoby, partnerNazev: clen.nazevOsoby,
        },
      })
    }
  }

  /** Build full sídlo address from XML <adresa> element. */
  private buildSidlo(adresa: any): string | undefined {
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

  /** GDPR: extract only obec (city name) from member address. */
  private extractObec(adresa: any): string | undefined {
    if (!adresa) return undefined
    return adresa.obec ? String(adresa.obec) : undefined
  }

  private ensureArray(val: any): any[] {
    if (!val) return []
    return Array.isArray(val) ? val : [val]
  }
}

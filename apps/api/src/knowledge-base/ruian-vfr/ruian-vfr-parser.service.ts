import { Injectable, Logger } from '@nestjs/common'
import { createReadStream } from 'fs'
import * as sax from 'sax'

/**
 * ST_UADS VFR XML format — flat address records:
 *
 * <vfa:Adresa>
 *   <vfa:OkresKod>3502</vfa:OkresKod>
 *   <vfa:ObecKod>562343</vfa:ObecKod>
 *   <vfa:ObecNazev>Arnoltice</vfa:ObecNazev>
 *   <vfa:CastObceNazev>Arnoltice</vfa:CastObceNazev>
 *   <vfa:PostaKod>40714</vfa:PostaKod>
 *   <vfa:StavebniObjektKod>19</vfa:StavebniObjektKod>
 *   <vfa:AdresniMistoKod>19</vfa:AdresniMistoKod>
 *   <vfa:CisloDomovni>1</vfa:CisloDomovni>
 *   <vfa:CisloOrientacni>3</vfa:CisloOrientacni>          (optional)
 *   <vfa:CisloOrientacniPismeno>a</vfa:CisloOrientacniPismeno> (optional)
 *   <vfa:UliceKod>123456</vfa:UliceKod>                   (optional)
 *   <vfa:UliceNazev>Hlavní</vfa:UliceNazev>               (optional)
 * </vfa:Adresa>
 *
 * No GPS coordinates in ST_UADS — addresses only.
 */

export interface ParsedObec {
  id: number
  name: string
  districtCode?: number
}

export interface ParsedUlice {
  id: number
  name: string
  obecId: number
}

export interface ParsedAdresniMisto {
  id: number
  houseNumber?: number
  orientationNumber?: number
  orientationNumberLetter?: string
  postalCode?: string
  obecId?: number
  uliceId?: number
  stavebniObjektId?: number
  castObceNazev?: string
}

export type ParseCallback = {
  onObec?: (rec: ParsedObec) => void
  onUlice?: (rec: ParsedUlice) => void
  onAdresniMisto?: (rec: ParsedAdresniMisto) => void
  onProgress?: (count: number) => void
}

@Injectable()
export class RuianVfrParserService {
  private readonly logger = new Logger(RuianVfrParserService.name)

  /** Stream-parse ST_UADS VFR XML using SAX — memory-safe for 2+ GB files */
  async parseXml(filePath: string, callbacks: ParseCallback): Promise<{ counts: Record<string, number> }> {
    const counts = { obec: 0, ulice: 0, adresniMisto: 0 }
    const seenObce = new Set<number>()
    const seenUlice = new Set<string>() // "uliceId:obecId"

    return new Promise((resolve, reject) => {
      const parser = sax.createStream(true, { trim: true })
      let currentText = ''
      let inAdresa = false

      // Current address record fields
      let okresKod: number | undefined
      let obecKod: number | undefined
      let obecNazev: string | undefined
      let castObceNazev: string | undefined
      let postaKod: string | undefined
      let stavebniObjektKod: number | undefined
      let adresniMistoKod: number | undefined
      let cisloDomovni: number | undefined
      let cisloOrientacni: number | undefined
      let cisloOrientacniPismeno: string | undefined
      let uliceKod: number | undefined
      let uliceNazev: string | undefined

      parser.on('opentag', (node) => {
        const local = this.localName(node.name)
        currentText = ''
        if (local === 'Adresa') {
          inAdresa = true
          okresKod = obecKod = stavebniObjektKod = adresniMistoKod = cisloDomovni = cisloOrientacni = uliceKod = undefined
          obecNazev = castObceNazev = postaKod = cisloOrientacniPismeno = uliceNazev = undefined
        }
      })

      parser.on('text', (text) => { currentText += text })
      parser.on('cdata', (text) => { currentText += text })

      parser.on('closetag', (name) => {
        const local = this.localName(name)
        const text = currentText.trim()

        if (inAdresa) {
          switch (local) {
            case 'OkresKod': okresKod = parseInt(text, 10) || undefined; break
            case 'ObecKod': obecKod = parseInt(text, 10) || undefined; break
            case 'ObecNazev': obecNazev = text || undefined; break
            case 'CastObceNazev': castObceNazev = text || undefined; break
            case 'PostaKod': postaKod = text || undefined; break
            case 'StavebniObjektKod': stavebniObjektKod = parseInt(text, 10) || undefined; break
            case 'AdresniMistoKod': adresniMistoKod = parseInt(text, 10) || undefined; break
            case 'CisloDomovni': cisloDomovni = parseInt(text, 10) || undefined; break
            case 'CisloOrientacni': cisloOrientacni = parseInt(text, 10) || undefined; break
            case 'CisloOrientacniPismeno': cisloOrientacniPismeno = text || undefined; break
            case 'UliceKod': uliceKod = parseInt(text, 10) || undefined; break
            case 'UliceNazev': uliceNazev = text || undefined; break
            case 'Adresa':
              // Emit obec if new
              if (obecKod && obecNazev && !seenObce.has(obecKod)) {
                seenObce.add(obecKod)
                counts.obec++
                callbacks.onObec?.({ id: obecKod, name: obecNazev, districtCode: okresKod })
              }

              // Emit ulice if new
              if (uliceKod && uliceNazev && obecKod) {
                const uliceKey = `${uliceKod}:${obecKod}`
                if (!seenUlice.has(uliceKey)) {
                  seenUlice.add(uliceKey)
                  counts.ulice++
                  callbacks.onUlice?.({ id: uliceKod, name: uliceNazev, obecId: obecKod })
                }
              }

              // Emit adresní místo
              if (adresniMistoKod) {
                counts.adresniMisto++
                callbacks.onAdresniMisto?.({
                  id: adresniMistoKod,
                  houseNumber: cisloDomovni,
                  orientationNumber: cisloOrientacni,
                  orientationNumberLetter: cisloOrientacniPismeno,
                  postalCode: postaKod,
                  obecId: obecKod,
                  uliceId: uliceKod,
                  stavebniObjektId: stavebniObjektKod,
                  castObceNazev,
                })
                if (counts.adresniMisto % 100000 === 0) {
                  callbacks.onProgress?.(counts.adresniMisto)
                }
              }

              inAdresa = false
              break
          }
        }

        currentText = ''
      })

      parser.on('error', (err) => {
        this.logger.error(`SAX parse error: ${err.message}`)
        reject(err)
      })

      parser.on('end', () => {
        this.logger.log(`VFR parse complete: ${JSON.stringify(counts)}`)
        resolve({ counts })
      })

      const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 })
      stream.pipe(parser)
    })
  }

  /** Parse CSV file (fallback format) — one row per address */
  async parseCsv(
    filePath: string,
    callbacks: ParseCallback,
  ): Promise<{ counts: Record<string, number> }> {
    const { createInterface } = await import('readline')
    const counts = { adresniMisto: 0, obec: 0, ulice: 0 }
    const seenObce = new Set<number>()
    const seenUlice = new Set<number>()

    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    })

    let headerParsed = false
    let headers: string[] = []

    for await (const line of rl) {
      if (!headerParsed) {
        // Detect delimiter: semicolon or comma
        const delimiter = line.includes(';') ? ';' : ','
        headers = line.split(delimiter).map(h => h.trim().replace(/"/g, ''))
        headerParsed = true
        continue
      }

      const delimiter = line.includes(';') ? ';' : ','
      const cols = line.split(delimiter).map(c => c.trim().replace(/"/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i] ?? '' })

      // Emit obec if not seen
      const obecId = parseInt(row['KodObce'] || row['ObecKod'] || '', 10)
      const obecNazev = row['NazevObce'] || row['ObecNazev'] || ''
      if (obecId && !seenObce.has(obecId)) {
        seenObce.add(obecId)
        counts.obec++
        callbacks.onObec?.({ id: obecId, name: obecNazev })
      }

      // Emit ulice if not seen
      const uliceId = parseInt(row['KodUlice'] || row['UliceKod'] || '', 10)
      const uliceNazev = row['NazevUlice'] || row['UliceNazev'] || ''
      if (uliceId && !seenUlice.has(uliceId)) {
        seenUlice.add(uliceId)
        counts.ulice++
        callbacks.onUlice?.({ id: uliceId, name: uliceNazev, obecId })
      }

      // Emit adresní místo
      const amId = parseInt(row['KodADM'] || row['Kod'] || row['AdresniMistoKod'] || '', 10)
      if (!amId) continue

      counts.adresniMisto++
      callbacks.onAdresniMisto?.({
        id: amId,
        houseNumber: parseInt(row['CisloDomovni'] || '', 10) || undefined,
        orientationNumber: parseInt(row['CisloOrientacni'] || '', 10) || undefined,
        orientationNumberLetter: row['CisloOrientacniPismeno'] || undefined,
        postalCode: row['PSC'] || row['Psc'] || row['PostaKod'] || undefined,
        obecId: obecId || undefined,
        uliceId: uliceId || undefined,
        stavebniObjektId: parseInt(row['KodStavebnihoObjektu'] || row['StavebniObjektKod'] || '', 10) || undefined,
        castObceNazev: row['NazevCastiObce'] || row['CastObceNazev'] || undefined,
      })

      if (counts.adresniMisto % 100000 === 0) callbacks.onProgress?.(counts.adresniMisto)
    }

    this.logger.log(`CSV parse complete: ${JSON.stringify(counts)}`)
    return { counts }
  }

  /** Strip namespace prefix from tag name */
  private localName(name: string): string {
    const i = name.lastIndexOf(':')
    return i >= 0 ? name.substring(i + 1) : name
  }
}

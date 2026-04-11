import { Injectable, Logger } from '@nestjs/common'
import { createReadStream } from 'fs'
import * as sax from 'sax'

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

export interface ParseCallbacks {
  onObec?: (rec: ParsedObec) => void
  onUlice?: (rec: ParsedUlice) => void
  /** Called with a batch of addresses when buffer reaches batchSize. Must return a Promise. */
  onAdresniMistoBatch?: (batch: ParsedAdresniMisto[]) => Promise<void>
  onProgress?: (count: number) => void
  /** How many addresses to buffer before flushing. Default 1000. */
  batchSize?: number
}

@Injectable()
export class RuianVfrParserService {
  private readonly logger = new Logger(RuianVfrParserService.name)

  /**
   * Stream-parse ST_UADS VFR XML with backpressure.
   * Obce/Ulice are collected synchronously (small sets).
   * Adresní místa are flushed in batches via async callback — the read stream
   * is paused during flush to prevent memory accumulation.
   */
  async parseXml(filePath: string, callbacks: ParseCallbacks): Promise<{ counts: Record<string, number> }> {
    const counts = { obec: 0, ulice: 0, adresniMisto: 0 }
    const seenObce = new Set<number>()
    const seenUlice = new Set<string>()
    const batchSize = callbacks.batchSize ?? 1000
    let amBuffer: ParsedAdresniMisto[] = []
    let settled = false

    return new Promise((resolve, reject) => {
      const settle = (fn: () => void) => { if (!settled) { settled = true; fn() } }

      const saxStream = sax.createStream(true, { trim: true })
      const fileStream = createReadStream(filePath, { highWaterMark: 64 * 1024 })
      let currentText = ''
      let inAdresa = false

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

      const flushBuffer = async () => {
        if (amBuffer.length === 0) return
        const batch = amBuffer
        amBuffer = []
        if (callbacks.onAdresniMistoBatch) {
          fileStream.pause()
          try {
            await callbacks.onAdresniMistoBatch(batch)
          } catch (err) {
            settle(() => reject(err))
            fileStream.destroy()
            return
          }
          fileStream.resume()
        }
      }

      saxStream.on('opentag', (node) => {
        const local = this.localName(node.name)
        currentText = ''
        if (local === 'Adresa') {
          inAdresa = true
          okresKod = obecKod = stavebniObjektKod = adresniMistoKod = cisloDomovni = cisloOrientacni = uliceKod = undefined
          obecNazev = castObceNazev = postaKod = cisloOrientacniPismeno = uliceNazev = undefined
        }
      })

      saxStream.on('text', (text) => { currentText += text })
      saxStream.on('cdata', (text) => { currentText += text })

      saxStream.on('closetag', (name) => {
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
              if (obecKod && obecNazev && !seenObce.has(obecKod)) {
                seenObce.add(obecKod)
                counts.obec++
                callbacks.onObec?.({ id: obecKod, name: obecNazev, districtCode: okresKod })
              }
              if (uliceKod && uliceNazev && obecKod) {
                const key = `${uliceKod}:${obecKod}`
                if (!seenUlice.has(key)) {
                  seenUlice.add(key)
                  counts.ulice++
                  callbacks.onUlice?.({ id: uliceKod, name: uliceNazev, obecId: obecKod })
                }
              }
              if (adresniMistoKod) {
                counts.adresniMisto++
                amBuffer.push({
                  id: adresniMistoKod, houseNumber: cisloDomovni,
                  orientationNumber: cisloOrientacni, orientationNumberLetter: cisloOrientacniPismeno,
                  postalCode: postaKod, obecId: obecKod, uliceId: uliceKod,
                  stavebniObjektId: stavebniObjektKod, castObceNazev,
                })
                if (counts.adresniMisto % 100000 === 0) {
                  callbacks.onProgress?.(counts.adresniMisto)
                }
                // Backpressure: when buffer full, pause stream and flush
                if (amBuffer.length >= batchSize) {
                  flushBuffer().catch(err => settle(() => reject(err)))
                }
              }
              inAdresa = false
              break
          }
        }
        currentText = ''
      })

      saxStream.on('error', (err) => {
        this.logger.error(`SAX parse error: ${err.message}`)
        settle(() => reject(err))
      })

      fileStream.on('error', (err) => {
        this.logger.error(`File read error: ${err.message}`)
        settle(() => reject(err))
      })

      saxStream.on('end', () => {
        // Flush remaining buffer
        flushBuffer()
          .then(() => {
            this.logger.log(`VFR parse complete: ${JSON.stringify(counts)}`)
            settle(() => resolve({ counts }))
          })
          .catch(err => settle(() => reject(err)))
      })

      fileStream.pipe(saxStream)
    })
  }

  /** Parse CSV file — line-by-line streaming */
  async parseCsv(filePath: string, callbacks: ParseCallbacks): Promise<{ counts: Record<string, number> }> {
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
        const delimiter = line.includes(';') ? ';' : ','
        headers = line.split(delimiter).map(h => h.trim().replace(/"/g, ''))
        headerParsed = true
        continue
      }

      const delimiter = line.includes(';') ? ';' : ','
      const cols = line.split(delimiter).map(c => c.trim().replace(/"/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i] ?? '' })

      const obecId = parseInt(row['KodObce'] || row['ObecKod'] || '', 10)
      const obecNazev = row['NazevObce'] || row['ObecNazev'] || ''
      if (obecId && !seenObce.has(obecId)) {
        seenObce.add(obecId)
        counts.obec++
        callbacks.onObec?.({ id: obecId, name: obecNazev })
      }

      const uliceId = parseInt(row['KodUlice'] || row['UliceKod'] || '', 10)
      const uliceNazev = row['NazevUlice'] || row['UliceNazev'] || ''
      if (uliceId && !seenUlice.has(uliceId)) {
        seenUlice.add(uliceId)
        counts.ulice++
        callbacks.onUlice?.({ id: uliceId, name: uliceNazev, obecId })
      }

      const amId = parseInt(row['KodADM'] || row['Kod'] || row['AdresniMistoKod'] || '', 10)
      if (!amId) continue

      counts.adresniMisto++
      if (callbacks.onAdresniMistoBatch) {
        // For CSV, collect and flush inline (already async via for-await)
        await callbacks.onAdresniMistoBatch([{
          id: amId,
          houseNumber: parseInt(row['CisloDomovni'] || '', 10) || undefined,
          orientationNumber: parseInt(row['CisloOrientacni'] || '', 10) || undefined,
          orientationNumberLetter: row['CisloOrientacniPismeno'] || undefined,
          postalCode: row['PSC'] || row['Psc'] || row['PostaKod'] || undefined,
          obecId: obecId || undefined,
          uliceId: uliceId || undefined,
          stavebniObjektId: parseInt(row['KodStavebnihoObjektu'] || row['StavebniObjektKod'] || '', 10) || undefined,
          castObceNazev: row['NazevCastiObce'] || row['CastObceNazev'] || undefined,
        }])
      }

      if (counts.adresniMisto % 100000 === 0) callbacks.onProgress?.(counts.adresniMisto)
    }

    this.logger.log(`CSV parse complete: ${JSON.stringify(counts)}`)
    return { counts }
  }

  private localName(name: string): string {
    const i = name.lastIndexOf(':')
    return i >= 0 ? name.substring(i + 1) : name
  }
}

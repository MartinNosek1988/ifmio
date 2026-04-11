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

export interface FlushBatch {
  obce: ParsedObec[]
  ulice: ParsedUlice[]
  adresy: ParsedAdresniMisto[]
}

export interface ParseCallbacks {
  /** Called with a batch when buffer reaches batchSize. Obce/ulice included on first-seen. Must return a Promise. */
  onFlushBatch: (batch: FlushBatch) => Promise<void>
  onProgress?: (count: number) => void
  batchSize?: number
}

@Injectable()
export class RuianVfrParserService {
  private readonly logger = new Logger(RuianVfrParserService.name)

  /**
   * Stream-parse ST_UADS VFR XML with backpressure and serialized flushes.
   * Each batch contains new obce/ulice (first-seen) + addresses.
   * Obce/ulice are flushed BEFORE addresses to satisfy FK constraints.
   */
  async parseXml(filePath: string, callbacks: ParseCallbacks): Promise<{ counts: Record<string, number> }> {
    const counts = { obec: 0, ulice: 0, adresniMisto: 0 }
    const seenObce = new Set<number>()
    const seenUlice = new Set<string>()
    const batchSize = callbacks.batchSize ?? 1000

    let amBuffer: ParsedAdresniMisto[] = []
    let pendingObce: ParsedObec[] = []
    let pendingUlice: ParsedUlice[] = []
    let flushPromise = Promise.resolve()
    let settled = false
    let fatalError: Error | null = null

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

      const scheduleFlush = () => {
        if (amBuffer.length === 0) return
        const batch: FlushBatch = {
          obce: pendingObce,
          ulice: pendingUlice,
          adresy: amBuffer,
        }
        pendingObce = []
        pendingUlice = []
        amBuffer = []

        // Chain onto flushPromise to serialize flushes
        fileStream.pause()
        flushPromise = flushPromise
          .then(() => callbacks.onFlushBatch(batch))
          .then(() => { fileStream.resume() })
          .catch(err => {
            fatalError = err instanceof Error ? err : new Error(String(err))
            fileStream.unpipe(saxStream)
            fileStream.destroy()
            settle(() => reject(fatalError))
          })
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
        if (fatalError) return
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
              // Collect first-seen obce/ulice for FK-safe flush
              if (obecKod && obecNazev && !seenObce.has(obecKod)) {
                seenObce.add(obecKod)
                counts.obec++
                pendingObce.push({ id: obecKod, name: obecNazev, districtCode: okresKod })
              }
              if (uliceKod && uliceNazev && obecKod) {
                const key = `${uliceKod}:${obecKod}`
                if (!seenUlice.has(key)) {
                  seenUlice.add(key)
                  counts.ulice++
                  pendingUlice.push({ id: uliceKod, name: uliceNazev, obecId: obecKod })
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
                if (counts.adresniMisto % 10000 === 0) {
                  callbacks.onProgress?.(counts.adresniMisto)
                }
                if (amBuffer.length >= batchSize) {
                  scheduleFlush()
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
        fileStream.unpipe(saxStream)
        fileStream.destroy()
        settle(() => reject(err))
      })

      fileStream.on('error', (err) => {
        this.logger.error(`File read error: ${err.message}`)
        settle(() => reject(err))
      })

      saxStream.on('end', () => {
        // Schedule final flush for remaining buffer, then wait for all flushes
        scheduleFlush()
        flushPromise
          .then(() => {
            this.logger.log(`VFR parse complete: ${JSON.stringify(counts)}`)
            settle(() => resolve({ counts }))
          })
          .catch(err => settle(() => reject(err)))
      })

      fileStream.pipe(saxStream)
    })
  }

  /** Parse CSV with batched flush */
  async parseCsv(filePath: string, callbacks: ParseCallbacks): Promise<{ counts: Record<string, number> }> {
    const { createInterface } = await import('readline')
    const counts = { adresniMisto: 0, obec: 0, ulice: 0 }
    const seenObce = new Set<number>()
    const seenUlice = new Set<number>()
    const batchSize = callbacks.batchSize ?? 1000

    let amBuffer: ParsedAdresniMisto[] = []
    let pendingObce: ParsedObec[] = []
    let pendingUlice: ParsedUlice[] = []

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
        pendingObce.push({ id: obecId, name: obecNazev })
      }

      const uliceId = parseInt(row['KodUlice'] || row['UliceKod'] || '', 10)
      const uliceNazev = row['NazevUlice'] || row['UliceNazev'] || ''
      if (uliceId && !seenUlice.has(uliceId)) {
        seenUlice.add(uliceId)
        counts.ulice++
        pendingUlice.push({ id: uliceId, name: uliceNazev, obecId })
      }

      const amId = parseInt(row['KodADM'] || row['Kod'] || row['AdresniMistoKod'] || '', 10)
      if (!amId) continue

      counts.adresniMisto++
      amBuffer.push({
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

      if (amBuffer.length >= batchSize) {
        await callbacks.onFlushBatch({ obce: pendingObce, ulice: pendingUlice, adresy: amBuffer })
        pendingObce = []
        pendingUlice = []
        amBuffer = []
      }

      if (counts.adresniMisto % 10000 === 0) callbacks.onProgress?.(counts.adresniMisto)
    }

    // Flush remainder
    if (amBuffer.length > 0 || pendingObce.length > 0 || pendingUlice.length > 0) {
      await callbacks.onFlushBatch({ obce: pendingObce, ulice: pendingUlice, adresy: amBuffer })
    }

    this.logger.log(`CSV parse complete: ${JSON.stringify(counts)}`)
    return { counts }
  }

  private localName(name: string): string {
    const i = name.lastIndexOf(':')
    return i >= 0 ? name.substring(i + 1) : name
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { createReadStream } from 'fs'
import * as sax from 'sax'
import proj4 from 'proj4'

// S-JTSK (EPSG:5514) → WGS84 (EPSG:4326)
proj4.defs(
  'EPSG:5514',
  '+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=570.8,85.7,462.8,4.998,1.587,5.261,3.56 +units=m +no_defs',
)

export interface ParsedObec {
  id: number
  name: string
  statusCode?: number
  districtCode?: number
  regionCode?: number
  nutsLau?: string
}

export interface ParsedUlice {
  id: number
  name: string
  obecId: number
}

export interface ParsedStavebniObjekt {
  id: number
  buildingType?: string
  numberOfFloors?: number
  numberOfUnits?: number
  builtUpArea?: number
  buildingTechCode?: number
  cadastralTerritoryCode?: number
  lat?: number
  lng?: number
  iscrCode?: string
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
  lat?: number
  lng?: number
}

export type ParseCallback = {
  onObec?: (rec: ParsedObec) => void
  onUlice?: (rec: ParsedUlice) => void
  onStavebniObjekt?: (rec: ParsedStavebniObjekt) => void
  onAdresniMisto?: (rec: ParsedAdresniMisto) => void
  onProgress?: (count: number) => void
}

@Injectable()
export class RuianVfrParserService {
  private readonly logger = new Logger(RuianVfrParserService.name)

  /** Convert S-JTSK coordinates to WGS84 */
  sjtskToWgs84(y: number, x: number): { lat: number; lng: number } {
    // VFR uses negative S-JTSK values
    const [lng, lat] = proj4('EPSG:5514', 'EPSG:4326', [y, x])
    return { lat, lng }
  }

  /** Stream-parse VFR XML using SAX — memory-safe for 1+ GB files */
  async parseXml(filePath: string, callbacks: ParseCallback): Promise<{ counts: Record<string, number> }> {
    const counts = { obec: 0, ulice: 0, stavebniObjekt: 0, adresniMisto: 0 }

    return new Promise((resolve, reject) => {
      const parser = sax.createStream(true, { trim: true })
      const tagStack: string[] = []
      let currentText = ''

      // Current record being built
      let currentObec: Partial<ParsedObec> = {}
      let currentUlice: Partial<ParsedUlice> = {}
      let currentSO: Partial<ParsedStavebniObjekt> = {}
      let currentAM: Partial<ParsedAdresniMisto> = {}
      let inObec = false
      let inUlice = false
      let inSO = false
      let inAM = false
      let inPos = false

      parser.on('opentag', (node) => {
        const local = this.localName(node.name)
        tagStack.push(local)
        currentText = ''

        if (local === 'Obec' && !inAM && !inSO) { inObec = true; currentObec = {} }
        else if (local === 'Ulice' && !inAM) { inUlice = true; currentUlice = {} }
        else if (local === 'StavebniObjekt') { inSO = true; currentSO = {} }
        else if (local === 'AdresniMisto') { inAM = true; currentAM = {} }
        else if (local === 'pos' || local === 'Point') { inPos = true }
      })

      parser.on('text', (text) => {
        currentText += text
      })

      parser.on('cdata', (text) => {
        currentText += text
      })

      parser.on('closetag', (name) => {
        const local = this.localName(name)
        const text = currentText.trim()
        const parent = tagStack.length >= 2 ? tagStack[tagStack.length - 2] : ''

        if (inObec && !inAM && !inSO && !inUlice) {
          if (local === 'Kod' && parent === 'Obec') currentObec.id = parseInt(text, 10)
          else if (local === 'Nazev' && parent === 'Obec') currentObec.name = text
          else if (local === 'StatusKod') currentObec.statusCode = parseInt(text, 10)
          else if (local === 'OkresKod') currentObec.districtCode = parseInt(text, 10)
          else if (local === 'KrajKod') currentObec.regionCode = parseInt(text, 10)
          else if (local === 'NutsLau') currentObec.nutsLau = text
          else if (local === 'Obec') {
            if (currentObec.id && currentObec.name) {
              counts.obec++
              callbacks.onObec?.(currentObec as ParsedObec)
              if (counts.obec % 1000 === 0) callbacks.onProgress?.(counts.obec)
            }
            inObec = false
          }
        }

        if (inUlice && !inAM) {
          if (local === 'Kod' && parent === 'Ulice') currentUlice.id = parseInt(text, 10)
          else if (local === 'Nazev' && parent === 'Ulice') currentUlice.name = text
          else if (local === 'ObecKod') currentUlice.obecId = parseInt(text, 10)
          else if (local === 'Ulice') {
            if (currentUlice.id && currentUlice.name && currentUlice.obecId) {
              counts.ulice++
              callbacks.onUlice?.(currentUlice as ParsedUlice)
              if (counts.ulice % 5000 === 0) callbacks.onProgress?.(counts.ulice)
            }
            inUlice = false
          }
        }

        if (inSO && !inAM) {
          if (local === 'Kod' && parent === 'StavebniObjekt') currentSO.id = parseInt(text, 10)
          else if (local === 'TypStavebnihoObjektuKod') currentSO.buildingType = text
          else if (local === 'PocetPodlazi') currentSO.numberOfFloors = parseInt(text, 10)
          else if (local === 'PocetBytu') currentSO.numberOfUnits = parseInt(text, 10)
          else if (local === 'ZasatavenaPlocha' || local === 'ZastavenaPlochaPodlazi') currentSO.builtUpArea = parseFloat(text)
          else if (local === 'ZpusobVyuzitiKod') currentSO.buildingTechCode = parseInt(text, 10)
          else if (local === 'KatastralniUzemiKod') currentSO.cadastralTerritoryCode = parseInt(text, 10)
          else if (local === 'IscrKod') currentSO.iscrCode = text
          else if ((local === 'pos') && inPos && inSO) {
            const coords = text.split(/\s+/)
            if (coords.length >= 2) {
              const y = parseFloat(coords[0])
              const x = parseFloat(coords[1])
              if (!isNaN(y) && !isNaN(x)) {
                const wgs = this.sjtskToWgs84(y, x)
                currentSO.lat = wgs.lat
                currentSO.lng = wgs.lng
              }
            }
            inPos = false
          }
          else if (local === 'StavebniObjekt') {
            if (currentSO.id) {
              counts.stavebniObjekt++
              callbacks.onStavebniObjekt?.(currentSO as ParsedStavebniObjekt)
              if (counts.stavebniObjekt % 50000 === 0) callbacks.onProgress?.(counts.stavebniObjekt)
            }
            inSO = false
          }
        }

        if (inAM) {
          if (local === 'Kod' && parent === 'AdresniMisto') currentAM.id = parseInt(text, 10)
          else if (local === 'CisloDomovni') currentAM.houseNumber = parseInt(text, 10)
          else if (local === 'CisloOrientacni') currentAM.orientationNumber = parseInt(text, 10)
          else if (local === 'CisloOrientacniPismeno') currentAM.orientationNumberLetter = text
          else if (local === 'PSC') currentAM.postalCode = text
          else if (local === 'ObecKod') currentAM.obecId = parseInt(text, 10)
          else if (local === 'UliceKod') currentAM.uliceId = parseInt(text, 10)
          else if (local === 'StavebniObjektKod') currentAM.stavebniObjektId = parseInt(text, 10)
          else if (local === 'CastObceNazev') currentAM.castObceNazev = text
          else if ((local === 'pos') && inPos && inAM) {
            const coords = text.split(/\s+/)
            if (coords.length >= 2) {
              const y = parseFloat(coords[0])
              const x = parseFloat(coords[1])
              if (!isNaN(y) && !isNaN(x)) {
                const wgs = this.sjtskToWgs84(y, x)
                currentAM.lat = wgs.lat
                currentAM.lng = wgs.lng
              }
            }
            inPos = false
          }
          else if (local === 'AdresniMisto') {
            if (currentAM.id) {
              counts.adresniMisto++
              callbacks.onAdresniMisto?.(currentAM as ParsedAdresniMisto)
              if (counts.adresniMisto % 100000 === 0) callbacks.onProgress?.(counts.adresniMisto)
            }
            inAM = false
          }
        }

        if (local === 'pos' || local === 'Point') inPos = false
        tagStack.pop()
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
    const counts = { adresniMisto: 0, obec: 0, ulice: 0, stavebniObjekt: 0 }
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
        headers = line.split(';').map(h => h.trim().replace(/"/g, ''))
        headerParsed = true
        continue
      }

      const cols = line.split(';').map(c => c.trim().replace(/"/g, ''))
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
      const amId = parseInt(row['KodADM'] || row['Kod'] || '', 10)
      if (!amId) continue

      let lat: number | undefined
      let lng: number | undefined
      const souradniceY = parseFloat(row['SouradniceY'] || '')
      const souradniceX = parseFloat(row['SouradniceX'] || '')
      if (!isNaN(souradniceY) && !isNaN(souradniceX) && souradniceY !== 0 && souradniceX !== 0) {
        const wgs = this.sjtskToWgs84(-souradniceY, -souradniceX)
        lat = wgs.lat
        lng = wgs.lng
      }

      counts.adresniMisto++
      callbacks.onAdresniMisto?.({
        id: amId,
        houseNumber: parseInt(row['CisloDomovni'] || '', 10) || undefined,
        orientationNumber: parseInt(row['CisloOrientacni'] || '', 10) || undefined,
        orientationNumberLetter: row['CisloOrientacniPismeno'] || undefined,
        postalCode: row['PSC'] || row['Psc'] || undefined,
        obecId: obecId || undefined,
        uliceId: uliceId || undefined,
        stavebniObjektId: parseInt(row['KodStavebnihoObjektu'] || row['StavebniObjektKod'] || '', 10) || undefined,
        castObceNazev: row['NazevCastiObce'] || row['CastObceNazev'] || undefined,
        lat,
        lng,
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

import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// ── Diacritics removal ─────────────────────────────────

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// ── RÚIAN ArcGIS ───────────────────────────────────────

const RUIAN_BASE = 'https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer'

// ── Static data: Kraje (NUTS3) ─────────────────────────

const KRAJE: Array<{ code: string; name: string; lat: number; lng: number }> = [
  { code: 'CZ010', name: 'Hlavní město Praha', lat: 50.08, lng: 14.42 },
  { code: 'CZ020', name: 'Středočeský kraj', lat: 49.87, lng: 14.78 },
  { code: 'CZ031', name: 'Jihočeský kraj', lat: 49.05, lng: 14.47 },
  { code: 'CZ032', name: 'Plzeňský kraj', lat: 49.74, lng: 13.38 },
  { code: 'CZ041', name: 'Karlovarský kraj', lat: 50.23, lng: 12.87 },
  { code: 'CZ042', name: 'Ústecký kraj', lat: 50.66, lng: 14.04 },
  { code: 'CZ051', name: 'Liberecký kraj', lat: 50.77, lng: 15.05 },
  { code: 'CZ052', name: 'Královéhradecký kraj', lat: 50.35, lng: 15.83 },
  { code: 'CZ053', name: 'Pardubický kraj', lat: 49.94, lng: 16.01 },
  { code: 'CZ063', name: 'Kraj Vysočina', lat: 49.40, lng: 15.58 },
  { code: 'CZ064', name: 'Jihomoravský kraj', lat: 49.19, lng: 16.61 },
  { code: 'CZ071', name: 'Olomoucký kraj', lat: 49.66, lng: 17.10 },
  { code: 'CZ072', name: 'Zlínský kraj', lat: 49.22, lng: 17.66 },
  { code: 'CZ080', name: 'Moravskoslezský kraj', lat: 49.83, lng: 18.17 },
]

// ── Static data: Okresy (LAU1) mapped to parent kraj ───
// code = CZ + NUTS3 suffix + okres sequence; krajCode = parent NUTS3

const OKRESY: Array<{ code: string; name: string; krajCode: string }> = [
  // Hlavní město Praha (1 okres = kraj)
  { code: 'CZ0100', name: 'Hlavní město Praha', krajCode: 'CZ010' },
  // Středočeský kraj
  { code: 'CZ0201', name: 'Benešov', krajCode: 'CZ020' },
  { code: 'CZ0202', name: 'Beroun', krajCode: 'CZ020' },
  { code: 'CZ0203', name: 'Kladno', krajCode: 'CZ020' },
  { code: 'CZ0204', name: 'Kolín', krajCode: 'CZ020' },
  { code: 'CZ0205', name: 'Kutná Hora', krajCode: 'CZ020' },
  { code: 'CZ0206', name: 'Mělník', krajCode: 'CZ020' },
  { code: 'CZ0207', name: 'Mladá Boleslav', krajCode: 'CZ020' },
  { code: 'CZ0208', name: 'Nymburk', krajCode: 'CZ020' },
  { code: 'CZ0209', name: 'Praha-východ', krajCode: 'CZ020' },
  { code: 'CZ020A', name: 'Praha-západ', krajCode: 'CZ020' },
  { code: 'CZ020B', name: 'Příbram', krajCode: 'CZ020' },
  { code: 'CZ020C', name: 'Rakovník', krajCode: 'CZ020' },
  // Jihočeský kraj
  { code: 'CZ0311', name: 'České Budějovice', krajCode: 'CZ031' },
  { code: 'CZ0312', name: 'Český Krumlov', krajCode: 'CZ031' },
  { code: 'CZ0313', name: 'Jindřichův Hradec', krajCode: 'CZ031' },
  { code: 'CZ0314', name: 'Písek', krajCode: 'CZ031' },
  { code: 'CZ0315', name: 'Prachatice', krajCode: 'CZ031' },
  { code: 'CZ0316', name: 'Strakonice', krajCode: 'CZ031' },
  { code: 'CZ0317', name: 'Tábor', krajCode: 'CZ031' },
  // Plzeňský kraj
  { code: 'CZ0321', name: 'Domažlice', krajCode: 'CZ032' },
  { code: 'CZ0322', name: 'Klatovy', krajCode: 'CZ032' },
  { code: 'CZ0323', name: 'Plzeň-město', krajCode: 'CZ032' },
  { code: 'CZ0324', name: 'Plzeň-jih', krajCode: 'CZ032' },
  { code: 'CZ0325', name: 'Plzeň-sever', krajCode: 'CZ032' },
  { code: 'CZ0326', name: 'Rokycany', krajCode: 'CZ032' },
  { code: 'CZ0327', name: 'Tachov', krajCode: 'CZ032' },
  // Karlovarský kraj
  { code: 'CZ0411', name: 'Cheb', krajCode: 'CZ041' },
  { code: 'CZ0412', name: 'Karlovy Vary', krajCode: 'CZ041' },
  { code: 'CZ0413', name: 'Sokolov', krajCode: 'CZ041' },
  // Ústecký kraj
  { code: 'CZ0421', name: 'Děčín', krajCode: 'CZ042' },
  { code: 'CZ0422', name: 'Chomutov', krajCode: 'CZ042' },
  { code: 'CZ0423', name: 'Litoměřice', krajCode: 'CZ042' },
  { code: 'CZ0424', name: 'Louny', krajCode: 'CZ042' },
  { code: 'CZ0425', name: 'Most', krajCode: 'CZ042' },
  { code: 'CZ0426', name: 'Teplice', krajCode: 'CZ042' },
  { code: 'CZ0427', name: 'Ústí nad Labem', krajCode: 'CZ042' },
  // Liberecký kraj
  { code: 'CZ0511', name: 'Česká Lípa', krajCode: 'CZ051' },
  { code: 'CZ0512', name: 'Jablonec nad Nisou', krajCode: 'CZ051' },
  { code: 'CZ0513', name: 'Liberec', krajCode: 'CZ051' },
  { code: 'CZ0514', name: 'Semily', krajCode: 'CZ051' },
  // Královéhradecký kraj
  { code: 'CZ0521', name: 'Hradec Králové', krajCode: 'CZ052' },
  { code: 'CZ0522', name: 'Jičín', krajCode: 'CZ052' },
  { code: 'CZ0523', name: 'Náchod', krajCode: 'CZ052' },
  { code: 'CZ0524', name: 'Rychnov nad Kněžnou', krajCode: 'CZ052' },
  { code: 'CZ0525', name: 'Trutnov', krajCode: 'CZ052' },
  // Pardubický kraj
  { code: 'CZ0531', name: 'Chrudim', krajCode: 'CZ053' },
  { code: 'CZ0532', name: 'Pardubice', krajCode: 'CZ053' },
  { code: 'CZ0533', name: 'Svitavy', krajCode: 'CZ053' },
  { code: 'CZ0534', name: 'Ústí nad Orlicí', krajCode: 'CZ053' },
  // Kraj Vysočina
  { code: 'CZ0631', name: 'Havlíčkův Brod', krajCode: 'CZ063' },
  { code: 'CZ0632', name: 'Jihlava', krajCode: 'CZ063' },
  { code: 'CZ0633', name: 'Pelhřimov', krajCode: 'CZ063' },
  { code: 'CZ0634', name: 'Třebíč', krajCode: 'CZ063' },
  { code: 'CZ0635', name: 'Žďár nad Sázavou', krajCode: 'CZ063' },
  // Jihomoravský kraj
  { code: 'CZ0641', name: 'Blansko', krajCode: 'CZ064' },
  { code: 'CZ0642', name: 'Brno-město', krajCode: 'CZ064' },
  { code: 'CZ0643', name: 'Brno-venkov', krajCode: 'CZ064' },
  { code: 'CZ0644', name: 'Břeclav', krajCode: 'CZ064' },
  { code: 'CZ0645', name: 'Hodonín', krajCode: 'CZ064' },
  { code: 'CZ0646', name: 'Vyškov', krajCode: 'CZ064' },
  { code: 'CZ0647', name: 'Znojmo', krajCode: 'CZ064' },
  // Olomoucký kraj
  { code: 'CZ0711', name: 'Jeseník', krajCode: 'CZ071' },
  { code: 'CZ0712', name: 'Olomouc', krajCode: 'CZ071' },
  { code: 'CZ0713', name: 'Prostějov', krajCode: 'CZ071' },
  { code: 'CZ0714', name: 'Přerov', krajCode: 'CZ071' },
  { code: 'CZ0715', name: 'Šumperk', krajCode: 'CZ071' },
  // Zlínský kraj
  { code: 'CZ0721', name: 'Kroměříž', krajCode: 'CZ072' },
  { code: 'CZ0722', name: 'Uherské Hradiště', krajCode: 'CZ072' },
  { code: 'CZ0723', name: 'Vsetín', krajCode: 'CZ072' },
  { code: 'CZ0724', name: 'Zlín', krajCode: 'CZ072' },
  // Moravskoslezský kraj
  { code: 'CZ0801', name: 'Bruntál', krajCode: 'CZ080' },
  { code: 'CZ0802', name: 'Frýdek-Místek', krajCode: 'CZ080' },
  { code: 'CZ0803', name: 'Karviná', krajCode: 'CZ080' },
  { code: 'CZ0804', name: 'Nový Jičín', krajCode: 'CZ080' },
  { code: 'CZ0805', name: 'Opava', krajCode: 'CZ080' },
  { code: 'CZ0806', name: 'Ostrava-město', krajCode: 'CZ080' },
]

// ── Service ────────────────────────────────────────────

@Injectable()
export class TerritorySeedService {
  private readonly logger = new Logger(TerritorySeedService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Seed static hierarchy: CZ → 14 krajů → 77 okresů.
   * Then fetch Praha MOMC + KÚ from RÚIAN.
   */
  async seed(): Promise<{ state: number; regions: number; districts: number; cityParts: number; cadastral: number }> {
    const stats = { state: 0, regions: 0, districts: 0, cityParts: 0, cadastral: 0 }

    // 1. State
    const cz = await this.upsert({
      code: 'CZ', name: 'Česká republika', level: 'STATE',
      parentId: null, lat: 49.82, lng: 15.47,
    })
    stats.state = 1

    // 2. Kraje
    const krajMap = new Map<string, string>() // code → id
    for (const k of KRAJE) {
      const t = await this.upsert({
        code: k.code, name: k.name, level: 'REGION',
        parentId: cz.id, lat: k.lat, lng: k.lng,
      })
      krajMap.set(k.code, t.id)
      stats.regions++
    }

    // 3. Okresy
    const okresMap = new Map<string, string>() // code → id
    for (const o of OKRESY) {
      const parentId = krajMap.get(o.krajCode)
      if (!parentId) continue
      const t = await this.upsert({
        code: o.code, name: o.name, level: 'DISTRICT', parentId,
      })
      okresMap.set(o.code, t.id)
      stats.districts++
    }

    // 4. Praha — seed obec + MOMC + KÚ from RÚIAN
    const prahaOkresId = okresMap.get('CZ0100')
    if (prahaOkresId) {
      // Praha as municipality under okres "Hlavní město Praha"
      const praha = await this.upsert({
        code: 'OBEC-554782', name: 'Praha', level: 'MUNICIPALITY',
        parentId: prahaOkresId, lat: 50.08, lng: 14.42,
        isCity: true, hasDistricts: true, population: 1357326,
      })

      // Fetch MOMC (městské části) from RÚIAN layer 8
      try {
        const mcResults = await this.fetchRuianLayer(8, 'obec=554782', 'kod,nazev')
        for (const f of mcResults) {
          const code = String(f.attributes.kod)
          await this.upsert({
            code: `MC-${code}`, name: f.attributes.nazev, level: 'CITY_PART',
            parentId: praha.id,
          })
          stats.cityParts++
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch Praha MOMC from RÚIAN: ${err}`)
      }

      // Fetch KÚ from RÚIAN layer 7
      try {
        const kuResults = await this.fetchRuianLayer(7, 'obec=554782', 'kod,nazev')
        for (const f of kuResults) {
          const code = String(f.attributes.kod)
          await this.upsert({
            code: `KU-${code}`, name: f.attributes.nazev, level: 'CADASTRAL',
            parentId: praha.id,
          })
          stats.cadastral++
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch Praha KÚ from RÚIAN: ${err}`)
      }

      // Count RÚIAN buildings per Praha MČ
      await this.countRuianBuildingsForChildren(praha.id)
    }

    this.logger.log(`Territory seed complete: ${stats.regions} krajů, ${stats.districts} okresů, ${stats.cityParts} MČ, ${stats.cadastral} KÚ`)
    return stats
  }

  /**
   * Count total buildings from RÚIAN for each child territory and store in totalBuildings.
   * Uses RÚIAN AdresniMisto layer (1) with district LIKE pattern.
   */
  async countRuianBuildingsForChildren(parentId: string): Promise<void> {
    const children = await this.prisma.territory.findMany({
      where: { parentId, level: { in: ['CITY_PART', 'MUNICIPALITY'] } },
      select: { id: true, name: true, level: true },
    })

    const RUIAN_ADDR_LAYER = `${RUIAN_BASE}/1/query`
    const PRAHA_BBOX = '-755000,-1055000,-725000,-1035000'

    for (const child of children) {
      try {
        // "Praha 1" end-of-string safe pattern
        const district = child.name
        const where = `(adresa LIKE '%${district} %' OR adresa LIKE '%${district},%' OR adresa LIKE '%${district}')`
        const params = new URLSearchParams({
          where,
          geometry: PRAHA_BBOX,
          geometryType: 'esriGeometryEnvelope',
          inSR: '5514',
          returnCountOnly: 'true',
          f: 'json',
        })
        const res = await fetch(`${RUIAN_ADDR_LAYER}?${params}`, { signal: AbortSignal.timeout(15000) })
        if (!res.ok) continue
        const data = await res.json()
        const count = data.count || 0
        await this.prisma.territory.update({
          where: { id: child.id },
          data: { totalBuildings: count },
        })
        await new Promise(r => setTimeout(r, 300)) // rate limit
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Failed to count RÚIAN buildings for ${child.name}: ${msg}`)
      }
    }
  }

  /**
   * Seed obce (municipalities) for a given okres from RÚIAN layer 12.
   * Called lazily when a region is first imported.
   */
  async seedObceForOkres(okresCode: string): Promise<number> {
    const okres = await this.prisma.territory.findUnique({ where: { code: okresCode } })
    if (!okres) return 0

    // Step 1: Find the RÚIAN numeric okres code by sampling an obec with matching nutslau
    // nutslau format: CZ0201XXXXXX where CZ0201 = okresCode
    let ruianOkresCode: number | null = null
    try {
      const sample = await this.fetchRuianLayer(12, `nutslau LIKE '${okresCode}%'`, 'kod,okres', 1)
      if (sample.length > 0 && sample[0].attributes.okres) {
        ruianOkresCode = sample[0].attributes.okres
      }
    } catch {
      this.logger.warn(`Could not resolve RÚIAN okres code for ${okresCode}`)
    }

    if (!ruianOkresCode) {
      this.logger.warn(`No RÚIAN okres code found for ${okresCode}, falling back to nutslau prefix`)
    }

    // Step 2: Fetch obce — filter by RÚIAN numeric okres code (precise) or nutslau prefix (fallback)
    let allObce: Array<{ attributes: Record<string, any> }>
    try {
      const where = ruianOkresCode ? `okres=${ruianOkresCode}` : '1=1'
      allObce = await this.fetchRuianLayer(12, where, 'kod,nazev,okres,nutslau', 10000)
    } catch (err) {
      this.logger.warn(`Failed to fetch obce for okres ${okresCode}: ${err}`)
      return 0
    }

    let created = 0
    for (const f of allObce) {
      // If we used fallback 1=1 query, filter by nutslau prefix
      if (!ruianOkresCode) {
        const nutslau: string = f.attributes.nutslau || ''
        if (!nutslau.startsWith(okresCode)) continue
      }

      const code = `OBEC-${f.attributes.kod}`
      const existing = await this.prisma.territory.findUnique({ where: { code } })
      if (existing) continue

      await this.upsert({
        code,
        name: f.attributes.nazev,
        level: 'MUNICIPALITY',
        parentId: okres.id,
      })
      created++
    }

    this.logger.log(`Seeded ${created} obcí for okres ${okresCode}`)
    return created
  }

  // ── Helpers ──────────────────────────────────────────

  private async upsert(data: {
    code: string
    name: string
    level: string
    parentId: string | null
    lat?: number
    lng?: number
    isCity?: boolean
    hasDistricts?: boolean
    population?: number
  }) {
    return this.prisma.territory.upsert({
      where: { code: data.code },
      create: {
        code: data.code,
        name: data.name,
        nameNormalized: removeDiacritics(data.name),
        level: data.level as any,
        parentId: data.parentId,
        lat: data.lat,
        lng: data.lng,
        isCity: data.isCity ?? false,
        hasDistricts: data.hasDistricts ?? false,
        population: data.population,
      },
      update: {
        name: data.name,
        nameNormalized: removeDiacritics(data.name),
        parentId: data.parentId,
        ...(data.lat !== undefined && { lat: data.lat }),
        ...(data.lng !== undefined && { lng: data.lng }),
        ...(data.isCity !== undefined && { isCity: data.isCity }),
        ...(data.hasDistricts !== undefined && { hasDistricts: data.hasDistricts }),
        ...(data.population !== undefined && { population: data.population }),
      },
    })
  }

  private async fetchRuianLayer(
    layerId: number,
    where: string,
    outFields: string,
    maxRecords = 1000,
  ): Promise<Array<{ attributes: Record<string, any> }>> {
    const allFeatures: Array<{ attributes: Record<string, any> }> = []
    let offset = 0
    const batchSize = 500

    while (offset < maxRecords) {
      try {
        const params = new URLSearchParams({
          where,
          outFields,
          resultRecordCount: String(batchSize),
          resultOffset: String(offset),
          returnGeometry: 'false',
          f: 'json',
        })
        const url = `${RUIAN_BASE}/${layerId}/query?${params}`
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
        if (!res.ok) break

        const data = await res.json()
        const features = data.features || []
        if (features.length === 0) break

        allFeatures.push(...features)
        offset += batchSize

        // Rate limit
        await new Promise(r => setTimeout(r, 200))
      } catch (err) {
        this.logger.warn(`RÚIAN layer ${layerId} fetch failed at offset ${offset}: ${err}`)
        break
      }
    }

    return allFeatures
  }
}

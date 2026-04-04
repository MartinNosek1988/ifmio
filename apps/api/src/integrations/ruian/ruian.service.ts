import { Injectable, Logger } from '@nestjs/common'

export interface RuianAddress {
  label: string
  street: string
  city: string
  postalCode: string
  district?: string
  addressType?: string
  score?: number
  lat?: number
  lng?: number
  ruianCode?: string
}

const RUIAN_BASE = 'https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/findAddressCandidates'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

@Injectable()
export class RuianService {
  private readonly logger = new Logger(RuianService.name)
  private cache = new Map<string, { data: RuianAddress[]; ts: number }>()

  async searchAddress(query: string): Promise<RuianAddress[]> {
    const key = query.toLowerCase().trim()
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data
    if (!query || query.length < 3) return []

    try {
      const params = new URLSearchParams({
        SingleLine: query,
        outFields: '*',
        f: 'json',
        maxLocations: '8',
      })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`${RUIAN_BASE}?${params}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeout)

      if (!res.ok) {
        this.logger.warn(`RÚIAN API responded with ${res.status}`)
        return []
      }

      const data = await res.json()
      const candidates = data.candidates ?? []

      const results = candidates.map((c: any): RuianAddress => {
        const addr = c.attributes ?? {}
        const fullAddr = c.address ?? addr.Match_addr ?? ''

        // Parse Match_addr: "Sokolská 455/3, Nové Město, 12000 Praha 2"
        const parts = fullAddr.split(',').map((p: string) => p.trim())
        const street = parts[0] ?? ''
        let city = ''
        let psc = ''
        let district = ''

        // Last part often has "12000 Praha 2" — extract PSČ + city
        const lastPart = parts[parts.length - 1] ?? ''
        const pscMatch = lastPart.match(/(\d{5})\s+(.+)/)
        if (pscMatch) {
          psc = pscMatch[1]
          city = pscMatch[2]
        } else {
          city = lastPart
        }

        // Middle parts = district (Nové Město, Vinohrady, etc.)
        if (parts.length >= 3) {
          district = parts.slice(1, -1).join(', ')
        }

        const lat = c.location?.y ?? undefined
        const lng = c.location?.x ?? undefined
        const ruianCode = addr.Loc_name || undefined
        const addressType = addr.Type || undefined
        const score = addr.Score ?? c.score ?? undefined

        return { label: fullAddr, street, city, postalCode: psc, district: district || undefined, addressType, score, lat, lng, ruianCode }
      }).filter((a: RuianAddress) => a.label)

      if (this.cache.size > 500) this.cache.delete(this.cache.keys().next().value!)
      this.cache.set(key, { data: results, ts: Date.now() })
      return results
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.logger.warn('RÚIAN request timed out')
      } else {
        this.logger.error(`RÚIAN lookup failed: ${err}`)
      }
      return []
    }
  }
}

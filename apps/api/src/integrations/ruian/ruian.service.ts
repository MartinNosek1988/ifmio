import { Injectable, Logger } from '@nestjs/common'

export interface RuianAddress {
  label: string
  street: string
  city: string
  postalCode: string
  lat?: number
  lng?: number
  ruianCode?: string
}

const RUIAN_BASE = 'https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_RUIAN_v2/MapServer/exts/GeocodeSOE/findAddressCandidates'

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
        const addr = c.attributes ?? c.address ?? {}
        const label = c.address ?? addr.Match_addr ?? ''
        const psc = String(addr.Postal ?? addr.ZIP ?? '').replace(/\s/g, '')
        const city = addr.City ?? addr.Subregion ?? ''
        const street = addr.StAddr ?? addr.Match_addr?.split(',')[0] ?? label.split(',')[0] ?? ''
        const lat = c.location?.y ?? undefined
        const lng = c.location?.x ?? undefined
        const ruianCode = addr.Loc_name ?? addr.User_fld ?? undefined

        return { label, street: street.trim(), city: city.trim(), postalCode: psc, lat, lng, ruianCode }
      }).filter((a: RuianAddress) => a.label)

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

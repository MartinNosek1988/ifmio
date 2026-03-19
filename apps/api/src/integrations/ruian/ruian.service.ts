import { Injectable, Logger } from '@nestjs/common'

export interface RuianAddress {
  label: string
  street: string
  city: string
  postalCode: string
}

const RUIAN_BASE = 'https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_RUIAN_v2/MapServer/exts/GeocodeSOE/findAddressCandidates'

@Injectable()
export class RuianService {
  private readonly logger = new Logger(RuianService.name)

  async searchAddress(query: string): Promise<RuianAddress[]> {
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

      return candidates.map((c: any): RuianAddress => {
        const addr = c.attributes ?? c.address ?? {}
        const label = c.address ?? addr.Match_addr ?? ''
        // Parse postal code from various fields
        const psc = String(addr.Postal ?? addr.ZIP ?? '').replace(/\s/g, '')
        // Parse city
        const city = addr.City ?? addr.Subregion ?? ''
        // Parse street
        const street = addr.StAddr ?? addr.Match_addr?.split(',')[0] ?? label.split(',')[0] ?? ''

        return { label, street: street.trim(), city: city.trim(), postalCode: psc }
      }).filter((a: RuianAddress) => a.label)
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

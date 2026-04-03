import { Injectable, Logger } from '@nestjs/common'

export interface NearbyPOI {
  schools: number
  kindergartens: number
  doctors: number
  pharmacies: number
  supermarkets: number
  busStops: number
  tramStops: number
  metroStations: number
  playgrounds: number
  restaurants: number
  details: Array<{ type: string; name: string; distance: number }>
}

export interface FloodRisk {
  inFloodZone: boolean
  level: 'none' | 'low' | 'medium' | 'high'
  source: string
}

export interface NoiseLevel {
  dayDb?: number
  nightDb?: number
  level: 'low' | 'medium' | 'high' | 'unknown'
  source?: string
}

export interface RadonRisk {
  index: 'low' | 'medium' | 'high' | 'unknown'
  source: string
}

export interface InsolvencyCheck {
  hasInsolvency: boolean
  details?: string
  source: string
}

export interface GeoRiskProfile {
  flood: FloodRisk
  noise: NoiseLevel
  radon: RadonRisk
  insolvency?: InsolvencyCheck
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

@Injectable()
export class GeoRiskService {
  private readonly logger = new Logger(GeoRiskService.name)

  async getNearbyPOI(lat: number, lng: number, radiusMeters = 500): Promise<NearbyPOI> {
    const result: NearbyPOI = {
      schools: 0, kindergartens: 0, doctors: 0, pharmacies: 0,
      supermarkets: 0, busStops: 0, tramStops: 0, metroStations: 0,
      playgrounds: 0, restaurants: 0, details: [],
    }

    try {
      const query = `[out:json][timeout:10];(
        node["amenity"="school"](around:${radiusMeters},${lat},${lng});
        node["amenity"="kindergarten"](around:${radiusMeters},${lat},${lng});
        node["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
        node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
        node["shop"="supermarket"](around:${radiusMeters},${lat},${lng});
        node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
        node["railway"="tram_stop"](around:${radiusMeters},${lat},${lng});
        node["station"="subway"](around:${radiusMeters},${lat},${lng});
        node["leisure"="playground"](around:${radiusMeters},${lat},${lng});
        node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
      );out body 50;`

      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(12000),
      })

      if (!res.ok) return result
      const data = await res.json()

      for (const el of data.elements ?? []) {
        const tags = el.tags ?? {}
        const name = tags.name || tags.amenity || tags.shop || tags.highway || ''
        const dist = Math.round(this.haversine(lat, lng, el.lat, el.lon))

        if (tags.amenity === 'school') { result.schools++; result.details.push({ type: '🏫 Škola', name, distance: dist }) }
        else if (tags.amenity === 'kindergarten') { result.kindergartens++; result.details.push({ type: '🧒 Školka', name, distance: dist }) }
        else if (tags.amenity === 'doctors') { result.doctors++; result.details.push({ type: '🏥 Lékař', name, distance: dist }) }
        else if (tags.amenity === 'pharmacy') { result.pharmacies++; result.details.push({ type: '💊 Lékárna', name, distance: dist }) }
        else if (tags.shop === 'supermarket') { result.supermarkets++; result.details.push({ type: '🛒 Supermarket', name, distance: dist }) }
        else if (tags.highway === 'bus_stop') { result.busStops++ }
        else if (tags.railway === 'tram_stop') { result.tramStops++ }
        else if (tags.station === 'subway') { result.metroStations++ }
        else if (tags.leisure === 'playground') { result.playgrounds++ }
        else if (tags.amenity === 'restaurant') { result.restaurants++ }
      }

      // Sort details by distance
      result.details.sort((a, b) => a.distance - b.distance)
      result.details = result.details.slice(0, 15)
    } catch (err) {
      this.logger.debug(`Overpass POI query failed: ${err}`)
    }

    return result
  }

  async getRiskProfile(lat: number, lng: number, ico?: string): Promise<GeoRiskProfile> {
    const [flood, radon] = await Promise.all([
      this.checkFloodZone(lat, lng),
      this.checkRadon(lat, lng),
    ])

    const insolvency = ico ? await this.checkInsolvency(ico) : undefined

    return {
      flood,
      noise: { level: 'unknown', source: 'N/A — hluková mapa nedostupná' },
      radon,
      insolvency,
    }
  }

  private async checkFloodZone(lat: number, lng: number): Promise<FloodRisk> {
    // VÚV TGM + IPR Praha flood APIs are unstable
    // TODO: napojit po ověření stabilního endpointu
    try {
      const res = await fetch(
        `https://gis.vuv.cz/arcgis/rest/services/zaplavova_uzemi/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=*&f=json&inSR=4326`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (res.ok) {
        const data = await res.json()
        if (data.features?.length > 0) {
          return { inFloodZone: true, level: 'medium', source: 'VUV_TGM' }
        }
        return { inFloodZone: false, level: 'none', source: 'VUV_TGM' }
      }
    } catch { /* timeout or error */ }
    return { inFloodZone: false, level: 'none', source: 'N/A — API nedostupné' }
  }

  private async checkRadon(lat: number, lng: number): Promise<RadonRisk> {
    // CGS radon API — endpoint changes frequently
    // TODO: ověřit aktuální URL na mapy.geology.cz
    try {
      const res = await fetch(
        `https://mapy.geology.cz/arcgis/rest/services/Radon/radon_50/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=*&f=json&inSR=4326`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (res.ok) {
        const data = await res.json()
        if (data.features?.length > 0) {
          const val = data.features[0].attributes?.RADON ?? data.features[0].attributes?.radon
          if (val === 1 || val === 'nizky') return { index: 'low', source: 'CGS' }
          if (val === 2 || val === 'stredni') return { index: 'medium', source: 'CGS' }
          if (val === 3 || val === 'vysoky') return { index: 'high', source: 'CGS' }
        }
      }
    } catch { /* timeout */ }
    return { index: 'unknown', source: 'N/A — API nedostupné' }
  }

  async checkInsolvency(ico: string): Promise<InsolvencyCheck> {
    // ISIR doesn't have a stable REST API
    // TODO: napojit iSpis.cz proxy nebo parsovat ISIR HTML
    try {
      const res = await fetch(
        `https://isir.justice.cz/isir/common/stat.do?ico=${ico}`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (res.ok) {
        const html = await res.text()
        const hasInsolvency = html.toLowerCase().includes('insolvenc') && !html.toLowerCase().includes('nebyl nalezen')
        return { hasInsolvency, source: 'ISIR', details: hasInsolvency ? 'Nalezen záznam v ISIR' : undefined }
      }
    } catch { /* timeout */ }
    return { hasInsolvency: false, source: 'N/A — ISIR nedostupný' }
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}

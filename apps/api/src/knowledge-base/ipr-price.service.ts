import { Injectable, Logger } from '@nestjs/common'
import proj4 from 'proj4'

// S-JTSK definition
proj4.defs(
  'EPSG:5514',
  '+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=589,76,480 +units=m +no_defs',
)

export interface PriceEstimate {
  landPricePerSqm?: number
  estimatedPricePerSqm?: number
  confidence: 'low' | 'medium'
  source?: string
  disclaimer: string
}

const IPR_BASE = 'https://gis.iprpraha.cz/arcgis/rest/services/app/cenova_mapa/MapServer/0/query'

const PRICE_COEF = {
  age: [
    { max: 5, coef: 1.2 },
    { max: 15, coef: 1.1 },
    { max: 30, coef: 1.0 },
    { max: 50, coef: 0.85 },
    { max: 999, coef: 0.7 },
  ],
  condition: { insulated: 1.1, renovated: 1.15, panel: 0.85, original: 0.9, unknown: 1.0 } as Record<string, number>,
}

@Injectable()
export class IprPriceService {
  private readonly logger = new Logger(IprPriceService.name)

  wgs84ToSjtsk(lat: number, lng: number): { x: number; y: number } {
    const [x, y] = proj4('EPSG:4326', 'EPSG:5514', [lng, lat])
    return { x, y }
  }

  async getLandPrice(lat: number, lng: number): Promise<number | null> {
    try {
      const { x, y } = this.wgs84ToSjtsk(lat, lng)
      const params = new URLSearchParams({
        geometry: `${x},${y}`,
        geometryType: 'esriGeometryPoint',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        f: 'json',
        inSR: '5514',
      })

      const res = await fetch(`${IPR_BASE}?${params}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) {
        this.logger.debug(`IPR Praha responded ${res.status}`)
        return null
      }

      const data = await res.json()
      const features = data.features ?? []
      if (features.length === 0) return null

      // Extract price — field name varies, common: CENA, CENA_ZA_M2, cena_m2
      const attrs = features[0].attributes ?? {}
      const price =
        attrs.CENA ?? attrs.CENA_ZA_M2 ?? attrs.cena_m2 ?? attrs.cena ?? attrs.PRICE ?? null

      return typeof price === 'number' ? price : null
    } catch (err) {
      this.logger.debug(`IPR Praha query failed: ${err}`)
      return null
    }
  }

  estimatePrice(
    landPricePerSqm: number,
    constructionYear?: number,
    materialType?: string,
  ): PriceEstimate {
    const age = constructionYear ? new Date().getFullYear() - constructionYear : undefined
    const ageCoef = age != null
      ? (PRICE_COEF.age.find((a) => age <= a.max)?.coef ?? 1.0)
      : 1.0
    const condKey = materialType?.toLowerCase().includes('panel') ? 'panel'
      : materialType?.toLowerCase().includes('cihla') ? 'original' : 'unknown'
    const condCoef = PRICE_COEF.condition[condKey] ?? 1.0

    const estimated = Math.round(landPricePerSqm * ageCoef * condCoef)
    const confidence = age != null ? 'medium' as const : 'low' as const

    return {
      landPricePerSqm,
      estimatedPricePerSqm: estimated,
      confidence,
      source: 'IPR_PRAHA',
      disclaimer: 'Orientační odhad na základě cenové mapy pozemků. Nepředstavuje tržní ocenění.',
    }
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface AddressSuggestion {
  id: number
  fullAddress: string
  street?: string
  city: string
  district?: string
  postalCode?: string
  houseNumber?: number
  orientationNumber?: number
  orientationNumberLetter?: string
  lat?: number
  lng?: number
  ruianCode: number
}

export interface BuildingEnrichmentData {
  stavebniObjektId: number
  buildingType?: string
  numberOfFloors?: number
  numberOfUnits?: number
  builtUpArea?: number
  lat?: number
  lng?: number
  cadastralTerritoryCode?: number
}

@Injectable()
export class RuianLocalLookupService {
  private readonly logger = new Logger(RuianLocalLookupService.name)

  constructor(private prisma: PrismaService) {}

  /** Check if local RÚIAN data is available (tables have data) */
  async isAvailable(): Promise<boolean> {
    const count = await this.prisma.kbRuianAdresniMisto.count({ take: 1 })
    return count > 0
  }

  /** Fulltext address search — for AddressAutocomplete */
  async searchAddress(query: string, limit = 10): Promise<AddressSuggestion[]> {
    if (!query || query.length < 2) return []

    const words = query.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return []

    // Build WHERE conditions using ILIKE for each word
    // Match against city name, street name, house number, postal code
    const results = await this.prisma.$queryRawUnsafe<Array<{
      id: number
      houseNumber: number | null
      orientationNumber: number | null
      orientationNumberLetter: string | null
      postalCode: string | null
      obecId: number | null
      uliceId: number | null
      castObceNazev: string | null
      lat: number | null
      lng: number | null
      obecName: string | null
      uliceName: string | null
    }>>(
      `SELECT
        am.id,
        am."houseNumber",
        am."orientationNumber",
        am."orientationNumberLetter",
        am."postalCode",
        am."obecId",
        am."uliceId",
        am."castObceNazev",
        am.lat,
        am.lng,
        o.name AS "obecName",
        u.name AS "uliceName"
      FROM kb_ruian_adresni_misto am
      LEFT JOIN kb_ruian_obec o ON o.id = am."obecId"
      LEFT JOIN kb_ruian_ulice u ON u.id = am."uliceId"
      WHERE ${words.map((_, i) => `(
        COALESCE(o.name, '') ILIKE $${i + 1}
        OR COALESCE(u.name, '') ILIKE $${i + 1}
        OR COALESCE(am."castObceNazev", '') ILIKE $${i + 1}
        OR COALESCE(am."postalCode", '') ILIKE $${i + 1}
        OR CAST(am."houseNumber" AS TEXT) = $${i + 2 + words.length}
      )`).join(' AND ')}
      ORDER BY o.name, u.name, am."houseNumber"
      LIMIT $${words.length * 2 + 1}`,
      ...words.map(w => `%${w}%`),
      ...words.map(w => w.replace(/\D/g, '') || '0'),
      limit,
    )

    return results.map(r => ({
      id: r.id,
      fullAddress: this.formatAddress(r.uliceName, r.houseNumber, r.orientationNumber, r.orientationNumberLetter, r.castObceNazev, r.obecName, r.postalCode),
      street: r.uliceName ?? undefined,
      city: r.obecName ?? '',
      district: r.castObceNazev ?? undefined,
      postalCode: r.postalCode ?? undefined,
      houseNumber: r.houseNumber ?? undefined,
      orientationNumber: r.orientationNumber ?? undefined,
      orientationNumberLetter: r.orientationNumberLetter ?? undefined,
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
      ruianCode: r.id,
    }))
  }

  /** Geocoding — address text → GPS coordinates */
  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    const results = await this.searchAddress(address, 1)
    if (results.length > 0 && results[0].lat && results[0].lng) {
      return { lat: results[0].lat, lng: results[0].lng }
    }
    return null
  }

  /** Reverse geocoding — GPS → nearest address within radius */
  async reverseGeocode(lat: number, lng: number, radiusMeters = 50): Promise<AddressSuggestion | null> {
    // Approximate degrees for radius (1 degree ≈ 111km)
    const degreeRadius = radiusMeters / 111000

    const results = await this.prisma.$queryRawUnsafe<Array<{
      id: number
      houseNumber: number | null
      orientationNumber: number | null
      orientationNumberLetter: string | null
      postalCode: string | null
      obecId: number | null
      uliceId: number | null
      castObceNazev: string | null
      lat: number | null
      lng: number | null
      obecName: string | null
      uliceName: string | null
      dist: number
    }>>(
      `SELECT
        am.id,
        am."houseNumber",
        am."orientationNumber",
        am."orientationNumberLetter",
        am."postalCode",
        am."obecId",
        am."uliceId",
        am."castObceNazev",
        am.lat,
        am.lng,
        o.name AS "obecName",
        u.name AS "uliceName",
        SQRT(POWER(am.lat - $1, 2) + POWER(am.lng - $2, 2)) AS dist
      FROM kb_ruian_adresni_misto am
      LEFT JOIN kb_ruian_obec o ON o.id = am."obecId"
      LEFT JOIN kb_ruian_ulice u ON u.id = am."uliceId"
      WHERE am.lat BETWEEN $1 - $3 AND $1 + $3
        AND am.lng BETWEEN $2 - $3 AND $2 + $3
      ORDER BY dist
      LIMIT 1`,
      lat, lng, degreeRadius,
    )

    if (results.length === 0) return null

    const r = results[0]
    return {
      id: r.id,
      fullAddress: this.formatAddress(r.uliceName, r.houseNumber, r.orientationNumber, r.orientationNumberLetter, r.castObceNazev, r.obecName, r.postalCode),
      street: r.uliceName ?? undefined,
      city: r.obecName ?? '',
      district: r.castObceNazev ?? undefined,
      postalCode: r.postalCode ?? undefined,
      houseNumber: r.houseNumber ?? undefined,
      orientationNumber: r.orientationNumber ?? undefined,
      orientationNumberLetter: r.orientationNumberLetter ?? undefined,
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
      ruianCode: r.id,
    }
  }

  /** Lookup building by address for enrichment pipeline */
  async getStavebniObjekt(obecId: number, uliceId?: number, houseNumber?: number): Promise<BuildingEnrichmentData | null> {
    const where: Record<string, unknown> = { obecId }
    if (uliceId) where.uliceId = uliceId
    if (houseNumber) where.houseNumber = houseNumber

    const am = await this.prisma.kbRuianAdresniMisto.findFirst({
      where,
      select: { stavebniObjektId: true },
    })

    if (!am?.stavebniObjektId) return null

    const so = await this.prisma.kbRuianStavebniObjekt.findUnique({
      where: { id: am.stavebniObjektId },
    })

    if (!so) return null

    return {
      stavebniObjektId: so.id,
      buildingType: so.buildingType ?? undefined,
      numberOfFloors: so.numberOfFloors ?? undefined,
      numberOfUnits: so.numberOfUnits ?? undefined,
      builtUpArea: so.builtUpArea ?? undefined,
      lat: so.lat ?? undefined,
      lng: so.lng ?? undefined,
      cadastralTerritoryCode: so.cadastralTerritoryCode ?? undefined,
    }
  }

  /** Lookup address by RÚIAN address code */
  async getByRuianCode(ruianCode: number): Promise<AddressSuggestion | null> {
    const am = await this.prisma.kbRuianAdresniMisto.findUnique({
      where: { id: ruianCode },
      include: { obec: true, ulice: true },
    })

    if (!am) return null

    return {
      id: am.id,
      fullAddress: this.formatAddress(am.ulice?.name, am.houseNumber, am.orientationNumber, am.orientationNumberLetter, am.castObceNazev, am.obec?.name, am.postalCode),
      street: am.ulice?.name ?? undefined,
      city: am.obec?.name ?? '',
      district: am.castObceNazev ?? undefined,
      postalCode: am.postalCode ?? undefined,
      houseNumber: am.houseNumber ?? undefined,
      orientationNumber: am.orientationNumber ?? undefined,
      orientationNumberLetter: am.orientationNumberLetter ?? undefined,
      lat: am.lat ?? undefined,
      lng: am.lng ?? undefined,
      ruianCode: am.id,
    }
  }

  /** Format Czech address from components */
  private formatAddress(
    street: string | null | undefined,
    houseNumber: number | null | undefined,
    orientationNumber: number | null | undefined,
    orientationNumberLetter: string | null | undefined,
    district: string | null | undefined,
    city: string | null | undefined,
    postalCode: string | null | undefined,
  ): string {
    const parts: string[] = []

    // Street + čísla
    if (street) {
      let streetPart = street
      if (houseNumber) {
        const orient = orientationNumber
          ? `/${orientationNumber}${orientationNumberLetter ?? ''}`
          : ''
        streetPart += ` ${houseNumber}${orient}`
      }
      parts.push(streetPart)
    } else if (houseNumber) {
      const orient = orientationNumber
        ? `/${orientationNumber}${orientationNumberLetter ?? ''}`
        : ''
      parts.push(`č.p. ${houseNumber}${orient}`)
    }

    // District (městská část)
    if (district && district !== city) parts.push(district)

    // PSČ + město
    if (postalCode && city) parts.push(`${postalCode} ${city}`)
    else if (city) parts.push(city)

    return parts.join(', ')
  }
}

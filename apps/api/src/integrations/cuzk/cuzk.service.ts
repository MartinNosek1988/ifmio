import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface CuzkParcel {
  parcelniCislo: string;
  katastralniUzemi: string;
  vymera: number | null;
  druhPozemku: string;
  vlastnik: string;
  geometry: unknown | null;
}

const CUZK_ARCGIS_BASE =
  'https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer';

@Injectable()
export class CuzkService {
  private readonly logger = new Logger(CuzkService.name);

  async findParcel(
    parcelniCislo: string,
    katastralniUzemi: string,
  ): Promise<CuzkParcel | null> {
    // Input sanitization — prevent SQL/ArcGIS injection
    if (!/^[0-9/]+$/.test(parcelniCislo)) {
      throw new BadRequestException('Neplatné parcelní číslo — povoleny pouze číslice a /')
    }
    if (!/^[0-9]+$/.test(katastralniUzemi)) {
      throw new BadRequestException('Neplatný kód katastrálního území — povoleny pouze číslice')
    }

    try {
      // Layer 3 = parcely (parcels) in ČÚZK ArcGIS service
      const params = new URLSearchParams({
        where: `PARCELA = '${parcelniCislo}' AND KU = '${katastralniUzemi}'`,
        outFields: '*',
        f: 'json',
        returnGeometry: 'true',
      });

      const url = `${CUZK_ARCGIS_BASE}/3/query?${params}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        this.logger.warn(`ČÚZK ArcGIS responded with ${res.status}`);
        return null;
      }

      const data = await res.json();
      const features = data.features as Array<Record<string, unknown>> | undefined;

      if (!features || features.length === 0) return null;

      const attrs = features[0].attributes as Record<string, unknown>;
      const geometry = features[0].geometry ?? null;

      return {
        parcelniCislo: String(attrs.PARCELA ?? parcelniCislo),
        katastralniUzemi: String(attrs.KU ?? katastralniUzemi),
        vymera: attrs.VYMERA != null ? Number(attrs.VYMERA) : null,
        druhPozemku: String(attrs.DRUH_POZEMKU ?? ''),
        vlastnik: String(attrs.VLASTNIK ?? ''),
        geometry,
      };
    } catch (err) {
      this.logger.error(
        `ČÚZK parcel lookup failed for ${parcelniCislo}/${katastralniUzemi}`,
        (err as Error).stack,
      );
      return null;
    }
  }
}

import { apiClient } from '../../../core/api/client';

export interface AresSubject {
  ico: string;
  nazev: string;
  pravniForma: string;
  adresa: {
    ulice: string;
    cisloPopisne: string;
    obec: string;
    psc: string;
    kraj: string;
  };
  dic?: string;
  datumVzniku?: string;
}

export interface AresSearchResult {
  pocetCelkem: number;
  ekonomickeSubjekty: AresSubject[];
}

export interface CuzkParcel {
  parcelniCislo: string;
  katastralniUzemi: string;
  vymera: number | null;
  druhPozemku: string;
  vlastnik: string;
  geometry: unknown | null;
}

export const integrationsApi = {
  ares: {
    lookupByIco: async (ico: string): Promise<AresSubject | null> => {
      const { data } = await apiClient.get<AresSubject | null>(
        '/integrations/ares/ico',
        { params: { ico } },
      );
      return data;
    },

    search: async (q: string, limit = 10): Promise<AresSearchResult> => {
      const { data } = await apiClient.get<AresSearchResult>(
        '/integrations/ares/search',
        { params: { q, limit } },
      );
      return data;
    },
  },

  cuzk: {
    findParcel: async (
      parcela: string,
      ku: string,
    ): Promise<CuzkParcel | null> => {
      const { data } = await apiClient.get<CuzkParcel | null>(
        '/integrations/cuzk/parcel',
        { params: { parcela, ku } },
      );
      return data;
    },
  },
};

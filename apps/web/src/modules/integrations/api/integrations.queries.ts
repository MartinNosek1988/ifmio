import { useQuery } from '@tanstack/react-query';
import { integrationsApi } from './integrations.api';

export const integrationsKeys = {
  aresIco: (ico: string) => ['integrations', 'ares', 'ico', ico] as const,
  aresSearch: (q: string) => ['integrations', 'ares', 'search', q] as const,
  cuzkParcel: (parcela: string, ku: string) =>
    ['integrations', 'cuzk', 'parcel', parcela, ku] as const,
};

/**
 * Lookup a single ARES subject by IČO.
 * Enabled only when `ico` is exactly 8 digits.
 */
export function useAresLookup(ico: string) {
  return useQuery({
    queryKey: integrationsKeys.aresIco(ico),
    queryFn: () => integrationsApi.ares.lookupByIco(ico),
    enabled: /^\d{8}$/.test(ico),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Search ARES by company name.
 * Enabled when query is at least 3 characters.
 */
export function useAresSearch(q: string) {
  return useQuery({
    queryKey: integrationsKeys.aresSearch(q),
    queryFn: () => integrationsApi.ares.search(q),
    enabled: q.length >= 3,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Lookup ČÚZK parcel info.
 * Enabled when both parcela and ku are provided.
 */
export function useCuzkParcel(parcela: string, ku: string) {
  return useQuery({
    queryKey: integrationsKeys.cuzkParcel(parcela, ku),
    queryFn: () => integrationsApi.cuzk.findParcel(parcela, ku),
    enabled: parcela.length > 0 && ku.length > 0,
    staleTime: 30 * 60 * 1000, // 30 min
  });
}

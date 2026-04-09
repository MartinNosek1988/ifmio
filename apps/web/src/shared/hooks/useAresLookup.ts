import { useState, useCallback } from 'react';
import { integrationsApi } from '../../modules/integrations/api/integrations.api';

export interface AresLookupResult {
  nazev: string;
  dic?: string;
  datumZaniku?: string;
  adresa: {
    ulice?: string;
    cisloPopisne?: string;
    cisloOrientacni?: string;
    obec?: string;
    castObce?: string;
    psc?: string;
    kraj?: string;
  };
  textovaAdresa?: string;
}

export function useAresLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [defunct, setDefunct] = useState('');

  const lookup = useCallback(async (ico: string): Promise<AresLookupResult | null> => {
    const clean = (ico ?? '').replace(/\s/g, '');
    if (clean.length < 8 || !/^\d{8}$/.test(clean)) {
      setError('Zadejte platné IČ (8 číslic)');
      return null;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setDefunct('');
    try {
      const data = await integrationsApi.ares.lookupByIco(clean);
      if (data) {
        if (data.datumZaniku) setDefunct(data.datumZaniku);
        setSuccess('ARES: subjekt nalezen');
        return data as AresLookupResult;
      }
      setError('IČ nenalezeno v ARES');
      return null;
    } catch {
      setError('Chyba při ověřování v ARES');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError('');
    setSuccess('');
    setDefunct('');
  }, []);

  return { lookup, loading, error, success, defunct, reset };
}

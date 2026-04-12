import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { apiClient } from '../../../../core/api/client';

interface Props {
  ico: string;
  onResult: (data: { tenantName?: string; dic?: string; address?: string; city?: string; postalCode?: string }) => void;
}

export function AresLookup({ ico, onResult }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup() {
    if (!/^\d{8}$/.test(ico)) {
      setError(t('register.organization.icoNotFound'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/integrations/ares/ico?ico=${ico}`);
      const d = res.data;
      if (!d) {
        setError(t('register.organization.icoNotFound'));
        return;
      }
      onResult({
        tenantName: d.nazev,
        dic: d.dic,
        address: d.textovaAdresa || [d.adresa?.ulice, d.adresa?.cisloPopisne].filter(Boolean).join(' '),
        city: d.adresa?.obec,
        postalCode: d.adresa?.psc,
      });
    } catch {
      setError(t('register.organization.icoNotFound'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={lookup}
        disabled={loading || !ico}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          marginTop: 6,
          background: ico && !loading ? '#0F6E56' : '#D1D5DB',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: '.78rem',
          fontWeight: 600,
          cursor: ico && !loading ? 'pointer' : 'not-allowed',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Search size={12} />
        {loading ? t('register.organization.icoLoading') : t('register.organization.icoLookup')}
      </button>
      {error && <div style={{ color: '#DC2626', fontSize: '.75rem', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

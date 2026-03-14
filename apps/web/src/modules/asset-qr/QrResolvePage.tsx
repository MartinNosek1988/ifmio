import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assetQrApi } from './api/asset-qr.api';
import { fieldChecksApi } from '../field-checks/api/field-checks.api';

type State = 'loading' | 'redirecting' | 'error' | 'replaced' | 'invalid';

export default function QrResolvePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      setMessage('QR kód není platný');
      return;
    }

    assetQrApi.resolveToken(token).then(async (result) => {
      if (result.status === 'active' && result.assetId) {
        const isLoggedIn = !!sessionStorage.getItem('ifmio:access_token');
        if (!isLoggedIn) {
          // Redirect to login with returnUrl
          navigate(`/login?returnUrl=${encodeURIComponent(`/assets/${result.assetId}?scanToken=${token}`)}`, { replace: true });
        } else {
          // Log scan event (best-effort, don't block navigation)
          fieldChecksApi.logScanEvent(result.assetId, {
            outcome: 'resolved',
            source: 'qr_scan',
            appVersion: '1.0',
          }).catch(() => {/* ignore */});
          setState('redirecting');
          navigate(`/assets/${result.assetId}?scanToken=${token}`, { replace: true });
        }
      } else if (result.status === 'replaced') {
        setState('replaced');
        setMessage('Tento QR kód byl nahrazen novým');
      } else {
        setState('invalid');
        setMessage(result.message ?? 'QR kód není platný');
      }
    }).catch(() => {
      setState('error');
      setMessage('Zařízení nebylo nalezeno');
    });
  }, [token, navigate]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f1117',
    fontFamily: 'system-ui, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: '#1a1d27',
    border: '1px solid #2a2d3a',
    borderRadius: 12,
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: 380,
    width: '100%',
  };

  if (state === 'loading' || state === 'redirecting') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
          <h2 style={{ color: '#f3f4f6', margin: '0 0 8px' }}>Načítám zařízení…</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            {state === 'redirecting' ? 'Přesměrování…' : 'Ověřuji QR kód'}
          </p>
        </div>
      </div>
    );
  }

  const icon = state === 'replaced' ? '🔄' : '⚠️';
  const title = state === 'replaced'
    ? 'QR kód byl nahrazen'
    : state === 'invalid'
    ? 'Neplatný QR kód'
    : 'Chyba';

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{icon}</div>
        <h2 style={{ color: '#f3f4f6', margin: '0 0 8px' }}>{title}</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 24 }}>{message}</p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          Přihlásit se
        </button>
      </div>
    </div>
  );
}

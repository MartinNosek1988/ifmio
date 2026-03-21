import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../core/api/client';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    apiClient
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117',
    }}>
      <div style={{
        background: '#1a1d27', border: '1px solid #2a2d3a',
        borderRadius: 16, padding: 40, width: '100%', maxWidth: 420,
        textAlign: 'center',
      }}>
        <h1 style={{ color: '#6366f1', fontSize: '1.8rem', fontWeight: 700, marginBottom: 24 }}>ifmio</h1>

        {status === 'loading' && (
          <p style={{ color: '#9ca3af' }}>Overuji email...</p>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} style={{ color: '#22c55e', marginBottom: 16 }} />
            <h2 style={{ color: '#f3f4f6', fontSize: '1.1rem', marginBottom: 8 }}>Email overen!</h2>
            <p style={{ color: '#9ca3af', marginBottom: 24, fontSize: '.85rem' }}>
              Vas email byl uspesne overen. Nyni se muzete prihlasit.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 24px', background: '#6366f1', color: '#fff',
                borderRadius: 8, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Přihlásit se
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
            <h2 style={{ color: '#f3f4f6', fontSize: '1.1rem', marginBottom: 8 }}>Overeni selhalo</h2>
            <p style={{ color: '#9ca3af', marginBottom: 24, fontSize: '.85rem' }}>
              Odkaz je neplatny nebo vyprsely. Zkuste se zaregistrovat znovu.
            </p>
            <Link
              to="/register"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 24px', background: '#2a2d3a', color: '#d1d5db',
                borderRadius: 8, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Zpet na registraci
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

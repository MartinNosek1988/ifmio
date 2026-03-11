import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../core/api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;
      sessionStorage.setItem('ifmio:access_token', accessToken);
      sessionStorage.setItem('ifmio:refresh_token', refreshToken);
      sessionStorage.setItem('ifmio:user', JSON.stringify(user));
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Nesprávný email nebo heslo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
          <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '0.9rem' }}>Property & Facility Management</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Heslo</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#4338ca' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Přihlašování...' : 'Přihlásit se'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>
            Nemate ucet?{' '}
            <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Zaregistrujte se
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../core/api/client';
import { OAuthButtons } from '../../shared/components/OAuthButtons';
import i18n from '../../core/i18n';

const LANGS = ['cs', 'en', 'sk', 'de', 'uk'] as const;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [loginStep, setLoginStep] = useState<'credentials' | '2fa'>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.data.requires2fa) {
        setTempToken(res.data.tempToken);
        setLoginStep('2fa');
        return;
      }
      completeLogin(res.data);
    } catch {
      setError(t('auth.login.error'));
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/2fa/validate', { tempToken, code: totpCode });
      completeLogin(res.data);
    } catch {
      setError('Neplatný kód. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (data: any) => {
    const { accessToken, refreshToken, user, passwordExpired } = data;
    sessionStorage.setItem('ifmio:access_token', accessToken);
    sessionStorage.setItem('ifmio:refresh_token', refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(user));
    if (user.language && user.language !== i18n.language) {
      i18n.changeLanguage(user.language);
    }
    if (passwordExpired) {
      navigate('/profile?tab=security&expired=1', { replace: true });
    } else {
      navigate(returnUrl, { replace: true });
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
          <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '0.9rem' }}>{t('auth.login.subtitle')}</p>
        </div>

        {loginStep === 'credentials' && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.login.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.login.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <Link to="/forgot-password" style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
            {error && <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#4338ca' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>

            <OAuthButtons />
          </form>
        )}

        {loginStep === '2fa' && (
          <form onSubmit={handle2faSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔐</div>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                {useBackupCode ? 'Zadejte záložní kód' : 'Zadejte kód z autentizační aplikace'}
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={useBackupCode ? 8 : 6}
                placeholder={useBackupCode ? 'ABCD1234' : '123456'}
                autoFocus
                style={{ ...inputStyle, textAlign: 'center', fontSize: '1.4rem', letterSpacing: '4px', fontFamily: 'monospace' }}
              />
            </div>
            {error && <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}
            <button type="submit" disabled={loading || totpCode.length < (useBackupCode ? 6 : 6)} style={{ width: '100%', padding: '12px', background: loading ? '#4338ca' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Ověřuji...' : 'Ověřit'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" onClick={() => { setUseBackupCode(!useBackupCode); setTotpCode(''); }}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}>
                {useBackupCode ? 'Použít kód z aplikace' : 'Použít záložní kód'}
              </button>
            </div>
          </form>
        )}

        {/* Language switcher */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          {LANGS.map(lang => (
            <button key={lang} onClick={() => i18n.changeLanguage(lang)}
              style={{ background: 'none', border: 'none', color: i18n.language === lang ? '#6366f1' : '#6b7280', cursor: 'pointer', fontSize: '12px', padding: '0 6px', fontWeight: i18n.language === lang ? 600 : 400 }}>
              {t(`language.${lang}`)}
            </button>
          ))}
        </div>

        {loginStep === 'credentials' && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>{t('auth.login.register')}</Link>
            </span>
          </div>
        )}

        {/* Legal footer */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #2a2d3a' }}>
          <Link to="/terms" style={{ color: '#4b5563', fontSize: '11px', textDecoration: 'none', margin: '0 8px' }}>{t('legal.terms')}</Link>
          <Link to="/privacy" style={{ color: '#4b5563', fontSize: '11px', textDecoration: 'none', margin: '0 8px' }}>{t('legal.privacy')}</Link>
          <Link to="/gdpr" style={{ color: '#4b5563', fontSize: '11px', textDecoration: 'none', margin: '0 8px' }}>{t('legal.gdpr')}</Link>
          <div style={{ color: '#374151', fontSize: '11px', marginTop: '8px' }}>
            {t('legal.copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>
    </div>
  );
}

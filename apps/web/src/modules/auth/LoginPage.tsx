import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../core/auth/auth.store';
import { OAuthButtons } from '../../shared/components/OAuthButtons';
import { AuthLayout } from './AuthLayout';
import i18n from '../../core/i18n';

const LANGS = ['cs', 'en', 'sk', 'de', 'uk'] as const;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? '/dashboard';
  const [email, setEmail] = useState(() => localStorage.getItem('ifmio:remember_email') ?? '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(!!localStorage.getItem('ifmio:remember_email'));
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
      setError(t('auth.login.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (data: any) => {
    const { accessToken, refreshToken, user, passwordExpired } = data;
    sessionStorage.setItem('ifmio:access_token', accessToken);
    sessionStorage.setItem('ifmio:refresh_token', refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(user));
    if (remember) localStorage.setItem('ifmio:remember_email', email);
    else localStorage.removeItem('ifmio:remember_email');
    if (user.language && user.language !== i18n.language) i18n.changeLanguage(user.language);
    // Set Zustand store BEFORE navigation so AppShell sidebar has correct role
    useAuthStore.setState({ user, isLoggedIn: true, isLoading: false, passwordExpired: !!passwordExpired });
    if (passwordExpired) navigate('/profile?tab=security&expired=1', { replace: true });
    else if (data.onboardingCompleted === false) navigate('/onboarding/setup', { replace: true });
    else navigate(returnUrl, { replace: true });
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: `1.5px solid ${hasError ? '#EF4444' : '#E5E7EB'}`,
    background: '#fff', color: '#1A1A2E', fontSize: '.95rem',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.2s',
  });

  return (
    <AuthLayout
      headline={t('auth.layout.loginHeadline')}
      subtext={t('auth.layout.loginSubtext')}
      features={[
        { text: t('auth.layout.feature1') },
        { text: t('auth.layout.feature2') },
        { text: t('auth.layout.feature3') },
      ]}
    >
      {loginStep === 'credentials' && (
        <>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif" }}>
            {t('auth.login.welcomeBack')}
          </h2>
          <p style={{ color: '#6B7280', fontSize: '.95rem', margin: '0 0 28px' }}>{t('auth.login.signInToAccount')}</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t('auth.login.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                data-testid="login-email"
                placeholder="you@company.com"
                style={inputStyle(!!error)}
                onFocus={e => { e.currentTarget.style.borderColor = '#0D9488' }}
                onBlur={e => { e.currentTarget.style.borderColor = error ? '#EF4444' : '#E5E7EB' }}
              />
            </div>

            <div style={{ marginBottom: 8, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t('auth.login.password')}</label>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                data-testid="login-password"
                style={{ ...inputStyle(!!error), paddingRight: 44 }}
                onFocus={e => { e.currentTarget.style.borderColor = '#0D9488' }}
                onBlur={e => { e.currentTarget.style.borderColor = error ? '#EF4444' : '#E5E7EB' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: 34, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.82rem', color: '#6B7280', cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#0D9488' }} />
                {t('auth.login.rememberMe')}
              </label>
              <Link to="/forgot-password" style={{ fontSize: '.82rem', color: '#0D9488', textDecoration: 'none', fontWeight: 500 }}>
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            {error && <div data-testid="login-error" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: '.85rem', marginBottom: 16 }}>{error}</div>}

            <button type="submit" disabled={loading} data-testid="login-submit"
              style={{
                width: '100%', padding: '13px', background: loading ? '#0F766E' : '#0D9488',
                border: 'none', borderRadius: 10, color: '#fff', fontSize: '1rem', fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
              }}
            >
              {loading ? t('auth.login.submitting') : <>{t('auth.login.submit')} <ArrowRight size={16} /></>}
            </button>
          </form>

          <OAuthButtons dividerText={t('auth.login.orContinueWith')} />

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ color: '#6B7280', fontSize: '.85rem' }}>
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>{t('auth.login.register')}</Link>
            </span>
          </div>
        </>
      )}

      {loginStep === '2fa' && (
        <form onSubmit={handle2faSubmit}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔐</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px' }}>{t('auth.login.twoFactorTitle')}</h2>
            <p style={{ color: '#6B7280', fontSize: '.9rem' }}>
              {useBackupCode ? t('auth.login.enterBackupCode') : t('auth.login.enterCode')}
            </p>
          </div>
          <div style={{ marginBottom: 20 }}>
            <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)}
              maxLength={useBackupCode ? 8 : 6} placeholder={useBackupCode ? 'ABCD1234' : '123456'} autoFocus
              style={{ ...inputStyle(), textAlign: 'center', fontSize: '1.5rem', letterSpacing: 6, fontFamily: "'Space Mono', monospace" }} />
          </div>
          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: '.85rem', marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading || totpCode.length < 6}
            style={{ width: '100%', padding: '13px', background: '#0D9488', border: 'none', borderRadius: 10, color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? t('auth.login.verifying') : t('auth.login.verify')}
          </button>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" onClick={() => { setUseBackupCode(!useBackupCode); setTotpCode('') }}
              style={{ background: 'none', border: 'none', color: '#0D9488', cursor: 'pointer', fontSize: '.82rem', textDecoration: 'underline' }}>
              {useBackupCode ? t('auth.login.useAuthCode') : t('auth.login.useBackupCode')}
            </button>
          </div>
        </form>
      )}

      {/* Language switcher */}
      <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
        {LANGS.map(lang => (
          <button key={lang} onClick={() => i18n.changeLanguage(lang)}
            style={{ background: 'none', border: 'none', color: i18n.language === lang ? '#0D9488' : '#9CA3AF', cursor: 'pointer', fontSize: '11px', padding: '0 5px', fontWeight: i18n.language === lang ? 600 : 400 }}>
            {t(`language.${lang}`)}
          </button>
        ))}
      </div>

      {/* Legal */}
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Link to="/terms" style={{ color: '#9CA3AF', fontSize: '11px', textDecoration: 'none', margin: '0 6px' }}>{t('legal.terms')}</Link>
        <Link to="/privacy" style={{ color: '#9CA3AF', fontSize: '11px', textDecoration: 'none', margin: '0 6px' }}>{t('legal.privacy')}</Link>
      </div>
    </AuthLayout>
  );
}

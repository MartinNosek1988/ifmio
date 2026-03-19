import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../core/api/client';
import { ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { PasswordStrengthIndicator } from '../../shared/components/PasswordStrengthIndicator';
import { AuthLayout } from './AuthLayout';

type Step = 1 | 2 | 3 | 4;
const PLAN_KEYS = ['free', 'starter', 'pro'] as const;
const PLAN_ACCENTS: Record<string, string> = { free: '#22c55e', starter: '#3b82f6', pro: '#0D9488' };

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    tenantName: '', companyNumber: '', vatNumber: '', address: '',
    plan: 'free',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const canNext = () => {
    if (step === 1) return form.name.length >= 2 && form.email.includes('@') && form.password.length >= 8;
    if (step === 2) return form.tenantName.length >= 2;
    if (step === 3) return consentAccepted;
    return true;
  };

  const handleSubmit = async () => {
    if (!consentAccepted) { setError(t('auth.register.consentRequired')); return; }
    setError(''); setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', form);
      const { accessToken, refreshToken, user } = res.data;
      sessionStorage.setItem('ifmio:access_token', accessToken);
      sessionStorage.setItem('ifmio:refresh_token', refreshToken);
      sessionStorage.setItem('ifmio:user', JSON.stringify(user));
      setStep(4);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : t('auth.register.error'));
    } finally { setLoading(false); }
  };

  const stepLabels = [t('auth.register.step1'), t('auth.register.step2'), t('auth.register.step3'), t('auth.register.step4')];
  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#1A1A2E', fontSize: '.95rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 };

  return (
    <AuthLayout
      headline={t('auth.layout.registerHeadline')}
      subtext={t('auth.layout.registerSubtext')}
      features={[
        { text: t('auth.layout.regFeature1') },
        { text: t('auth.layout.regFeature2') },
        { text: t('auth.layout.regFeature3') },
      ]}
    >
      {/* Progress */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
        {stepLabels.map((label, i) => {
          const done = i < step - 1;
          const active = i === step - 1;
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 3, background: done || active ? '#0D9488' : '#E5E7EB', borderRadius: i === 0 ? '3px 0 0 3px' : i === 3 ? '0 3px 3px 0' : 0 }} />
              <span style={{ fontSize: 10, marginTop: 4, display: 'block', color: done || active ? '#0D9488' : '#9CA3AF', fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
          );
        })}
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: '.85rem', marginBottom: 16 }}>{error}</div>}

      {/* Step 1: Personal */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>{t('auth.register.step1')}</h2>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('auth.register.name')}</label>
            <input value={form.name} onChange={set('name')} style={inputStyle} placeholder="Jan Novák" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('auth.register.email')}</label>
            <input type="email" value={form.email} onChange={set('email')} style={inputStyle} placeholder="jan@firma.cz" />
          </div>
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={labelStyle}>{t('auth.register.password')}</label>
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} style={{ ...inputStyle, paddingRight: 44 }} placeholder={t('auth.register.passwordPlaceholder')} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: 34, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <PasswordStrengthIndicator password={form.password} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{t('auth.register.phone')}</label>
            <input value={form.phone} onChange={set('phone')} style={inputStyle} placeholder="+420 777 123 456" />
          </div>
        </div>
      )}

      {/* Step 2: Organization */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>{t('auth.register.step2')}</h2>
          <div style={{ marginBottom: 14 }}><label style={labelStyle}>{t('auth.register.orgName')}</label><input value={form.tenantName} onChange={set('tenantName')} style={inputStyle} /></div>
          <div style={{ marginBottom: 14 }}><label style={labelStyle}>{t('auth.register.ico')}</label><input value={form.companyNumber} onChange={set('companyNumber')} style={inputStyle} /></div>
          <div style={{ marginBottom: 14 }}><label style={labelStyle}>{t('auth.register.dic')}</label><input value={form.vatNumber} onChange={set('vatNumber')} style={inputStyle} /></div>
          <div style={{ marginBottom: 14 }}><label style={labelStyle}>{t('auth.register.address')}</label><input value={form.address} onChange={set('address')} style={inputStyle} /></div>
        </div>
      )}

      {/* Step 3: Plan + consent */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1A2E', margin: '0 0 8px' }}>{t('auth.register.step3')}</h2>
          <p style={{ color: '#6B7280', fontSize: '.85rem', marginBottom: 16 }}>{t('auth.register.planInfo')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {PLAN_KEYS.map(pk => {
              const accent = PLAN_ACCENTS[pk];
              return (
                <div key={pk} onClick={() => setForm(f => ({ ...f, plan: pk }))}
                  style={{ border: form.plan === pk ? `2px solid ${accent}` : '1.5px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', background: form.plan === pk ? `${accent}08` : '#fff', transition: 'all .15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#1A1A2E', fontSize: '.95rem' }}>{pk.charAt(0).toUpperCase() + pk.slice(1)}</span>
                    {form.plan === pk && <CheckCircle size={18} style={{ color: accent }} />}
                  </div>
                  <div style={{ fontSize: '.78rem', color: '#6B7280', marginTop: 4 }}>{t(`auth.register.plan.${pk}.price`)}</div>
                </div>
              );
            })}
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={consentAccepted} onChange={e => setConsentAccepted(e.target.checked)} style={{ marginTop: 2, accentColor: '#0D9488' }} />
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              {t('auth.register.consent')}{' '}
              <Link to="/terms" style={{ color: '#0D9488', textDecoration: 'none' }}>{t('auth.register.terms')}</Link>
              {' '}{t('auth.register.and')}{' '}
              <Link to="/privacy" style={{ color: '#0D9488', textDecoration: 'none' }}>{t('auth.register.privacy')}</Link>
            </span>
          </label>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: '#1A1A2E', fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>{t('auth.register.success')}</h2>
          <p style={{ color: '#6B7280', fontSize: '.9rem', lineHeight: 1.6, marginBottom: 24 }}>{t('auth.register.successMessage')}</p>
          <button onClick={() => navigate('/dashboard', { replace: true })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '.95rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {t('auth.register.goToApp')} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as Step)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <ArrowLeft size={16} /> {t('auth.register.back')}
            </button>
          ) : <div />}
          {step < 3 ? (
            <button onClick={() => setStep(s => (s + 1) as Step)} disabled={!canNext()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: canNext() ? '#0D9488' : '#D1D5DB', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '.9rem', cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}>
              {t('auth.register.next')} <ArrowRight size={16} />
            </button>
          ) : step === 3 ? (
            <button onClick={handleSubmit} disabled={loading || !canNext()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: canNext() ? '#0D9488' : '#D1D5DB', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '.9rem', cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}>
              {loading ? t('auth.register.submitting') : t('auth.register.submit')}
            </button>
          ) : null}
        </div>
      )}

      {step < 4 && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ color: '#6B7280', fontSize: '.85rem' }}>
            {t('auth.register.hasAccount')}{' '}
            <Link to="/login" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>{t('auth.register.signIn')}</Link>
          </span>
        </div>
      )}
    </AuthLayout>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../core/api/client';
import {
  User, Building2, CreditCard, CheckCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff,
} from 'lucide-react';
import { PasswordStrengthIndicator } from '../../shared/components/PasswordStrengthIndicator';

type Step = 1 | 2 | 3 | 4;

const PLAN_KEYS = ['free', 'starter', 'pro'] as const;
const PLAN_ACCENTS: Record<string, string> = { free: '#22c55e', starter: '#3b82f6', pro: '#6366f1' };

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
    setError('');
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = [t('auth.register.step1'), t('auth.register.step2'), t('auth.register.step3'), t('auth.register.step4')];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', padding: 20 }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#6366f1', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
          <p style={{ color: '#6b7280', marginTop: 6, fontSize: '.85rem' }}>
            {step < 4 ? t('auth.register.title') : t('auth.register.done')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
          {stepLabels.map((label, i) => {
            const done = i < step - 1;
            const active = i === step - 1;
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 3, background: done || active ? '#6366f1' : '#2a2d3a', borderRadius: i === 0 ? '3px 0 0 3px' : i === 3 ? '0 3px 3px 0' : 0 }} />
                <span style={{ fontSize: 10, marginTop: 4, display: 'block', color: done || active ? '#6366f1' : '#4b5563', fontWeight: active ? 700 : 400 }}>{label}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 12px', color: '#ef4444', fontSize: '.85rem', marginBottom: 16 }}>{error}</div>
        )}

        {step === 1 && (
          <div>
            <StepIcon icon={<User size={20} />} />
            <Field label={t('auth.register.name')} value={form.name} onChange={set('name')} placeholder="Jan Novak" />
            <Field label={t('auth.register.email')} value={form.email} onChange={set('email')} type="email" placeholder="jan@firma.cz" />
            <div style={{ position: 'relative' }}>
              <Field label={t('auth.register.password')} value={form.password} onChange={set('password')} type={showPw ? 'text' : 'password'} placeholder={t('auth.register.passwordPlaceholder')} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <PasswordStrengthIndicator password={form.password} />
            </div>
            <Field label={t('auth.register.phone')} value={form.phone} onChange={set('phone')} placeholder="+420 777 123 456" />
          </div>
        )}

        {step === 2 && (
          <div>
            <StepIcon icon={<Building2 size={20} />} />
            <Field label={t('auth.register.orgName')} value={form.tenantName} onChange={set('tenantName')} placeholder="Sprava DM Praha s.r.o." />
            <Field label={t('auth.register.ico')} value={form.companyNumber} onChange={set('companyNumber')} placeholder="12345678" />
            <Field label={t('auth.register.dic')} value={form.vatNumber} onChange={set('vatNumber')} placeholder="CZ12345678" />
            <Field label={t('auth.register.address')} value={form.address} onChange={set('address')} placeholder="Hlavni 12, Praha 1" />
          </div>
        )}

        {step === 3 && (
          <div>
            <StepIcon icon={<CreditCard size={20} />} />
            <p style={{ color: '#9ca3af', fontSize: '.82rem', marginBottom: 16, textAlign: 'center' }}>{t('auth.register.planInfo')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PLAN_KEYS.map((pk) => {
                const accent = PLAN_ACCENTS[pk];
                const features = [t(`auth.register.plan.${pk}.f1`), t(`auth.register.plan.${pk}.f2`), t(`auth.register.plan.${pk}.f3`)];
                const f4 = t(`auth.register.plan.${pk}.f4`, { defaultValue: '' });
                if (f4) features.push(f4);
                return (
                  <div key={pk} onClick={() => setForm((f) => ({ ...f, plan: pk }))}
                    style={{ border: form.plan === pk ? `2px solid ${accent}` : '1px solid #2a2d3a', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: form.plan === pk ? `${accent}0a` : 'transparent', transition: 'all .15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '.95rem' }}>{pk.charAt(0).toUpperCase() + pk.slice(1)}</span>
                        <span style={{ color: '#6b7280', fontSize: '.82rem', marginLeft: 8 }}>{t(`auth.register.plan.${pk}.price`)}</span>
                      </div>
                      {form.plan === pk && <CheckCircle size={18} style={{ color: accent }} />}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                      {features.map((f) => <span key={f} style={{ fontSize: '.72rem', color: '#9ca3af' }}>{f}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={consentAccepted} onChange={e => setConsentAccepted(e.target.checked)} style={{ marginTop: '2px' }} />
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                {t('auth.register.consent')}{' '}
                <Link to="/terms" style={{ color: '#6366f1', textDecoration: 'none' }}>{t('auth.register.terms')}</Link>
                {' '}{t('auth.register.and')}{' '}
                <Link to="/privacy" style={{ color: '#6366f1', textDecoration: 'none' }}>{t('auth.register.privacy')}</Link>
              </span>
            </label>
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>&#127881;</div>
            <h2 style={{ color: '#f3f4f6', fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{t('auth.register.success')}</h2>
            <p style={{ color: '#9ca3af', fontSize: '.85rem', lineHeight: 1.6, marginBottom: 24 }}>{t('auth.register.successMessage')}</p>
            <button onClick={() => navigate('/dashboard', { replace: true })} style={primaryBtn}>
              {t('auth.register.goToApp')} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            {step > 1 ? (
              <button onClick={() => setStep((s) => (s - 1) as Step)} style={secondaryBtn}>
                <ArrowLeft size={16} /> {t('auth.register.back')}
              </button>
            ) : <div />}
            {step < 3 ? (
              <button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canNext()} style={primaryBtn}>
                {t('auth.register.next')} <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !canNext()} style={primaryBtn}>
                {loading ? t('auth.register.submitting') : t('auth.register.submit')}
              </button>
            )}
          </div>
        )}

        {step < 4 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ color: '#6b7280', fontSize: '.82rem' }}>
              {t('auth.register.hasAccount')}{' '}
              <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>{t('auth.register.signIn')}</Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '.9rem', cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { ...primaryBtn, background: '#2a2d3a', color: '#d1d5db' };

function StepIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#6366f115', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
      {icon}
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', color: '#9ca3af', fontSize: '.82rem', marginBottom: 4 }}>{label}</label>
      <input type={type ?? 'text'} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: '.9rem', boxSizing: 'border-box' }} />
    </div>
  );
}

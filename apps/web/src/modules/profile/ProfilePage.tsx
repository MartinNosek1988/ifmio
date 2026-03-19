import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { PasswordStrengthIndicator } from '../../shared/components/PasswordStrengthIndicator';
import {
  useMioDigestPrefs, useUpdateMioDigestPrefs, useResetMioDigestPrefs,
  useMioDigestStatus, useMioDigestHistory, useMioDigestPreview,
} from '../admin/api/admin.queries';
import {
  User, Shield, SlidersHorizontal, Camera, Save, Eye, EyeOff, Check, RotateCcw, Mail,
  Clock, CheckCircle, XCircle, SkipForward, Search,
} from 'lucide-react';

/* ─── types ──────────────────────────────────────────────────────── */

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  phone: string | null;
  position: string | null;
  avatarBase64: string | null;
  language: string;
  timezone: string;
  dateFormat: string;
  notifEmail: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  tenant?: { name: string; plan: string };
}

type Tab = 'personal' | 'security' | 'preferences';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Osobní údaje', icon: <User size={16} /> },
  { key: 'security', label: 'Bezpečnost', icon: <Shield size={16} /> },
  { key: 'preferences', label: 'Preference', icon: <SlidersHorizontal size={16} /> },
];

const ROLE_LABEL: Record<string, string> = {
  owner: 'Vlastník', admin: 'Administrátor', manager: 'Manažer',
  technician: 'Technik', viewer: 'Čtenář',
};

/* ─── component ──────────────────────────────────────────────────── */

export default function ProfilePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('personal');

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me').then((r) => r.data),
    staleTime: 30_000,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Profile>) => apiClient.patch('/auth/profile', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auth', 'me'] }); },
  });

  if (isLoading || !profile) {
    return <div style={{ padding: 40, color: '#9ca3af' }}>Načítání profilu...</div>;
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Header with avatar */}
      <ProfileHeader profile={profile} onUpdate={(d) => updateMut.mutate(d)} />

      {/* Tabs */}
      <div className="profile-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`profile-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'personal' && (
        <PersonalTab profile={profile} onSave={(d) => updateMut.mutate(d)} saving={updateMut.isPending} />
      )}
      {tab === 'security' && <SecurityTab />}
      {tab === 'preferences' && (
        <PreferencesTab profile={profile} onSave={(d) => updateMut.mutate(d)} saving={updateMut.isPending} />
      )}
    </div>
  );
}

/* ─── Header ─────────────────────────────────────────────────────── */

function ProfileHeader({ profile, onUpdate }: { profile: Profile; onUpdate: (d: Partial<Profile>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert('Max velikost 500 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => { onUpdate({ avatarBase64: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const initials = profile.name
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="profile-header">
      <div className="profile-avatar-wrap" onClick={() => fileRef.current?.click()}>
        {profile.avatarBase64 ? (
          <img src={profile.avatarBase64} alt="Avatar" className="profile-avatar-img" />
        ) : (
          <div className="profile-avatar-initials">{initials}</div>
        )}
        <div className="profile-avatar-overlay"><Camera size={18} /></div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      <div>
        <h2 style={{ color: '#f3f4f6', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{profile.name}</h2>
        <p style={{ color: '#9ca3af', fontSize: '.85rem', margin: '4px 0 0' }}>{profile.email}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <span className="profile-badge">{ROLE_LABEL[profile.role] ?? profile.role}</span>
          {profile.tenant && (
            <span className="profile-badge profile-badge-muted">{profile.tenant.name}</span>
          )}
          <span className="profile-badge profile-badge-muted">
            Registrace: {new Date(profile.createdAt).toLocaleDateString('cs-CZ')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Personal Tab ───────────────────────────────────────────────── */

function PersonalTab({ profile, onSave, saving }: {
  profile: Profile; onSave: (d: Partial<Profile>) => void; saving: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [position, setPosition] = useState(profile.position ?? '');

  const dirty = name !== profile.name || phone !== (profile.phone ?? '') || position !== (profile.position ?? '');

  return (
    <div className="profile-card">
      <h3 className="profile-card-title">Osobní informace</h3>
      <div className="profile-grid">
        <Field label="Jméno a příjmení" value={name} onChange={setName} />
        <Field label="Email" value={profile.email} disabled hint="Email nelze změnit" />
        <Field label="Telefon" value={phone} onChange={setPhone} placeholder="+420 777 123 456" />
        <Field label="Pozice / Role" value={position} onChange={setPosition} placeholder="Facility Manager" />
      </div>
      <div className="profile-readonly">
        <span>Role v systému: <strong>{ROLE_LABEL[profile.role] ?? profile.role}</strong></span>
        <span>Poslední přihlášení: <strong>{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('cs-CZ') : '—'}</strong></span>
      </div>
      {dirty && (
        <div className="profile-save-bar">
          <button className="profile-btn-primary" onClick={() => onSave({ name, phone, position })} disabled={saving}>
            <Save size={15} /> {saving ? 'Ukládám...' : 'Uložit změny'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Security Tab ───────────────────────────────────────────────── */

function SecurityTab() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const changeMut = useMutation({
    mutationFn: (d: { currentPassword: string; newPassword: string }) =>
      apiClient.patch('/auth/change-password', d).then((r) => r.data),
    onSuccess: () => {
      setSuccess('Heslo bylo úspěšně změněno');
      setError('');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    },
    onError: (err: any) => {
      setSuccess('');
      setError(err?.response?.data?.message ?? 'Změna hesla selhala');
    },
  });

  const canSubmit = currentPw.length >= 1 && newPw.length >= 8 && newPw === confirmPw;

  return (
    <>
      <div className="profile-card">
        <h3 className="profile-card-title">Změna hesla</h3>
        {error && <div className="profile-alert profile-alert-error">{error}</div>}
        {success && <div className="profile-alert profile-alert-success"><Check size={14} /> {success}</div>}
        <div className="profile-grid" style={{ maxWidth: 420 }}>
          <div style={{ position: 'relative' }}>
            <Field label="Aktuální heslo" value={currentPw} onChange={setCurrentPw}
              type={showCurrent ? 'text' : 'password'} />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="profile-pw-toggle">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Field label="Nové heslo" value={newPw} onChange={setNewPw}
              type={showNew ? 'text' : 'password'} hint="Min. 8 znaků, velké písmeno" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="profile-pw-toggle">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <PasswordStrengthIndicator password={newPw} />
          </div>
          <Field label="Potvrzení nového hesla" value={confirmPw} onChange={setConfirmPw} type="password" />
          {confirmPw && newPw !== confirmPw && (
            <p style={{ color: '#ef4444', fontSize: '.8rem', margin: '-8px 0 0' }}>Hesla se neshodují</p>
          )}
        </div>
        <div className="profile-save-bar">
          <button className="profile-btn-primary" disabled={!canSubmit || changeMut.isPending}
            onClick={() => changeMut.mutate({ currentPassword: currentPw, newPassword: newPw })}>
            <Shield size={15} /> {changeMut.isPending ? 'Měním...' : 'Změnit heslo'}
          </button>
        </div>
      </div>

      <div className="profile-card" style={{ marginTop: 16 }}>
        <h3 className="profile-card-title">Dvoufaktorové ověření (2FA)</h3>
        <p style={{ color: '#9ca3af', fontSize: '.85rem', lineHeight: 1.6 }}>
          Dvoufaktorové ověření přidává další vrstvu zabezpečení vašeho účtu.
          Tato funkce bude dostupná v příští verzi.
        </p>
        <button className="profile-btn-secondary" disabled style={{ marginTop: 12, opacity: 0.5 }}>
          <Shield size={15} /> Aktivovat 2FA (připravujeme)
        </button>
      </div>
    </>
  );
}

/* ─── Preferences Tab ────────────────────────────────────────────── */

function PreferencesTab({ profile, onSave, saving }: {
  profile: Profile; onSave: (d: Partial<Profile>) => void; saving: boolean;
}) {
  const [lang, setLang] = useState(profile.language);
  const [tz, setTz] = useState(profile.timezone);
  const [df, setDf] = useState(profile.dateFormat);
  const [notif, setNotif] = useState(profile.notifEmail);

  const dirty = lang !== profile.language || tz !== profile.timezone
    || df !== profile.dateFormat || notif !== profile.notifEmail;

  return (
    <div className="profile-card">
      <h3 className="profile-card-title">Zobrazení a notifikace</h3>
      <div className="profile-grid" style={{ maxWidth: 420 }}>
        <div className="profile-field">
          <label>Jazyk</label>
          <select value={lang} onChange={(e) => {
            setLang(e.target.value);
            import('../../core/i18n').then(({ default: i18n }) => {
              i18n.changeLanguage(e.target.value);
              localStorage.setItem('ifmio_lang', e.target.value);
            });
          }} className="profile-select">
            <option value="cs">Čeština</option>
            <option value="en">English</option>
            <option value="sk">Slovenčina</option>
            <option value="de">Deutsch</option>
            <option value="uk">Українська</option>
          </select>
        </div>
        <div className="profile-field">
          <label>Časová zóna</label>
          <select value={tz} onChange={(e) => setTz(e.target.value)} className="profile-select">
            <option value="Europe/Prague">Europe/Prague (CET)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Europe/Berlin">Europe/Berlin (CET)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="profile-field">
          <label>Formát data</label>
          <select value={df} onChange={(e) => setDf(e.target.value)} className="profile-select">
            <option value="DD.MM.YYYY">DD.MM.YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ color: '#d1d5db', fontSize: '.9rem', fontWeight: 600, marginBottom: 12 }}>Emailové notifikace</h4>
        <label className="profile-toggle-row">
          <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} />
          <span className="profile-toggle-track"><span className="profile-toggle-thumb" /></span>
          <span style={{ color: '#d1d5db', fontSize: '.85rem' }}>Zasílat emailové notifikace</span>
        </label>
      </div>

      {dirty && (
        <div className="profile-save-bar">
          <button className="profile-btn-primary" disabled={saving}
            onClick={() => onSave({ language: lang, timezone: tz, dateFormat: df, notifEmail: notif })}>
            <Save size={15} /> {saving ? 'Ukládám...' : 'Uložit preference'}
          </button>
        </div>
      )}

      {/* ── Mio Digest Preferences ─────────────────────────────── */}
      <MioDigestSection />
      <MioDigestStatusSection />
    </div>
  );
}

/* ─── Mio Digest Preferences ────────────────────────────────────── */

function MioDigestSection() {
  const { data: prefs, isLoading } = useMioDigestPrefs();
  const updateMut = useUpdateMioDigestPrefs();
  const resetMut = useResetMioDigestPrefs();
  const [toast, setToast] = useState<string | null>(null);
  const [local, setLocal] = useState<any>(null);

  if (isLoading || !prefs) return null;

  // Init local state from effective settings
  if (!local && prefs) {
    setLocal({ ...prefs.effective });
    return null;
  }

  const isOverride = prefs.source === 'user_override';
  const isDirty = JSON.stringify(local) !== JSON.stringify(prefs.effective);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = async () => {
    try {
      const result = await updateMut.mutateAsync({
        enabled: local.enabled,
        frequency: local.frequency,
        includeFindings: local.includeFindings,
        includeRecommendations: local.includeRecommendations,
        minSeverity: local.minSeverity,
      });
      setLocal({ ...result.effective });
      showToast('Nastavení uloženo');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Chyba při ukládání');
    }
  };

  const handleReset = async () => {
    if (!confirm('Obnovit výchozí nastavení organizace?')) return;
    try {
      const result = await resetMut.mutateAsync();
      setLocal({ ...result.effective });
      showToast('Obnoveno na výchozí nastavení organizace');
    } catch {
      showToast('Chyba při obnově');
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border, #374151)',
    background: 'var(--surface, #1f2937)', color: 'var(--text, #d1d5db)', fontSize: '.85rem',
    width: 200,
  };

  return (
    <div className="profile-card" style={{ marginTop: 16 }}>
      {toast && (
        <div className="profile-alert profile-alert-success" style={{ marginBottom: 12 }}>
          <Check size={14} /> {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="profile-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={16} /> E-mailové přehledy Mio
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '.78rem', margin: '4px 0 12px' }}>
            Souhrn zjištění a doporučení od Mia zasílaný e-mailem.
          </p>
        </div>
        {isOverride && (
          <button className="profile-btn-secondary" onClick={handleReset} disabled={resetMut.isPending}
            style={{ fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RotateCcw size={12} /> Výchozí
          </button>
        )}
      </div>

      {/* Source indicator */}
      <div style={{
        padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: '.8rem',
        background: isOverride ? 'rgba(99,102,241,0.1)' : 'rgba(156,163,175,0.1)',
        color: isOverride ? '#818cf8' : '#9ca3af',
        border: `1px solid ${isOverride ? 'rgba(99,102,241,0.2)' : 'rgba(156,163,175,0.2)'}`,
      }}>
        {isOverride
          ? 'Aktuálně používáte vlastní nastavení.'
          : 'Aktuálně přebíráte výchozí nastavení organizace.'
        }
        {!isOverride && prefs.tenantDefaults && (
          <span style={{ marginLeft: 6 }}>
            ({prefs.tenantDefaults.frequency === 'off' ? 'Vypnuto' :
              prefs.tenantDefaults.frequency === 'weekly' ? 'Týdně' : 'Denně'})
          </span>
        )}
      </div>

      {/* Enable toggle */}
      <div style={{ marginBottom: 12 }}>
        <label className="profile-toggle-row">
          <input type="checkbox" checked={local.enabled !== false}
            onChange={(e) => setLocal((c: any) => ({ ...c, enabled: e.target.checked }))} />
          <span className="profile-toggle-track"><span className="profile-toggle-thumb" /></span>
          <div>
            <span style={{ color: '#d1d5db', fontSize: '.85rem' }}>Zapnout e-mailové přehledy</span>
            <div style={{ color: '#9ca3af', fontSize: '.75rem' }}>Dostanete souhrn zjištění a doporučení podle svého nastavení.</div>
          </div>
        </label>
      </div>

      {local.enabled !== false && (
        <>
          {/* Frequency */}
          <div className="profile-field" style={{ marginBottom: 12 }}>
            <label>Frekvence</label>
            <select style={inputStyle} value={local.frequency ?? 'daily'}
              onChange={(e) => setLocal((c: any) => ({ ...c, frequency: e.target.value }))}>
              <option value="daily">Denně</option>
              <option value="weekly">Týdně (pondělí)</option>
            </select>
            <span className="profile-hint">Určuje, jak často vám Mio pošle souhrnný e-mail.</span>
          </div>

          {/* Include findings */}
          <div style={{ marginBottom: 8 }}>
            <label className="profile-toggle-row">
              <input type="checkbox" checked={local.includeFindings !== false}
                onChange={(e) => setLocal((c: any) => ({ ...c, includeFindings: e.target.checked }))} />
              <span className="profile-toggle-track"><span className="profile-toggle-thumb" /></span>
              <div>
                <span style={{ color: '#d1d5db', fontSize: '.85rem' }}>Zahrnout upozornění</span>
                <div style={{ color: '#9ca3af', fontSize: '.75rem' }}>Do přehledu zahrne provozní zjištění a rizika.</div>
              </div>
            </label>
          </div>

          {/* Include recommendations */}
          <div style={{ marginBottom: 12 }}>
            <label className="profile-toggle-row">
              <input type="checkbox" checked={local.includeRecommendations !== false}
                onChange={(e) => setLocal((c: any) => ({ ...c, includeRecommendations: e.target.checked }))} />
              <span className="profile-toggle-track"><span className="profile-toggle-thumb" /></span>
              <div>
                <span style={{ color: '#d1d5db', fontSize: '.85rem' }}>Zahrnout doporučení</span>
                <div style={{ color: '#9ca3af', fontSize: '.75rem' }}>Do přehledu zahrne tipy pro efektivitu a bezpečnost.</div>
              </div>
            </label>
          </div>

          {/* Min severity */}
          <div className="profile-field" style={{ marginBottom: 12 }}>
            <label>Minimální závažnost</label>
            <select style={inputStyle} value={local.minSeverity ?? 'info'}
              onChange={(e) => setLocal((c: any) => ({ ...c, minSeverity: e.target.value }))}>
              <option value="info">Vše (info a výše)</option>
              <option value="warning">Varování a kritická</option>
              <option value="critical">Jen kritická</option>
            </select>
            <span className="profile-hint">Určuje, od jaké závažnosti se upozornění do přehledu zařadí.</span>
          </div>
        </>
      )}

      {/* Save bar */}
      {isDirty && (
        <div className="profile-save-bar">
          <button className="profile-btn-primary" onClick={handleSave} disabled={updateMut.isPending}>
            <Save size={15} /> {updateMut.isPending ? 'Ukládám...' : 'Uložit nastavení'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Mio Digest Status & History ────────────────────────────────── */

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent: <CheckCircle size={14} style={{ color: '#10b981' }} />,
  skipped: <SkipForward size={14} style={{ color: '#f59e0b' }} />,
  failed: <XCircle size={14} style={{ color: '#ef4444' }} />,
};
const STATUS_LABEL: Record<string, string> = {
  sent: 'Odesláno', skipped: 'Přeskočeno', failed: 'Selhalo',
};
const FREQ_LABEL: Record<string, string> = { daily: 'Denní', weekly: 'Týdenní' };

function MioDigestStatusSection() {
  const { data: status } = useMioDigestStatus();
  const { data: history } = useMioDigestHistory();
  const { data: preview, refetch: fetchPreview, isFetching: previewLoading } = useMioDigestPreview();
  const [showPreview, setShowPreview] = useState(false);

  if (!status) return null;

  const effective = status.effective;
  const lastSentAt = status.lastSentAt;
  const lastResult = status.lastResult;
  const nextSend = status.nextPlannedSend;

  // Build effective summary line
  const summaryParts: string[] = [];
  if (effective.frequency === 'daily') summaryParts.push('Denně');
  else if (effective.frequency === 'weekly') summaryParts.push('Týdně');
  if (effective.includeFindings) summaryParts.push('upozornění');
  if (effective.includeRecommendations) summaryParts.push('doporučení');
  const sevLabels: Record<string, string> = { info: 'vše', warning: 'varování+', critical: 'jen kritická' };
  summaryParts.push(sevLabels[effective.minSeverity] ?? 'vše');

  return (
    <div className="profile-card" style={{ marginTop: 16 }}>
      <h3 className="profile-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={16} /> Stav přehledu
      </h3>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <StatusRow label="Nastavení" value={
          !effective.enabled ? 'Vypnuto' : summaryParts.join(', ')
        } />
        <StatusRow label="Zdroj" value={
          status.source === 'user_override' ? 'Vlastní nastavení' : 'Výchozí organizace'
        } />
        <StatusRow label="Poslední odeslání" value={
          lastSentAt
            ? new Date(lastSentAt).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Zatím neodeslán'
        } />
        <StatusRow label="Další plánované" value={nextSend ?? 'Odesílání je vypnuto'} />
        {lastResult && (
          <StatusRow label="Poslední výsledek" value={
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {STATUS_ICON[lastResult.status]}
              {STATUS_LABEL[lastResult.status] ?? lastResult.status}
              {lastResult.status === 'sent' && ` (${lastResult.findingsCount} upoz., ${lastResult.recommendationsCount} dopor.)`}
              {lastResult.skippedReason && ` — ${lastResult.skippedReason}`}
            </span>
          } />
        )}
      </div>

      {/* Preview button */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="profile-btn-secondary"
          onClick={() => { setShowPreview(!showPreview); if (!showPreview) fetchPreview(); }}
          disabled={previewLoading}
          style={{ fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Search size={13} />
          {showPreview ? 'Skrýt náhled' : 'Zobrazit náhled'}
        </button>
      </div>

      {/* Preview content */}
      {showPreview && preview && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 16,
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
          fontSize: '.82rem',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Náhled: {preview.totalItems} položek
            {preview.criticalCount > 0 && ` · ${preview.criticalCount} kritických`}
            {preview.warningCount > 0 && ` · ${preview.warningCount} varování`}
          </div>
          {preview.findings?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 500, color: '#9ca3af', marginBottom: 4 }}>Upozornění ({preview.findings.length})</div>
              {preview.findings.slice(0, 5).map((f: any, i: number) => (
                <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {f.title}
                </div>
              ))}
              {preview.findings.length > 5 && <div style={{ color: '#6b7280' }}>… a dalších {preview.findings.length - 5}</div>}
            </div>
          )}
          {preview.recommendations?.length > 0 && (
            <div>
              <div style={{ fontWeight: 500, color: '#9ca3af', marginBottom: 4 }}>Doporučení ({preview.recommendations.length})</div>
              {preview.recommendations.map((r: any, i: number) => (
                <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {r.title}
                </div>
              ))}
            </div>
          )}
          {preview.totalItems === 0 && (
            <div style={{ color: '#9ca3af' }}>Aktuálně nejsou žádné relevantní položky k odeslání.</div>
          )}
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div>
          <h4 style={{ color: '#d1d5db', fontSize: '.85rem', fontWeight: 600, marginBottom: 8 }}>Historie odeslání</h4>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {history.map((h: any) => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '.82rem',
              }}>
                {STATUS_ICON[h.status] ?? null}
                <span style={{ color: '#9ca3af', minWidth: 100 }}>
                  {new Date(h.createdAt).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ color: '#d1d5db' }}>{FREQ_LABEL[h.frequency] ?? h.frequency}</span>
                <span style={{ color: '#d1d5db' }}>
                  {STATUS_LABEL[h.status] ?? h.status}
                  {h.status === 'sent' && ` · ${h.findingsCount} upoz., ${h.recommendationsCount} dopor.`}
                </span>
                {h.skippedReason && <span style={{ color: '#6b7280' }}>— {h.skippedReason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '.75rem', color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '.85rem', color: '#d1d5db' }}>{value}</div>
    </div>
  );
}

/* ─── Field helper ───────────────────────────────────────────────── */

function Field({ label, value, onChange, type, placeholder, disabled, hint }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div className="profile-field">
      <label>{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={!onChange}
        className="profile-input"
      />
      {hint && <span className="profile-hint">{hint}</span>}
    </div>
  );
}

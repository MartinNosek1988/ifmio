import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import {
  User, Shield, SlidersHorizontal, Camera, Save, Eye, EyeOff, Check, Mail,
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
              type={showNew ? 'text' : 'password'} hint="Minimálně 8 znaků" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="profile-pw-toggle">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
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
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="profile-select">
            <option value="cs">Čeština</option>
            <option value="en">English</option>
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

      <ScheduledReportsPreferences />
    </div>
  );
}

/* ─── Scheduled Reports Preferences ──────────────────────────────── */

interface ReportSub {
  id: string; reportType: string; frequency: string; format: string;
  isEnabled: boolean; sendHour: number; workdaysOnly: boolean;
}

const REPORT_TYPES = [
  { value: 'daily_digest', label: 'Denní přehled', noFormat: true },
  { value: 'operations', label: 'Provozní report' },
  { value: 'assets', label: 'Technický report zařízení' },
  { value: 'protocols', label: 'Registr protokolů' },
] as const;

function ScheduledReportsPreferences() {
  const qc = useQueryClient();
  const { data: subs = [] } = useQuery<ReportSub[]>({
    queryKey: ['reports', 'subscriptions'],
    queryFn: () => apiClient.get('/reports/subscriptions').then(r => r.data),
  });

  const upsertMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) =>
      apiClient.post('/reports/subscriptions', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'subscriptions'] }),
  });

  const getSub = (type: string) => subs.find(s => s.reportType === type);

  const toggle = (type: string) => {
    const sub = getSub(type);
    upsertMut.mutate({ reportType: type, isEnabled: sub ? !sub.isEnabled : true });
  };

  const change = (type: string, field: string, value: unknown) => {
    upsertMut.mutate({ reportType: type, [field]: value });
  };

  const selStyle: React.CSSProperties = {
    padding: '5px 8px', borderRadius: 4, border: '1px solid #374151',
    background: '#1f2937', color: '#d1d5db', fontSize: '.8rem',
  };

  return (
    <div className="profile-card" style={{ marginTop: 16 }}>
      <h3 className="profile-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mail size={16} /> Plánované reporty
      </h3>
      <p style={{ color: '#9ca3af', fontSize: '.8rem', lineHeight: 1.5, marginBottom: 16 }}>
        Řešitel dostává pouze své přiřazené položky v rámci přidělených objektů.
        Dispečer dostává provozní přehled v rámci svých objektů.
        Admin/FM dostává úplný přehled v rámci přidělených objektů.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {REPORT_TYPES.map(rt => {
          const sub = getSub(rt.value);
          const isOn = sub?.isEnabled ?? false;
          return (
            <div key={rt.value} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: '1px solid #374151', background: '#111827',
            }}>
              <label className="profile-toggle-row" style={{ flex: 'none', margin: 0 }}>
                <input type="checkbox" checked={isOn} onChange={() => toggle(rt.value)} />
                <span className="profile-toggle-track"><span className="profile-toggle-thumb" /></span>
              </label>
              <div style={{ flex: 1, color: '#d1d5db', fontWeight: 500, fontSize: '.85rem' }}>{rt.label}</div>

              {!('noFormat' in rt && rt.noFormat) && (
                <>
                  <select value={sub?.frequency ?? 'daily'} onChange={e => change(rt.value, 'frequency', e.target.value)} style={selStyle} disabled={!isOn}>
                    <option value="daily">Denně</option>
                    <option value="weekly">Týdně</option>
                    <option value="monthly">Měsíčně</option>
                  </select>
                  <select value={sub?.format ?? 'xlsx'} onChange={e => change(rt.value, 'format', e.target.value)} style={selStyle} disabled={!isOn}>
                    <option value="xlsx">XLSX</option>
                    <option value="csv">CSV</option>
                  </select>
                </>
              )}

              <select value={String(sub?.sendHour ?? 6)} onChange={e => change(rt.value, 'sendHour', Number(e.target.value))} style={selStyle} disabled={!isOn}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af', fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={sub?.workdaysOnly ?? false} onChange={e => change(rt.value, 'workdaysOnly', e.target.checked)} disabled={!isOn} />
                Jen prac. dny
              </label>
            </div>
          );
        })}
      </div>
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

import { useState, useRef } from 'react';
import { useTenantSettings, useUpdateSettings, useMioConfig, useUpdateMioConfig } from '../admin/api/admin.queries';
import { adminApi } from '../admin/api/admin.api';
import { LoadingState, ErrorState, Button } from '../../shared/components';
import {
  Building2, Mail, FileText, Bell, Palette, Download, Bot,
  Save, Upload, X, Check,
} from 'lucide-react';

type TabKey = 'firma' | 'email' | 'fakturace' | 'upominky' | 'vzhled' | 'mio' | 'export';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'firma', label: 'Firma & Branding', icon: <Building2 size={15} /> },
  { key: 'email', label: 'Email & Notifikace', icon: <Mail size={15} /> },
  { key: 'fakturace', label: 'Fakturace', icon: <FileText size={15} /> },
  { key: 'upominky', label: 'Upominky', icon: <Bell size={15} /> },
  { key: 'vzhled', label: 'Vzhled', icon: <Palette size={15} /> },
  { key: 'mio', label: 'Mio Governance', icon: <Bot size={15} /> },
  { key: 'export', label: 'Zaloha dat', icon: <Download size={15} /> },
];

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useTenantSettings();
  const updateMutation = useUpdateSettings();
  const [tab, setTab] = useState<TabKey>('firma');
  const [saved, setSaved] = useState(false);

  if (isLoading) return <LoadingState text="Nacitam nastaveni..." />;
  if (error) return <ErrorState message="Nepodarilo se nacist nastaveni." />;

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    await updateMutation.mutateAsync(data);
    showSaved();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      <nav className="settings-sidenav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`settings-sidenav__item${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <div>
        {saved && (
          <div className="settings-saved-toast">
            <Check size={14} /> Ulozeno
          </div>
        )}

        {tab === 'firma' && <FirmaTab settings={settings} onSave={handleSave} saving={updateMutation.isPending} />}
        {tab === 'email' && <EmailTab settings={settings} onSave={handleSave} saving={updateMutation.isPending} />}
        {tab === 'fakturace' && <FakturaceTab settings={settings} onSave={handleSave} saving={updateMutation.isPending} />}
        {tab === 'upominky' && <UpominkyTab settings={settings} onSave={handleSave} saving={updateMutation.isPending} />}
        {tab === 'vzhled' && <VzhledTab settings={settings} onSave={handleSave} saving={updateMutation.isPending} />}
        {tab === 'mio' && <MioGovernanceTab />}
        {tab === 'export' && <ExportTab />}
      </div>
    </div>
  );
}

/* ─── FIRMA & BRANDING ───────────────────────────────────────────────── */

function FirmaTab({ settings, onSave, saving }: TabProps) {
  const s = settings ?? {};
  const [form, setForm] = useState({
    orgName: s.orgName ?? s.tenant?.name ?? '',
    orgStreet: s.orgStreet ?? '',
    orgCity: s.orgCity ?? '',
    orgZip: s.orgZip ?? '',
    orgCountry: s.orgCountry ?? 'CZ',
    orgPhone: s.orgPhone ?? '',
    orgEmail: s.orgEmail ?? '',
    orgWeb: s.orgWeb ?? '',
    companyNumber: s.companyNumber ?? '',
    vatNumber: s.vatNumber ?? '',
  });
  const [logo, setLogo] = useState<string | null>(s.logoBase64 ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Logo musi byt mensi nez 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => onSave({ ...form, logoBase64: logo });

  return (
    <div>
      <SectionCard title="Firemni udaje">
        <div className="settings-grid">
          <FormField label="Nazev organizace *" value={form.orgName} onChange={set('orgName')} />
          <FormField label="ICO" value={form.companyNumber} onChange={set('companyNumber')} />
          <FormField label="DIC" value={form.vatNumber} onChange={set('vatNumber')} />
          <FormField label="Email" value={form.orgEmail} onChange={set('orgEmail')} type="email" />
          <FormField label="Telefon" value={form.orgPhone} onChange={set('orgPhone')} />
          <FormField label="Web" value={form.orgWeb} onChange={set('orgWeb')} />
        </div>
      </SectionCard>

      <SectionCard title="Adresa sidla">
        <div className="settings-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Ulice a cislo" value={form.orgStreet} onChange={set('orgStreet')} />
          </div>
          <FormField label="Mesto" value={form.orgCity} onChange={set('orgCity')} />
          <FormField label="PSC" value={form.orgZip} onChange={set('orgZip')} />
          <FormField label="Stat" value={form.orgCountry} onChange={set('orgCountry')} />
        </div>
      </SectionCard>

      <SectionCard title="Logo organizace">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            className="settings-logo-upload"
            onClick={() => fileRef.current?.click()}
          >
            {logo ? (
              <img src={logo} alt="Logo" style={{ maxWidth: 160, maxHeight: 80 }} />
            ) : (
              <>
                <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>PNG, SVG &middot; max 2 MB</span>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
          {logo && (
            <button className="btn btn--sm btn--ghost" onClick={() => setLogo(null)}>
              <X size={14} /> Odebrat logo
            </button>
          )}
        </div>
      </SectionCard>

      <SaveFooter saving={saving} onSave={submit} />
    </div>
  );
}

/* ─── EMAIL & NOTIFIKACE ─────────────────────────────────────────────── */

function EmailTab({ settings, onSave, saving }: TabProps) {
  const s = settings ?? {};
  const [form, setForm] = useState({
    emailFrom: s.emailFrom ?? '',
    emailReplyTo: s.emailReplyTo ?? '',
    emailSignature: s.emailSignature ?? '',
    notifNewTicket: s.notifNewTicket ?? true,
    notifWoAssigned: s.notifWoAssigned ?? true,
    notifContractExp: s.notifContractExp ?? true,
    notifMeterDue: s.notifMeterDue ?? true,
    notifPaymentDue: s.notifPaymentDue ?? true,
  });

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const toggle = (k: string) => () =>
    setForm((p) => ({ ...p, [k]: !(p as any)[k] }));

  return (
    <div>
      <SectionCard title="Odchozi email">
        <div className="settings-grid">
          <FormField label="Odesilatel (From)" value={form.emailFrom} onChange={setField('emailFrom')} placeholder="noreply@example.com" />
          <FormField label="Reply-To" value={form.emailReplyTo} onChange={setField('emailReplyTo')} placeholder="info@example.com" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="settings-label">Podpis emailu</label>
          <textarea
            className="settings-textarea"
            rows={3}
            value={form.emailSignature}
            onChange={setField('emailSignature')}
            placeholder="S pozdravem, Vase sprava nemovitosti"
          />
        </div>
      </SectionCard>

      <SectionCard title="Notifikace">
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Zapnete/vypnete emailove notifikace pro jednotlive udalosti.
        </p>
        <ToggleRow label="Nový Helpdesk požadavek" checked={form.notifNewTicket} onToggle={toggle('notifNewTicket')} />
        <ToggleRow label="Přiřazení pracovního úkolu" checked={form.notifWoAssigned} onToggle={toggle('notifWoAssigned')} />
        <ToggleRow label="Expirace smlouvy" checked={form.notifContractExp} onToggle={toggle('notifContractExp')} />
        <ToggleRow label="Kalibrace meridla" checked={form.notifMeterDue} onToggle={toggle('notifMeterDue')} />
        <ToggleRow label="Splatnost platby" checked={form.notifPaymentDue} onToggle={toggle('notifPaymentDue')} />
      </SectionCard>

      <SaveFooter saving={saving} onSave={() => onSave(form)} />
    </div>
  );
}

/* ─── FAKTURACE ──────────────────────────────────────────────────────── */

function FakturaceTab({ settings, onSave, saving }: TabProps) {
  const s = settings ?? {};
  const [form, setForm] = useState({
    invoicePrefix: s.invoicePrefix ?? 'FV',
    contractPrefix: s.contractPrefix ?? 'SM',
    invoiceDueDays: s.invoiceDueDays ?? 14,
    defaultVat: s.defaultVat ?? 21,
    currency: s.currency ?? 'CZK',
    bankAccount: s.bankAccount ?? '',
    invoiceFooter: s.invoiceFooter ?? '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const setNum = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: parseInt(e.target.value, 10) || 0 }));

  return (
    <div>
      <SectionCard title="Cislovaci rady">
        <div className="settings-grid">
          <FormField label="Prefix faktur" value={form.invoicePrefix} onChange={set('invoicePrefix')} placeholder="FV" />
          <FormField label="Prefix smluv" value={form.contractPrefix} onChange={set('contractPrefix')} placeholder="SM" />
        </div>
      </SectionCard>

      <SectionCard title="Financni parametry">
        <div className="settings-grid">
          <div>
            <label className="settings-label">Splatnost (dny)</label>
            <input className="settings-input" type="number" min={1} max={90} value={form.invoiceDueDays} onChange={setNum('invoiceDueDays')} />
          </div>
          <div>
            <label className="settings-label">Vychozi DPH (%)</label>
            <input className="settings-input" type="number" min={0} max={100} value={form.defaultVat} onChange={setNum('defaultVat')} />
          </div>
          <div>
            <label className="settings-label">Mena</label>
            <select className="settings-input" value={form.currency} onChange={set('currency')}>
              <option value="CZK">CZK - Ceska koruna</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dolar</option>
            </select>
          </div>
          <FormField label="Bankovni ucet" value={form.bankAccount} onChange={set('bankAccount')} placeholder="12345678/0100" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="settings-label">Paticka faktury</label>
          <textarea className="settings-textarea" rows={2} value={form.invoiceFooter} onChange={set('invoiceFooter')} placeholder="Dekujeme za vcasnou platbu." />
        </div>
      </SectionCard>

      <SaveFooter saving={saving} onSave={() => onSave(form)} />
    </div>
  );
}

/* ─── UPOMINKY ───────────────────────────────────────────────────────── */

function UpominkyTab({ settings, onSave, saving }: TabProps) {
  const s = settings ?? {};
  const [form, setForm] = useState({
    reminderDaysBefore: s.reminderDaysBefore ?? 7,
    reminderText1: s.reminderText1 ?? 'Vazeny najemniku, upozornujeme Vas na blizici se splatnost platby.',
    reminderText2: s.reminderText2 ?? 'Druha upominka: Vase platba je po splatnosti. Prosime o neprodlene uhrazeni.',
  });

  return (
    <div>
      <SectionCard title="Nastaveni upominek">
        <div style={{ maxWidth: 400 }}>
          <label className="settings-label">Pocet dnu pred splatnosti</label>
          <input
            className="settings-input"
            type="number"
            min={1}
            max={60}
            value={form.reminderDaysBefore}
            onChange={(e) => setForm((p) => ({ ...p, reminderDaysBefore: parseInt(e.target.value, 10) || 7 }))}
          />
        </div>
      </SectionCard>

      <SectionCard title="Text 1. upominky">
        <textarea
          className="settings-textarea"
          rows={3}
          value={form.reminderText1}
          onChange={(e) => setForm((p) => ({ ...p, reminderText1: e.target.value }))}
        />
      </SectionCard>

      <SectionCard title="Text 2. upominky">
        <textarea
          className="settings-textarea"
          rows={3}
          value={form.reminderText2}
          onChange={(e) => setForm((p) => ({ ...p, reminderText2: e.target.value }))}
        />
      </SectionCard>

      <SaveFooter saving={saving} onSave={() => onSave(form)} />
    </div>
  );
}

/* ─── VZHLED ─────────────────────────────────────────────────────────── */

function VzhledTab({ settings, onSave, saving }: TabProps) {
  const s = settings ?? {};
  const [form, setForm] = useState({
    primaryColor: s.primaryColor ?? '#6366f1',
    themeMode: s.themeMode ?? 'light',
  });

  const presets = [
    { label: 'Indigo', color: '#6366f1' },
    { label: 'Zelena', color: '#22c55e' },
    { label: 'Modra', color: '#3b82f6' },
    { label: 'Cervena', color: '#ef4444' },
    { label: 'Oranzova', color: '#f97316' },
    { label: 'Fialova', color: '#a855f7' },
  ];

  return (
    <div>
      <SectionCard title="Primarni barva">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 8,
              background: form.primaryColor, border: '1px solid var(--border)',
              cursor: 'pointer', overflow: 'hidden', position: 'relative',
            }}
          >
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
              style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            />
          </div>
          <input
            className="settings-input"
            value={form.primaryColor}
            onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
            style={{ width: 120, fontFamily: 'monospace' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {presets.map((p) => (
            <button
              key={p.color}
              className={`settings-color-preset${form.primaryColor === p.color ? ' active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, primaryColor: p.color }))}
              title={p.label}
            >
              <span style={{ width: 16, height: 16, borderRadius: 4, background: p.color, display: 'inline-block' }} />
              {p.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Tema">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['light', 'dark', 'system'] as const).map((m) => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem' }}>
              <input
                type="radio"
                name="themeMode"
                checked={form.themeMode === m}
                onChange={() => setForm((p) => ({ ...p, themeMode: m }))}
              />
              {{ light: 'Svetly', dark: 'Tmavy', system: 'Dle systemu' }[m]}
            </label>
          ))}
        </div>
      </SectionCard>

      <SaveFooter saving={saving} onSave={() => onSave(form)} />
    </div>
  );
}

/* ─── EXPORT ─────────────────────────────────────────────────────────── */

function ExportTab() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await adminApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ifmio-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export se nezdaril.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <SectionCard title="Export dat">
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Exportujte vsechna data Vasi organizace do JSON souboru. Export obsahuje nemovitosti,
          najemniky, smlouvy, work ordery, meridla, transakce, dokumenty a udalosti kalendare.
        </p>
        <Button onClick={handleExport} disabled={exporting}>
          <Download size={15} />
          {exporting ? 'Exportuji...' : 'Stahnout JSON export'}
        </Button>
      </SectionCard>

      <div className="settings-danger-zone">
        <h4>Nebezpecna zona</h4>
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Pred jakoukoli destruktivni akci si vzdy vytvorte zalohu.
        </p>
        <button
          className="btn btn--danger"
          onClick={() => alert('Smazani dat neni v teto verzi k dispozici. Kontaktujte podporu.')}
        >
          Smazat vsechna data
        </button>
      </div>
    </div>
  );
}

/* ─── MIO GOVERNANCE ────────────────────────────────────────────────── */

const FINDING_LABELS: Record<string, string> = {
  overdue_recurring_request: 'Opakované požadavky po termínu',
  overdue_revision: 'Revize po termínu',
  overdue_work_order: 'Pracovní úkoly po termínu',
  urgent_ticket_no_assignee: 'Urgentní požadavky bez řešitele',
  asset_no_recurring_plan: 'Zařízení bez opakované činnosti',
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  recurring_plans_adoption: 'Automatizace opakovaných činností',
  reporting_export_tip: 'Tip na export přehledů',
  helpdesk_filtering_tip: 'Tip na filtry helpdesku',
  attachments_protocol_tip: 'Tip na protokoly k úkolům',
  security_access_tip: 'Kontrola přístupů',
};

const THRESHOLD_LABELS: Record<string, { label: string; hint: string }> = {
  RECURRING_ADOPTION_MIN_ASSETS: { label: 'Min. zařízení pro tip na opakované činnosti', hint: 'Počet zařízení' },
  RECURRING_ADOPTION_MAX_PLANS: { label: 'Max. plánů pro tip na opakované činnosti', hint: 'Počet plánů' },
  REPORTING_TIP_MIN_TICKETS: { label: 'Min. požadavků pro tip na exporty', hint: 'Počet požadavků' },
  HELPDESK_FILTER_TIP_MIN_TICKETS: { label: 'Min. požadavků pro tip na filtry', hint: 'Počet požadavků' },
  PROTOCOL_TIP_MIN_COMPLETED_WO: { label: 'Min. úkolů pro tip na protokoly', hint: 'Počet úkolů' },
  SECURITY_TIP_MIN_USERS: { label: 'Min. uživatelů pro tip na přístupy', hint: 'Počet uživatelů' },
};

function MioGovernanceTab() {
  const { data: config, isLoading } = useMioConfig();
  const updateMut = useUpdateMioConfig();
  const [saved, setSaved] = useState(false);
  const [localConfig, setLocalConfig] = useState<any>(null);

  // Sync when data arrives
  const cfg = localConfig ?? config;

  if (isLoading || !cfg) return <LoadingState text="Načítání Mio konfigurace..." />;

  // Initialize local state on first render
  if (!localConfig && config) {
    setLocalConfig(JSON.parse(JSON.stringify(config)));
    return null;
  }

  const toggleFinding = (code: string) => {
    setLocalConfig((c: any) => ({
      ...c,
      enabledFindings: { ...c.enabledFindings, [code]: !c.enabledFindings[code] },
    }));
  };

  const toggleRecommendation = (code: string) => {
    setLocalConfig((c: any) => ({
      ...c,
      enabledRecommendations: { ...c.enabledRecommendations, [code]: !c.enabledRecommendations[code] },
    }));
  };

  const toggleAutoTicket = (code: string) => {
    setLocalConfig((c: any) => ({
      ...c,
      autoTicketPolicy: { ...c.autoTicketPolicy, [code]: !c.autoTicketPolicy[code] },
    }));
  };

  const setThreshold = (key: string, value: number) => {
    setLocalConfig((c: any) => ({
      ...c,
      thresholds: { ...c.thresholds, [key]: value },
    }));
  };

  const toggleDashboard = (key: string) => {
    setLocalConfig((c: any) => ({
      ...c,
      dashboard: { ...c.dashboard, [key]: !c.dashboard[key] },
    }));
  };

  const handleSave = async () => {
    await updateMut.mutateAsync(localConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      {saved && (
        <div className="settings-saved-toast">
          <Check size={14} /> Uloženo
        </div>
      )}

      <SectionCard title="Pravidla upozornění (Findings)">
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Zapněte/vypněte jednotlivá pravidla detekce. Vypnutá pravidla nebudou generovat nová zjištění.
        </p>
        {Object.entries(FINDING_LABELS).map(([code, label]) => (
          <ToggleRow
            key={code}
            label={label}
            checked={localConfig.enabledFindings[code] !== false}
            onToggle={() => toggleFinding(code)}
          />
        ))}
      </SectionCard>

      <SectionCard title="Doporučení (Recommendations)">
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Zapněte/vypněte jednotlivá doporučení Mio.
        </p>
        {Object.entries(RECOMMENDATION_LABELS).map(([code, label]) => (
          <ToggleRow
            key={code}
            label={label}
            checked={localConfig.enabledRecommendations[code] !== false}
            onToggle={() => toggleRecommendation(code)}
          />
        ))}
      </SectionCard>

      <SectionCard title="Automatické tickety">
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Která zjištění mají automaticky vytvářet helpdesk požadavek.
        </p>
        {Object.entries(FINDING_LABELS).map(([code, label]) => (
          <ToggleRow
            key={code}
            label={label}
            checked={localConfig.autoTicketPolicy[code] === true}
            onToggle={() => toggleAutoTicket(code)}
          />
        ))}
      </SectionCard>

      <SectionCard title="Prahové hodnoty">
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Nastavte prahy, při kterých se doporučení zobrazí.
        </p>
        {Object.entries(THRESHOLD_LABELS).map(([key, { label, hint }]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <label style={{ flex: 1, fontSize: '.85rem' }}>{label}</label>
            <input
              className="settings-input"
              type="number"
              min={0}
              style={{ width: 90 }}
              value={localConfig.thresholds[key] ?? 0}
              onChange={(e) => setThreshold(key, parseInt(e.target.value, 10) || 0)}
              title={hint}
            />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Zobrazení na dashboardu">
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Ovládejte, které Mio sekce se zobrazí na hlavním dashboardu.
        </p>
        <ToggleRow
          label="Mio upozornění (Findings)"
          checked={localConfig.dashboard.showFindings !== false}
          onToggle={() => toggleDashboard('showFindings')}
        />
        <ToggleRow
          label="Mio doporučení (Recommendations)"
          checked={localConfig.dashboard.showRecommendations !== false}
          onToggle={() => toggleDashboard('showRecommendations')}
        />
        <ToggleRow
          label="Mio strip (KPI karty)"
          checked={localConfig.dashboard.showMioStrip !== false}
          onToggle={() => toggleDashboard('showMioStrip')}
        />
      </SectionCard>

      <SaveFooter saving={updateMut.isPending} onSave={handleSave} />
    </div>
  );
}

/* ─── SHARED PIECES ──────────────────────────────────────────────────── */

interface TabProps {
  settings: any;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-card">
      <h3 className="settings-card__title">{title}</h3>
      {children}
    </div>
  );
}

function FormField({
  label, value, onChange, type, placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="settings-label">{label}</label>
      <input className="settings-input" type={type ?? 'text'} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="settings-toggle-row">
      <div
        className={`settings-toggle${checked ? ' active' : ''}`}
        onClick={onToggle}
        role="switch"
        aria-checked={checked}
      >
        <div className="settings-toggle__thumb" />
      </div>
      <span>{label}</span>
    </label>
  );
}

function SaveFooter({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="settings-footer">
      <Button onClick={onSave} disabled={saving}>
        <Save size={15} />
        {saving ? 'Ukladam...' : 'Ulozit zmeny'}
      </Button>
    </div>
  );
}

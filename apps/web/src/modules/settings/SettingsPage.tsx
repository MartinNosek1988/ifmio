import { useState, useRef } from 'react';
import {
  useTenantSettings, useUpdateSettings,
  useMioConfig, useMioConfigMeta, useMioConfigDefaults,
  useUpdateMioConfig, useResetMioConfig,
} from '../admin/api/admin.queries';
import { adminApi } from '../admin/api/admin.api';
import { LoadingState, ErrorState, Button } from '../../shared/components';
import {
  Building2, Mail, FileText, Bell, Palette, Download, Bot,
  Save, Upload, X, Check, RotateCcw, Search,
} from 'lucide-react';
import { integrationsApi } from '../integrations/api/integrations.api';

type TabKey = 'firma' | 'email' | 'fakturace' | 'upominky' | 'vzhled' | 'mio' | 'export';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'firma', label: 'Firma & Branding', icon: <Building2 size={15} /> },
  { key: 'email', label: 'Email & Notifikace', icon: <Mail size={15} /> },
  { key: 'fakturace', label: 'Fakturace', icon: <FileText size={15} /> },
  { key: 'upominky', label: 'Upomínky', icon: <Bell size={15} /> },
  { key: 'vzhled', label: 'Vzhled', icon: <Palette size={15} /> },
  { key: 'mio', label: 'Mio Governance', icon: <Bot size={15} /> },
  { key: 'export', label: 'Záloha dat', icon: <Download size={15} /> },
];

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useTenantSettings();
  const updateMutation = useUpdateSettings();
  const [tab, setTab] = useState<TabKey>('firma');
  const [saved, setSaved] = useState(false);

  if (isLoading) return <LoadingState text="Načítám nastavení..." />;
  if (error) return <ErrorState message="Nepodařilo se načíst nastavení." />;

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    await updateMutation.mutateAsync(data);
    showSaved();
  };

  return (
    <div data-testid="settings-page" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      <nav className="settings-sidenav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`settings-sidenav__item${tab === t.key ? ' active' : ''}`}
            data-testid={`settings-tab-${t.key}`}
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
            <Check size={14} /> Uloženo
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
  const [aresLoading, setAresLoading] = useState(false);
  const [aresError, setAresError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleAres = async () => {
    const ico = form.companyNumber;
    if (!ico || ico.length < 8) { setAresError('Zadejte platné IČ (8 číslic)'); return; }
    setAresLoading(true); setAresError('');
    try {
      const data = await integrationsApi.ares.lookupByIco(ico);
      if (data) {
        setForm((f) => ({
          ...f,
          orgName: data.nazev || f.orgName,
          vatNumber: data.dic || f.vatNumber,
          orgStreet: data.textovaAdresa || f.orgStreet,
          orgCity: data.adresa.obec || f.orgCity,
          orgZip: data.adresa.psc || f.orgZip,
        }));
      } else {
        setAresError('IČ nenalezeno v ARES');
      }
    } catch { setAresError('Chyba při ověřování v ARES'); }
    finally { setAresLoading(false); }
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Logo musí být menší než 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => onSave({ ...form, logoBase64: logo });

  return (
    <div>
      <SectionCard title="Firemní údaje">
        <div className="settings-grid">
          <FormField label="Název organizace *" value={form.orgName} onChange={set('orgName')} />
          <div>
            <label className="settings-label">IČO</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="settings-input" value={form.companyNumber} onChange={set('companyNumber')} style={{ flex: 1 }} />
              <button type="button" onClick={handleAres} disabled={aresLoading}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                <Search size={13} /> {aresLoading ? '...' : 'ARES'}
              </button>
            </div>
            {aresError && <div style={{ color: 'var(--danger, #ef4444)', fontSize: '0.78rem', marginTop: 2 }}>{aresError}</div>}
          </div>
          <FormField label="DIČ" value={form.vatNumber} onChange={set('vatNumber')} />
          <FormField label="Email" value={form.orgEmail} onChange={set('orgEmail')} type="email" />
          <FormField label="Telefon" value={form.orgPhone} onChange={set('orgPhone')} />
          <FormField label="Web" value={form.orgWeb} onChange={set('orgWeb')} />
        </div>
      </SectionCard>

      <SectionCard title="Adresa sídla">
        <div className="settings-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Ulice a číslo" value={form.orgStreet} onChange={set('orgStreet')} />
          </div>
          <FormField label="Město" value={form.orgCity} onChange={set('orgCity')} />
          <FormField label="PSČ" value={form.orgZip} onChange={set('orgZip')} />
          <FormField label="Stát" value={form.orgCountry} onChange={set('orgCountry')} />
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
      <SectionCard title="Odchozí email">
        <div className="settings-grid">
          <FormField label="Odesílatel (From)" value={form.emailFrom} onChange={setField('emailFrom')} placeholder="noreply@example.com" />
          <FormField label="Reply-To" value={form.emailReplyTo} onChange={setField('emailReplyTo')} placeholder="info@example.com" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="settings-label">Podpis emailu</label>
          <textarea
            className="settings-textarea"
            rows={3}
            value={form.emailSignature}
            onChange={setField('emailSignature')}
            placeholder="S pozdravem, Vaše správa nemovitostí"
          />
        </div>
      </SectionCard>

      <SectionCard title="Notifikace">
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Zapněte/vypněte emailové notifikace pro jednotlivé události.
        </p>
        <ToggleRow label="Nový Helpdesk požadavek" checked={form.notifNewTicket} onToggle={toggle('notifNewTicket')} />
        <ToggleRow label="Přiřazení pracovního úkolu" checked={form.notifWoAssigned} onToggle={toggle('notifWoAssigned')} />
        <ToggleRow label="Expirace smlouvy" checked={form.notifContractExp} onToggle={toggle('notifContractExp')} />
        <ToggleRow label="Kalibrace měřidla" checked={form.notifMeterDue} onToggle={toggle('notifMeterDue')} />
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
      <SectionCard title="Číslovací řady">
        <div className="settings-grid">
          <FormField label="Prefix faktur" value={form.invoicePrefix} onChange={set('invoicePrefix')} placeholder="FV" />
          <FormField label="Prefix smluv" value={form.contractPrefix} onChange={set('contractPrefix')} placeholder="SM" />
        </div>
      </SectionCard>

      <SectionCard title="Finanční parametry">
        <div className="settings-grid">
          <div>
            <label className="settings-label">Splatnost (dny)</label>
            <input className="settings-input" type="number" min={1} max={90} value={form.invoiceDueDays} onChange={setNum('invoiceDueDays')} />
          </div>
          <div>
            <label className="settings-label">Výchozí DPH (%)</label>
            <input className="settings-input" type="number" min={0} max={100} value={form.defaultVat} onChange={setNum('defaultVat')} />
          </div>
          <div>
            <label className="settings-label">Měna</label>
            <select className="settings-input" value={form.currency} onChange={set('currency')}>
              <option value="CZK">CZK - Česká koruna</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dolar</option>
            </select>
          </div>
          <FormField label="Bankovní účet" value={form.bankAccount} onChange={set('bankAccount')} placeholder="12345678/0100" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="settings-label">Patička faktury</label>
          <textarea className="settings-textarea" rows={2} value={form.invoiceFooter} onChange={set('invoiceFooter')} placeholder="Děkujeme za včasnou platbu." />
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
    reminderText1: s.reminderText1 ?? 'Vážený nájemníku, upozorňujeme Vás na blížící se splatnost platby.',
    reminderText2: s.reminderText2 ?? 'Druhá upomínka: Vaše platba je po splatnosti. Prosíme o neprodlené uhrazení.',
  });

  return (
    <div>
      <SectionCard title="Nastavení upomínek">
        <div style={{ maxWidth: 400 }}>
          <label className="settings-label">Počet dnů před splatností</label>
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

      <SectionCard title="Text 1. upomínky">
        <textarea
          className="settings-textarea"
          rows={3}
          value={form.reminderText1}
          onChange={(e) => setForm((p) => ({ ...p, reminderText1: e.target.value }))}
        />
      </SectionCard>

      <SectionCard title="Text 2. upomínky">
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
    { label: 'Zelená', color: '#22c55e' },
    { label: 'Modrá', color: '#3b82f6' },
    { label: 'Červená', color: '#ef4444' },
    { label: 'Oranžová', color: '#f97316' },
    { label: 'Fialová', color: '#a855f7' },
  ];

  return (
    <div>
      <SectionCard title="Primární barva">
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

      <SectionCard title="Téma">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['light', 'dark', 'system'] as const).map((m) => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem' }}>
              <input
                type="radio"
                name="themeMode"
                checked={form.themeMode === m}
                onChange={() => setForm((p) => ({ ...p, themeMode: m }))}
              />
              {{ light: 'Světlý', dark: 'Tmavý', system: 'Dle systému' }[m]}
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
          Exportujte všechna data Vaší organizace do JSON souboru. Export obsahuje nemovitosti,
          nájemníky, smlouvy, work ordery, měřidla, transakce, dokumenty a události kalendáře.
        </p>
        <Button onClick={handleExport} disabled={exporting}>
          <Download size={15} />
          {exporting ? 'Exportuji...' : 'Stáhnout JSON export'}
        </Button>
      </SectionCard>

      <div className="settings-danger-zone">
        <h4>Nebezpečná zóna</h4>
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Před jakoukoli destruktivní akcí si vždy vytvořte zálohu.
        </p>
        <button
          className="btn btn--danger"
          onClick={() => alert('Smazání dat není v této verzi k dispozici. Kontaktujte podporu.')}
        >
          Smazat všechna data
        </button>
      </div>
    </div>
  );
}

/* ─── MIO GOVERNANCE ────────────────────────────────────────────────── */

function MioGovernanceTab() {
  const { data: config, isLoading } = useMioConfig();
  const { data: meta } = useMioConfigMeta();
  const { data: defaults } = useMioConfigDefaults();
  const updateMut = useUpdateMioConfig();
  const resetMut = useResetMioConfig();
  const [toast, setToast] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<any>(null);

  if (isLoading || !config) return <LoadingState text="Načítání Mio konfigurace..." />;

  // Initialize local state on first render
  if (!localConfig && config) {
    setLocalConfig(JSON.parse(JSON.stringify(config)));
    return null;
  }

  // Metadata-driven rendering (fallback to config keys if meta not loaded yet)
  const findingsMeta: { code: string; label: string; description: string; impact: string }[] =
    meta?.findings ?? Object.keys(localConfig.enabledFindings).map((code: string) => ({
      code, label: code, description: '', impact: '',
    }));
  const recsMeta: { code: string; label: string; description: string; impact: string }[] =
    meta?.recommendations ?? Object.keys(localConfig.enabledRecommendations).map((code: string) => ({
      code, label: code, description: '', impact: '',
    }));
  const thresholdsMeta: Record<string, { label: string; description: string; min: number; max: number; step: number; defaultValue: number }> =
    meta?.thresholds ?? {};
  const dashMeta: Record<string, { label: string; description: string; impact: string }> =
    meta?.dashboard ?? {};
  const autoTicketDescs: Record<string, string> = meta?.autoTicketDescriptions ?? {};

  const isDirty = JSON.stringify(localConfig) !== JSON.stringify(config);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggleFinding = (code: string) => {
    setLocalConfig((c: any) => ({
      ...c,
      enabledFindings: { ...c.enabledFindings, [code]: !(c.enabledFindings[code] !== false) },
    }));
  };

  const toggleRecommendation = (code: string) => {
    setLocalConfig((c: any) => ({
      ...c,
      enabledRecommendations: { ...c.enabledRecommendations, [code]: !(c.enabledRecommendations[code] !== false) },
    }));
  };

  const toggleAutoTicket = (code: string) => {
    setLocalConfig((c: any) => ({
      ...c,
      autoTicketPolicy: { ...c.autoTicketPolicy, [code]: !c.autoTicketPolicy[code] },
    }));
  };

  const setThreshold = (key: string, raw: string) => {
    const meta = thresholdsMeta[key];
    let value = parseInt(raw, 10);
    if (isNaN(value)) value = meta?.defaultValue ?? 0;
    if (meta) {
      if (value < meta.min) value = meta.min;
      if (value > meta.max) value = meta.max;
    }
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
    try {
      const result = await updateMut.mutateAsync(localConfig);
      setLocalConfig(JSON.parse(JSON.stringify(result)));
      showToast('Uloženo');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Chyba při ukládání');
    }
  };

  const handleResetSection = async (section: string, label: string) => {
    if (!confirm(`Obnovit "${label}" na výchozí nastavení?`)) return;
    try {
      const result = await resetMut.mutateAsync(section);
      setLocalConfig(JSON.parse(JSON.stringify(result)));
      showToast(`${label} — obnoveno na výchozí`);
    } catch {
      showToast('Chyba při obnově');
    }
  };

  const handleResetAll = async () => {
    if (!confirm('Obnovit CELOU Mio konfiguraci na výchozí nastavení systému?')) return;
    try {
      const result = await resetMut.mutateAsync(undefined);
      setLocalConfig(JSON.parse(JSON.stringify(result)));
      showToast('Celá konfigurace obnovena na výchozí');
    } catch {
      showToast('Chyba při obnově');
    }
  };

  return (
    <div>
      {toast && (
        <div className="settings-saved-toast">
          <Check size={14} /> {toast}
        </div>
      )}

      {/* ── Findings ──────────────────────────────────────────────── */}
      <GovSectionCard
        title="Upozornění"
        description="Určuje, které typy zjištění bude Mio vyhodnocovat. Po vypnutí se nové záznamy daného typu nebudou vytvářet."
        onReset={() => handleResetSection('enabledFindings', 'Upozornění')}
      >
        {findingsMeta.map(rule => (
          <GovToggleRow
            key={rule.code}
            label={rule.label}
            code={rule.code}
            description={rule.description}
            checked={localConfig.enabledFindings[rule.code] !== false}
            onToggle={() => toggleFinding(rule.code)}
          />
        ))}
      </GovSectionCard>

      {/* ── Recommendations ───────────────────────────────────────── */}
      <GovSectionCard
        title="Doporučení"
        description="Určuje, která doporučení se mohou zobrazovat uživatelům."
        onReset={() => handleResetSection('enabledRecommendations', 'Doporučení')}
      >
        {recsMeta.map(rule => (
          <GovToggleRow
            key={rule.code}
            label={rule.label}
            code={rule.code}
            description={rule.description}
            checked={localConfig.enabledRecommendations[rule.code] !== false}
            onToggle={() => toggleRecommendation(rule.code)}
          />
        ))}
      </GovSectionCard>

      {/* ── Auto-ticket ───────────────────────────────────────────── */}
      <GovSectionCard
        title="Automatické zakládání požadavků"
        description="Určuje, zda se z daného zjištění automaticky založí požadavek v Helpdesku. Zjištění se stále zobrazí, ale nevznikne ticket."
        onReset={() => handleResetSection('autoTicketPolicy', 'Automatické zakládání')}
      >
        {findingsMeta.map(rule => (
          <GovToggleRow
            key={rule.code}
            label={rule.label}
            code={rule.code}
            description={autoTicketDescs[rule.code] ?? ''}
            checked={localConfig.autoTicketPolicy[rule.code] === true}
            onToggle={() => toggleAutoTicket(rule.code)}
          />
        ))}
      </GovSectionCard>

      {/* ── Thresholds ────────────────────────────────────────────── */}
      <GovSectionCard
        title="Prahy a citlivost"
        description="Nastavte prahy, při kterých se doporučení začnou zobrazovat. Hodnoty ovlivňují citlivost Mio doporučení."
        onReset={() => handleResetSection('thresholds', 'Prahy')}
      >
        {Object.entries(localConfig.thresholds).map(([key, value]) => {
          const tm = thresholdsMeta[key];
          return (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 500 }}>{tm?.label ?? key}</div>
                  {tm?.description && (
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{tm.description}</div>
                  )}
                </div>
                <input
                  className="settings-input"
                  type="number"
                  min={tm?.min ?? 0}
                  max={tm?.max ?? 9999}
                  step={tm?.step ?? 1}
                  style={{ width: 90 }}
                  value={value as number}
                  onChange={(e) => setThreshold(key, e.target.value)}
                />
              </div>
              {tm && defaults && (
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2, textAlign: 'right' }}>
                  Výchozí: {tm.defaultValue}
                  {' · '}rozsah: {tm.min}–{tm.max}
                </div>
              )}
            </div>
          );
        })}
      </GovSectionCard>

      {/* ── Dashboard ─────────────────────────────────────────────── */}
      <GovSectionCard
        title="Dashboard"
        description="Ovládejte, které Mio sekce se zobrazí na hlavním dashboardu. Data zůstanou vždy dostupná v Mio Insights."
        onReset={() => handleResetSection('dashboard', 'Dashboard')}
      >
        {Object.entries(localConfig.dashboard).map(([key, value]) => {
          const dm = dashMeta[key];
          return (
            <GovToggleRow
              key={key}
              label={dm?.label ?? key}
              description={dm?.impact ?? ''}
              checked={value as boolean}
              onToggle={() => toggleDashboard(key)}
            />
          );
        })}
      </GovSectionCard>

      {/* ── Digest ──────────────────────────────────────────────── */}
      {localConfig.digest && (
        <GovSectionCard
          title="E-mailové přehledy Mio"
          description="Nastavení automatických e-mailových souhrnů Mio zjištění a doporučení pro uživatele organizace."
          onReset={() => handleResetSection('digest', 'E-mailové přehledy')}
        >
          <GovToggleRow
            label="Zapnout e-mailové přehledy"
            description="Po vypnutí se žádný uživatel v organizaci nedostane Mio digest."
            checked={localConfig.digest.enabled !== false}
            onToggle={() => setLocalConfig((c: any) => ({ ...c, digest: { ...c.digest, enabled: !c.digest.enabled } }))}
          />
          <GovToggleRow
            label="Zahrnout upozornění"
            description="Vypnutím se ze souhrnu odstraní sekce s upozorněními."
            checked={localConfig.digest.includeFindings !== false}
            onToggle={() => setLocalConfig((c: any) => ({ ...c, digest: { ...c.digest, includeFindings: !c.digest.includeFindings } }))}
          />
          <GovToggleRow
            label="Zahrnout doporučení"
            description="Vypnutím se ze souhrnu odstraní sekce s doporučeními."
            checked={localConfig.digest.includeRecommendations !== false}
            onToggle={() => setLocalConfig((c: any) => ({ ...c, digest: { ...c.digest, includeRecommendations: !c.digest.includeRecommendations } }))}
          />
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <div style={{ fontSize: '.85rem', fontWeight: 500, marginBottom: 4 }}>Výchozí frekvence</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Uživatel si může frekvenci změnit ve svém profilu.</div>
            <select
              className="settings-input"
              style={{ width: 200 }}
              value={localConfig.digest.defaultFrequency ?? 'daily'}
              onChange={(e) => setLocalConfig((c: any) => ({ ...c, digest: { ...c.digest, defaultFrequency: e.target.value } }))}
            >
              <option value="daily">Denně</option>
              <option value="weekly">Týdně (pondělí)</option>
              <option value="off">Vypnuto</option>
            </select>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '.85rem', fontWeight: 500, marginBottom: 4 }}>Minimální závažnost</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Zahrnout pouze zjištění s touto nebo vyšší závažností.</div>
            <select
              className="settings-input"
              style={{ width: 200 }}
              value={localConfig.digest.minSeverity ?? 'info'}
              onChange={(e) => setLocalConfig((c: any) => ({ ...c, digest: { ...c.digest, minSeverity: e.target.value } }))}
            >
              <option value="info">Vše (info a výše)</option>
              <option value="warning">Varování a kritická</option>
              <option value="critical">Jen kritická</option>
            </select>
          </div>
        </GovSectionCard>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="settings-footer" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button onClick={handleSave} disabled={updateMut.isPending || !isDirty}>
          <Save size={15} />
          {updateMut.isPending ? 'Ukládám...' : isDirty ? 'Uložit změny' : 'Uloženo'}
        </Button>
        <button
          className="btn btn--sm btn--ghost"
          onClick={handleResetAll}
          disabled={resetMut.isPending}
          style={{ fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <RotateCcw size={13} />
          Obnovit vše na výchozí
        </button>
      </div>
    </div>
  );
}

function GovSectionCard({ title, description, onReset, children }: {
  title: string; description: string; onReset: () => void; children: React.ReactNode;
}) {
  return (
    <div className="settings-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h3 className="settings-card__title" style={{ marginBottom: 4 }}>{title}</h3>
          <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: 0 }}>{description}</p>
        </div>
        <button
          className="btn btn--sm btn--ghost"
          onClick={onReset}
          title="Obnovit výchozí nastavení sekce"
          style={{ fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
        >
          <RotateCcw size={12} /> Výchozí
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        {children}
      </div>
    </div>
  );
}

function GovToggleRow({ label, code, description, checked, onToggle }: {
  label: string; code?: string; description?: string; checked: boolean; onToggle: () => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label className="settings-toggle-row">
        <div
          className={`settings-toggle${checked ? ' active' : ''}`}
          onClick={onToggle}
          role="switch"
          aria-checked={checked}
        >
          <div className="settings-toggle__thumb" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '.85rem' }}>{label}</span>
          {code && <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>{code}</span>}
        </div>
      </label>
      {description && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginLeft: 44, marginTop: -2 }}>
          {description}
        </div>
      )}
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
        {saving ? 'Ukládám...' : 'Uložit změny'}
      </Button>
    </div>
  );
}

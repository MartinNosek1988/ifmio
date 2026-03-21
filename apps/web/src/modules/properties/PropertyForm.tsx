import { useState, lazy, Suspense } from 'react';
import { Modal, Button } from '../../shared/components';
import { useCreateProperty, useUpdateProperty } from './use-properties';
import type { ApiProperty, PropertyLegalMode, AccountingSystemType } from './properties-api';
import { ChevronDown, ChevronUp, Info, Search, Upload, Pencil } from 'lucide-react';
import { integrationsApi } from '../integrations/api/integrations.api';

const CuzkImportTab = lazy(() => import('./CuzkImportTab'));

interface Props {
  property?: ApiProperty;
  onClose: () => void;
}

const PROPERTY_TYPES = [
  { value: 'bytdum', label: 'Bytový dům' },
  { value: 'roddum', label: 'Rodinný dům' },
  { value: 'komer', label: 'Komerční' },
  { value: 'prumysl', label: 'Průmyslový' },
  { value: 'pozemek', label: 'Pozemek' },
  { value: 'garaz', label: 'Garáž' },
];

const OWNERSHIP_TYPES = [
  { value: 'vlastnictvi', label: 'Vlastnictví' },
  { value: 'druzstvo', label: 'Družstvo' },
  { value: 'pronajem', label: 'Pronájem' },
];

const LEGAL_MODES: { value: PropertyLegalMode; label: string }[] = [
  { value: 'SVJ', label: 'SVJ (Společenství vlastníků)' },
  { value: 'BD', label: 'Bytové družstvo' },
  { value: 'RENTAL', label: 'Pronájem' },
  { value: 'OWNERSHIP', label: 'Vlastnictví' },
  { value: 'OTHER', label: 'Jiná' },
];

const ACCOUNTING_SYSTEMS: { value: AccountingSystemType; label: string }[] = [
  { value: 'NONE', label: 'Bez napojení' },
  { value: 'POHODA', label: 'Pohoda' },
  { value: 'MONEY_S3', label: 'Money S3' },
  { value: 'PREMIER', label: 'Premier' },
  { value: 'VARIO', label: 'Vario' },
];

const LEGAL_MODE_LABEL: Record<string, string> = {
  SVJ: 'SVJ', BD: 'Bytové družstvo', RENTAL: 'Pronájem', OWNERSHIP: 'Vlastnictví', OTHER: 'Jiná',
};

export { LEGAL_MODE_LABEL };

export default function PropertyForm({ property, onClose }: Props) {
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();
  const isEdit = !!property;
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');

  const [form, setForm] = useState({
    name: property?.name || '',
    address: property?.address || '',
    city: property?.city || '',
    postalCode: property?.postalCode || '',
    type: property?.type || 'bytdum',
    ownership: property?.ownership || 'vlastnictvi',
    legalMode: (property?.legalMode || 'OWNERSHIP') as PropertyLegalMode,
    ico: property?.ico || '',
    dic: property?.dic || '',
    isVatPayer: property?.isVatPayer || false,
    managedFrom: property?.managedFrom ? property.managedFrom.slice(0, 10) : '',
    managedTo: property?.managedTo ? property.managedTo.slice(0, 10) : '',
    accountingSystem: (property?.accountingSystem || 'NONE') as AccountingSystemType,
    cadastralArea: property?.cadastralArea || '',
    landRegistrySheet: property?.landRegistrySheet || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSprava, setShowSprava] = useState(!!property?.managedFrom || !!property?.accountingSystem);
  const [aresLoading, setAresLoading] = useState(false);
  const [aresError, setAresError] = useState('');
  const [aresSuccess, setAresSuccess] = useState('');

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const [aresDefunct, setAresDefunct] = useState('');

  const handleAres = async () => {
    if (!form.ico || form.ico.length < 8) { setAresError('Zadejte platné IČ (8 číslic)'); return; }
    setAresLoading(true); setAresError(''); setAresDefunct(''); setAresSuccess('');
    try {
      const data = await integrationsApi.ares.lookupByIco(form.ico);
      if (data) {
        // Build address from ARES parts
        let addr = '';
        if (data.adresa.ulice) {
          addr = data.adresa.ulice;
          if (data.adresa.cisloPopisne) addr += ` ${data.adresa.cisloPopisne}`;
          if (data.adresa.cisloOrientacni) addr += `/${data.adresa.cisloOrientacni}`;
        } else if (data.textovaAdresa) {
          addr = data.textovaAdresa;
        }
        setForm((f) => ({
          ...f,
          dic: data.dic ?? f.dic,
          name: data.nazev || f.name,
          address: addr || f.address,
          city: data.adresa.obec || f.city,
          postalCode: data.adresa.psc || f.postalCode,
        }));
        if (data.datumZaniku) {
          setAresDefunct(data.datumZaniku);
        }
        const filled: string[] = [];
        if (data.nazev) filled.push('název');
        if (addr) filled.push('adresa');
        if (data.adresa.obec) filled.push('město');
        if (data.adresa.psc) filled.push('PSČ');
        if (data.dic) filled.push('DIČ');
        setAresSuccess(filled.length ? `ARES: načteno (${filled.join(', ')})` : 'ARES: subjekt nalezen');
      } else {
        setAresError('IČ nenalezeno v ARES');
      }
    } catch (err) {
      console.error('ARES lookup failed:', err);
      setAresError('Chyba při ověřování v ARES');
    }
    finally { setAresLoading(false); }
  };

  const showIcoFields = ['SVJ', 'BD', 'OTHER'].includes(form.legalMode);
  const showDicFields = showIcoFields && form.ico.length > 0;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    if (!form.address.trim()) errs.address = 'Adresa je povinná';
    if (!form.city.trim()) errs.city = 'Město je povinné';
    if (!form.postalCode.trim()) errs.postalCode = 'PSČ je povinné';
    if (form.ico && !/^\d{0,8}$/.test(form.ico)) errs.ico = 'IČ musí být max 8 číslic';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = {
      name: form.name,
      address: form.address,
      city: form.city,
      postalCode: form.postalCode,
      type: form.type,
      ownership: form.ownership,
      legalMode: form.legalMode,
      ico: form.ico || null,
      dic: form.dic || null,
      isVatPayer: form.isVatPayer,
      managedFrom: form.managedFrom || null,
      managedTo: form.managedTo || null,
      accountingSystem: form.accountingSystem !== 'NONE' ? form.accountingSystem : null,
      cadastralArea: form.cadastralArea || null,
      landRegistrySheet: form.landRegistrySheet || null,
    };
    if (isEdit) {
      await updateMutation.mutateAsync({ id: property!.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputStyle = (field?: string): React.CSSProperties => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)',
    boxSizing: 'border-box',
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Upravit nemovitost' : 'Nová nemovitost'}
      footer={activeTab === 'manual' ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending} data-testid="property-form-save">
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      ) : undefined}
    >
      {/* Tab switcher (only for create mode) */}
      {!isEdit && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1, padding: '8px 14px', borderRadius: 6, fontSize: '.85rem', fontWeight: 600, cursor: 'pointer',
              border: activeTab === 'manual' ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border)',
              background: activeTab === 'manual' ? 'var(--primary, #6366f1)' : 'transparent',
              color: activeTab === 'manual' ? '#fff' : 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Pencil size={14} /> Ruční zadání
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              flex: 1, padding: '8px 14px', borderRadius: 6, fontSize: '.85rem', fontWeight: 600, cursor: 'pointer',
              border: activeTab === 'import' ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border)',
              background: activeTab === 'import' ? 'var(--primary, #6366f1)' : 'transparent',
              color: activeTab === 'import' ? '#fff' : 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Upload size={14} /> Import z katastru
          </button>
        </div>
      )}

      {/* Import tab */}
      {!isEdit && activeTab === 'import' && (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Načítání...</div>}>
          <CuzkImportTab onClose={onClose} />
        </Suspense>
      )}

      {/* Manual form (original content) */}
      {activeTab === 'manual' && <>
      {/* ── Základní údaje ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">Typ nemovitosti</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)} style={inputStyle()}>
            {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Typ vlastnictví</label>
          <select value={form.ownership} onChange={(e) => set('ownership', e.target.value)} style={inputStyle()}>
            {OWNERSHIP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Název *</label>
        <input data-testid="property-form-name" value={form.name} onChange={(e) => set('name', e.target.value)} style={inputStyle('name')} />
        {errors.name && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Adresa *</label>
        <input data-testid="property-form-address" value={form.address} onChange={(e) => set('address', e.target.value)} style={inputStyle('address')} />
        {errors.address && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.address}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">Město *</label>
          <input data-testid="property-form-city" value={form.city} onChange={(e) => set('city', e.target.value)} style={inputStyle('city')} />
          {errors.city && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.city}</div>}
        </div>
        <div>
          <label className="form-label">PSČ *</label>
          <input data-testid="property-form-zip" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} style={inputStyle('postalCode')} />
          {errors.postalCode && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.postalCode}</div>}
        </div>
      </div>

      {/* ── Právní režim ────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Právní režim</h4>
          <span title="Určuje chování systému — SVJ vyžaduje nepřetržité vlastnictví">
            <Info size={14} style={{ color: 'var(--text-muted)' }} />
          </span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Právní forma *</label>
          <select
            value={form.legalMode}
            onChange={(e) => set('legalMode', e.target.value)}
            style={{ ...inputStyle(), fontWeight: 500 }}
          >
            {LEGAL_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {showIcoFields && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">IČ</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={form.ico}
                  onChange={(e) => set('ico', e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="např. 01234567"
                  maxLength={8}
                  style={{ ...inputStyle('ico'), flex: 1 }}
                />
                <button type="button" onClick={handleAres} disabled={aresLoading || isPending}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <Search size={13} /> {aresLoading ? '...' : 'ARES'}
                </button>
              </div>
              {aresError && <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: 2 }}>{aresError}</div>}
              {aresSuccess && <div style={{ color: 'var(--success, #22c55e)', fontSize: '0.78rem', marginTop: 2 }}>{aresSuccess}</div>}
              {aresDefunct && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 4, padding: '4px 8px', color: 'var(--danger)', fontSize: '0.78rem', marginTop: 4 }}>Subjekt je zaniklý dle ARES ({aresDefunct})</div>}
              {errors.ico && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.ico}</div>}
            </div>
            {showDicFields && (
              <div>
                <label className="form-label">DIČ</label>
                <input
                  value={form.dic}
                  onChange={(e) => set('dic', e.target.value.slice(0, 12))}
                  placeholder="např. CZ01234567"
                  maxLength={12}
                  style={inputStyle()}
                />
              </div>
            )}
          </div>
        )}

        {showDicFields && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={form.isVatPayer}
              onChange={(e) => set('isVatPayer', e.target.checked)}
            />
            Plátce DPH
          </label>
        )}
      </div>

      {/* ── Správa (collapsible) ────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button
          onClick={() => setShowSprava(!showSprava)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, padding: 0, marginBottom: showSprava ? 12 : 0,
          }}
        >
          Správa a účetnictví
          {showSprava ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showSprava && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="form-label">Ve správě od</label>
                <input type="date" value={form.managedFrom} onChange={(e) => set('managedFrom', e.target.value)} style={inputStyle()} />
              </div>
              <div>
                <label className="form-label">Ve správě do</label>
                <input type="date" value={form.managedTo} onChange={(e) => set('managedTo', e.target.value)} style={inputStyle()} />
              </div>
            </div>
            {form.managedTo && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', color: '#b45309', marginBottom: 12 }}>
                Nemovitost bude označena jako vyřazená ze správy.
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Účetní systém</label>
              <select value={form.accountingSystem} onChange={(e) => set('accountingSystem', e.target.value)} style={inputStyle()}>
                {ACCOUNTING_SYSTEMS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="form-label">Katastrální území</label>
                <input value={form.cadastralArea} onChange={(e) => set('cadastralArea', e.target.value)} placeholder="např. Vysočany" style={inputStyle()} />
              </div>
              <div>
                <label className="form-label">List vlastnictví (LV)</label>
                <input value={form.landRegistrySheet} onChange={(e) => set('landRegistrySheet', e.target.value)} placeholder="např. 1234" style={inputStyle()} />
              </div>
            </div>
          </div>
        )}
      </div>

      {(createMutation.error || updateMutation.error) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
          Nepodařilo se uložit nemovitost.
        </div>
      )}
      </>}
    </Modal>
  );
}

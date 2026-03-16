import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Badge } from '../../shared/components';
import { propertiesApi } from './properties-api';
import { residentsApi } from '../residents/api/residents.api';
import type { ApiOccupancy } from './properties-api';

interface Props {
  propertyId: string;
  unitId: string;
  unitName: string;
  propertyLegalMode?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
  color: 'var(--text)', boxSizing: 'border-box',
};

const hintStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 };

export default function OccupancyForm({ propertyId, unitId, unitName, propertyLegalMode, onSuccess, onClose }: Props) {
  const qc = useQueryClient();

  // Fetch unit detail (includes all occupancies)
  const { data: unitDetail } = useQuery({
    queryKey: ['unit-detail', propertyId, unitId],
    queryFn: () => propertiesApi.getUnit(propertyId, unitId),
  });

  // Fetch residents for this property
  const { data: residentsData } = useQuery({
    queryKey: ['residents', { propertyId, limit: 200 }],
    queryFn: () => residentsApi.list({ propertyId, limit: 200 }),
  });

  const occupancies: ApiOccupancy[] = (unitDetail as any)?.occupancies ?? [];
  const activeOccupancies = occupancies.filter((o) => o.isActive);
  const residents = residentsData?.data ?? [];
  const showShare = propertyLegalMode === 'SVJ' || propertyLegalMode === 'BD';
  const showPrimaryPayer = activeOccupancies.length > 0;

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    residentId: '',
    role: 'owner' as 'owner' | 'tenant' | 'member',
    startDate: today,
    endDate: '',
    ownershipShare: '',
    personCount: '',
    isPrimaryPayer: true,
    variableSymbol: '',
    note: '',
  });
  const [error, setError] = useState('');

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const createMut = useMutation({
    mutationFn: () => {
      const share = form.ownershipShare ? parseFloat(form.ownershipShare) : undefined;
      return propertiesApi.createOccupancy(propertyId, unitId, {
        residentId: form.residentId,
        role: form.role,
        startDate: form.startDate,
        endDate: form.endDate || null,
        ownershipShare: share != null && !isNaN(share) ? share / 100 : null,
        personCount: form.personCount ? parseInt(form.personCount) : null,
        isPrimaryPayer: form.isPrimaryPayer,
        variableSymbol: form.variableSymbol || null,
        note: form.note || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties', propertyId] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['unit-detail', propertyId, unitId] });
      onSuccess();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? String(err);
      if (msg.includes('mezera') || msg.includes('gap') || msg.includes('bez vlastníka')) setError('SVJ jednotka nemůže mít období bez vlastníka.');
      else if (msg.includes('podíl') || msg.includes('share') || msg.includes('100')) setError('Součet podílů vlastníků překračuje 100%.');
      else if (msg.includes('variabilní') || msg.includes('VS') || msg.includes('Unique')) setError('Variabilní symbol již existuje.');
      else setError(msg);
    },
  });

  const endMut = useMutation({
    mutationFn: (occupancyId: string) => propertiesApi.endOccupancy(propertyId, unitId, occupancyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-detail', propertyId, unitId] });
      qc.invalidateQueries({ queryKey: ['properties', propertyId] });
    },
  });

  // Auto-generate VS
  const [vsGenerating, setVsGenerating] = useState(false);
  const handleGenerateVs = async () => {
    // Use next sequential — the backend auto-generates on create, but for preview we simulate
    setVsGenerating(true);
    try {
      // Create a temp occupancy isn't possible, so just generate client-side preview
      const existing = occupancies.filter(o => o.variableSymbol).map(o => parseInt(o.variableSymbol ?? '0', 10)).filter(n => !isNaN(n));
      const max = existing.length > 0 ? Math.max(...existing) : 0;
      set('variableSymbol', String(max + 1).padStart(6, '0'));
    } finally { setVsGenerating(false); }
  };

  const handleSubmit = () => {
    setError('');
    if (!form.residentId) { setError('Vyberte rezidenta'); return; }
    if (!form.startDate) { setError('Zadejte datum od'); return; }
    createMut.mutate();
  };

  const residentLabel = (r: any) => {
    if (r.isLegalEntity && r.companyName) return `${r.companyName} (${r.lastName})`;
    return `${r.lastName} ${r.firstName}`;
  };

  return (
    <Modal open onClose={onClose} wide title={`Přiřadit vlastníka/nájemce — ${unitName}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending ? 'Ukládám...' : 'Přiřadit'}
          </Button>
        </div>
      }
    >
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

      {/* Resident selector */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Rezident *</label>
        <select value={form.residentId} onChange={(e) => set('residentId', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">-- Vyberte rezidenta --</option>
          {residents.map((r: any) => <option key={r.id} value={r.id}>{residentLabel(r)}</option>)}
        </select>
        {residents.length === 0 && <div style={hintStyle}>Nejprve vytvořte rezidenta v sekci Rezidenti</div>}
      </div>

      {/* Role */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Role</label>
        <select value={form.role} onChange={(e) => set('role', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="owner">Vlastník</option>
          <option value="tenant">Nájemce</option>
          <option value="member">Člen</option>
        </select>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Vlastnictví/nájem od *</label>
          <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="form-label">Vlastnictví/nájem do</label>
          <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} style={inputStyle} />
          <div style={hintStyle}>Prázdné = aktuální vlastník/nájemce</div>
        </div>
      </div>

      {/* Ownership share (SVJ/BD only) */}
      {showShare && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Podíl vlastnictví (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={form.ownershipShare} onChange={(e) => set('ownershipShare', e.target.value)} placeholder="Prázdné = 100%" style={inputStyle} />
          <div style={hintStyle}>Vyplňte jen při spoluvlastnictví. Prázdné = jediný vlastník.</div>
        </div>
      )}

      {/* Person count + primary payer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Počet osob</label>
          <input type="number" min="0" step="1" value={form.personCount} onChange={(e) => set('personCount', e.target.value)} style={inputStyle} />
          <div style={hintStyle}>Přepíše výchozí počet osob jednotky</div>
        </div>
        {showPrimaryPayer && (
          <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isPrimaryPayer} onChange={(e) => set('isPrimaryPayer', e.target.checked)} />
              Primární plátce
            </label>
            <div style={hintStyle}>Obdrží předpisy plateb</div>
          </div>
        )}
      </div>

      {/* VS */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Variabilní symbol</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={form.variableSymbol} onChange={(e) => set('variableSymbol', e.target.value)} placeholder="Automaticky nebo ručně" maxLength={20} style={{ ...inputStyle, flex: 1 }} />
          <button type="button" onClick={handleGenerateVs} disabled={vsGenerating} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            {vsGenerating ? '...' : 'Generovat VS'}
          </button>
        </div>
        <div style={hintStyle}>Unikátní symbol pro párování plateb. Prázdné = auto-generace.</div>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Poznámka</label>
        <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
      </div>

      {/* ── Existing occupancies ──────────────────────────────── */}
      {occupancies.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Vlastníci a nájemci této jednotky</div>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {occupancies.map((occ) => {
              const name = occ.resident
                ? (occ.resident.isLegalEntity && occ.resident.companyName
                  ? occ.resident.companyName
                  : `${occ.resident.lastName} ${occ.resident.firstName}`)
                : '—';
              const isActive = occ.isActive;
              return (
                <div key={occ.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem', opacity: isActive ? 1 : 0.6 }}>
                  <Badge variant={isActive ? 'green' : 'muted'}>{isActive ? 'Aktivní' : 'Ukončen'}</Badge>
                  <span style={{ fontWeight: 500, flex: 1 }}>{name}</span>
                  <span className="text-muted">{new Date(occ.startDate).toLocaleDateString('cs-CZ')}</span>
                  {occ.endDate && <span className="text-muted">– {new Date(occ.endDate).toLocaleDateString('cs-CZ')}</span>}
                  {occ.variableSymbol && <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>VS: {occ.variableSymbol}</span>}
                  {occ.ownershipShare != null && <span className="text-muted">{(Number(occ.ownershipShare) * 100).toFixed(2)}%</span>}
                  {isActive && (
                    <button onClick={() => { if (confirm('Ukončit tento pobyt?')) endMut.mutate(occ.id); }} disabled={endMut.isPending}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.78rem' }}>
                      Ukončit
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useWorkOrderStore, type WorkOrder, type WOStav } from './workorder-store';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate, formatKc } from '../../shared/utils/format';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS, label } from '../../constants/labels';
import { SlaProgressBar } from './SlaProgressBar';

interface Props {
  workOrder: WorkOrder;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const STATUS_COLOR: Record<string, BadgeVariant> = { nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red' };
const PRIO_COLOR: Record<string, BadgeVariant> = { nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red' };

const STAV_TRANSITIONS: Record<WOStav, { stav: WOStav; label: string; variant?: 'primary' }[]> = {
  nova: [{ stav: 'v_reseni', label: 'Zahajit', variant: 'primary' }, { stav: 'zrusena', label: 'Zrusit' }],
  v_reseni: [{ stav: 'vyresena', label: 'Vyresit', variant: 'primary' }, { stav: 'nova', label: 'Zpet' }, { stav: 'zrusena', label: 'Zrusit' }],
  vyresena: [{ stav: 'uzavrena', label: 'Uzavrit', variant: 'primary' }, { stav: 'v_reseni', label: 'Znovu otevrit' }],
  uzavrena: [],
  zrusena: [{ stav: 'nova', label: 'Obnovit' }],
};

export default function WorkOrderDetailModal({ workOrder, onClose, onUpdated }: Props) {
  const { changeStav, addKomentar, update } = useWorkOrderStore();
  const [tab, setTab] = useState<'detail' | 'komentare'>('detail');
  const [komentarText, setKomentarText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    resitel: workOrder.resitel || '',
    priorita: workOrder.priorita,
    terminDo: workOrder.terminDo || '',
    odhadovanaHodiny: workOrder.odhadovanaHodiny?.toString() || '',
    naklady: workOrder.naklady?.toString() || '',
  });

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);

  const propName = (() => {
    const p = properties.find(x => String(x.id) === String(workOrder.propId));
    return String(p?.nazev || p?.name || '');
  })();

  const unitLabel = (() => {
    if (!workOrder.jednotkaId) return null;
    const u = units.find(x => String(x.id) === String(workOrder.jednotkaId));
    return u ? String(u.cislo || u.id) : null;
  })();

  const transitions = STAV_TRANSITIONS[workOrder.stav] || [];

  const handleTransition = (stav: WOStav) => {
    changeStav(workOrder.id, stav);
    onUpdated();
  };

  const handleAddKomentar = () => {
    if (!komentarText.trim()) return;
    addKomentar(workOrder.id, 'current', komentarText.trim());
    setKomentarText('');
    onUpdated();
  };

  const handleSaveEdit = () => {
    update(workOrder.id, {
      resitel: editData.resitel || undefined,
      priorita: editData.priorita,
      terminDo: editData.terminDo || undefined,
      odhadovanaHodiny: editData.odhadovanaHodiny ? Number(editData.odhadovanaHodiny) : undefined,
      naklady: editData.naklady ? Number(editData.naklady) : undefined,
    });
    setEditing(false);
    onUpdated();
  };

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' as const };

  const tabs = ['detail', 'komentare'] as const;
  const tabLabels = { detail: 'Detail', komentare: `Komentare (${workOrder.komentare.length})` };

  return (
    <Modal open onClose={onClose} wide
      title={workOrder.nazev}
      subtitle={<span>{propName}{unitLabel ? ` · Jednotka ${unitLabel}` : ''}</span>}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zavrit</Button>
        </div>
      }>

      {/* Status + Priority + SLA */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge variant={STATUS_COLOR[workOrder.stav] || 'muted'}>{label(WO_STATUS_LABELS, workOrder.stav)}</Badge>
        <Badge variant={PRIO_COLOR[workOrder.priorita] || 'muted'}>{label(WO_PRIORITY_LABELS, workOrder.priorita)}</Badge>
        <div style={{ flex: 1, minWidth: 120 }}>
          <SlaProgressBar created={workOrder.datumVytvoreni} deadline={workOrder.terminDo || ''} status={workOrder.stav} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === 'detail' && (
        <div>
          {/* State transition buttons */}
          {transitions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 6 }}>Zmenit stav:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {transitions.map(t => (
                  <Button key={t.stav} size="sm" variant={t.variant} onClick={() => handleTransition(t.stav)}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <InfoCell label="Vytvoreno" value={formatCzDate(workOrder.datumVytvoreni || workOrder.created_at)} />
            <InfoCell label="Termin" value={workOrder.terminDo ? formatCzDate(workOrder.terminDo) : undefined} />
            {workOrder.datumUzavreni && <InfoCell label="Uzavreno" value={formatCzDate(workOrder.datumUzavreni)} />}
            <InfoCell label="Zadavatel" value={workOrder.zadavatel} />
          </div>

          {/* Editable section */}
          {!editing ? (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
                <InfoCell label="Resitel" value={workOrder.resitel} />
                <InfoCell label="Priorita" value={label(WO_PRIORITY_LABELS, workOrder.priorita)} />
                <InfoCell label="Odhad (hod)" value={workOrder.odhadovanaHodiny?.toString()} />
                <InfoCell label="Naklady" value={workOrder.naklady != null ? formatKc(workOrder.naklady) : undefined} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <Button size="sm" onClick={() => setEditing(true)}>Upravit</Button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="form-label">Resitel</label>
                  <input value={editData.resitel} onChange={e => setEditData(d => ({ ...d, resitel: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Termin</label>
                  <input type="date" value={editData.terminDo} onChange={e => setEditData(d => ({ ...d, terminDo: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Priorita</label>
                  <select value={editData.priorita} onChange={e => setEditData(d => ({ ...d, priorita: e.target.value as typeof d.priorita }))} style={inputStyle}>
                    {Object.entries(WO_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Odhad (hod)</label>
                  <input type="number" min="0" value={editData.odhadovanaHodiny} onChange={e => setEditData(d => ({ ...d, odhadovanaHodiny: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Naklady (Kc)</label>
                  <input type="number" min="0" value={editData.naklady} onChange={e => setEditData(d => ({ ...d, naklady: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Button size="sm" onClick={() => setEditing(false)}>Zrusit</Button>
                <Button size="sm" variant="primary" onClick={handleSaveEdit}>Ulozit</Button>
              </div>
            </div>
          )}

          {/* Description */}
          {workOrder.popis && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Popis</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{workOrder.popis}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'komentare' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <textarea value={komentarText} onChange={e => setKomentarText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddKomentar(); } }}
              placeholder="Pridat komentar... (Enter)" rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }} />
            <div style={{ marginTop: 8 }}>
              <Button variant="primary" size="sm" onClick={handleAddKomentar}>Odeslat</Button>
            </div>
          </div>

          {workOrder.komentare.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Zadne komentare</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...workOrder.komentare].reverse().map(k => (
                <div key={k.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                    {k.autor.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{k.autor}</span>
                      <span className="text-muted text-sm">{formatCzDate(k.datum)}</span>
                    </div>
                    <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{k.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

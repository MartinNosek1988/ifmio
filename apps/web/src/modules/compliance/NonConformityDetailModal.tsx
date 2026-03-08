import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { loadFromStorage, saveToStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';
import { NC_STATUS_LABELS, NC_SEVERITY_LABELS, label } from '../../constants/labels';
import type { NonConformity } from './types';

interface Props {
  item: NonConformity;
  onClose: () => void;
  onUpdated: () => void;
}

const NC_KEY = 'ifmio:non_conformities';

const STAV_COLOR: Record<string, BadgeVariant> = { otevrena: 'red', v_reseni: 'yellow', uzavrena: 'green' };
const ZAV_COLOR: Record<string, BadgeVariant> = { normalni: 'blue', vysoka: 'yellow', kriticka: 'red', nizka: 'muted' };

type Stav = 'otevrena' | 'v_reseni' | 'uzavrena';
const STAVY: Stav[] = ['otevrena', 'v_reseni', 'uzavrena'];

export default function NonConformityDetailModal({ item, onClose, onUpdated }: Props) {
  const [stav, setStav] = useState<string>(item.stav);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const properties = loadFromStorage<Record<string, unknown>[]>('estateos_properties', []);
  const prop = properties.find(p => String(p.id) === String(item.propId));

  const isOverdue = new Date(item.terminNapravy) < new Date() && item.stav !== 'uzavrena';
  const daysLeft = Math.ceil((new Date(item.terminNapravy).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleStavChange = (newStav: string) => {
    setStav(newStav);
    setSaving(true);
    const all = loadFromStorage<NonConformity[]>(NC_KEY, []);
    const updated = all.map(nc =>
      nc.id === item.id ? { ...nc, stav: newStav } : nc
    );
    saveToStorage(NC_KEY, updated);
    setTimeout(() => { setSaving(false); onUpdated(); }, 300);
  };

  const handleDelete = () => {
    const all = loadFromStorage<NonConformity[]>(NC_KEY, []);
    const updated = all.filter(nc => nc.id !== item.id);
    saveToStorage(NC_KEY, updated);
    onUpdated();
    onClose();
  };

  const stavHex = stav === 'uzavrena' ? 'var(--accent-green)' : stav === 'v_reseni' ? 'var(--accent-orange)' : 'var(--danger)';

  return (
    <Modal open onClose={onClose} wide
      title={item.nazev}
      subtitle={`${item.kategorie}${prop ? ` · ${String(prop.nazev || prop.name)}` : ''}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
          <div>
            {!confirmDelete ? (
              <Button onClick={() => setConfirmDelete(true)} style={{ color: 'var(--danger)' }}>Smazat</Button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Opravdu?</span>
                <Button onClick={handleDelete} style={{ color: 'var(--danger)' }}>Ano</Button>
                <Button onClick={() => setConfirmDelete(false)}>Ne</Button>
              </div>
            )}
          </div>
          <Button onClick={onClose}>Zavrit</Button>
        </div>
      }>

      {/* Color bar */}
      <div style={{ height: 4, background: stavHex, borderRadius: 2, marginBottom: 14 }} />

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge variant={STAV_COLOR[stav] || 'muted'}>{label(NC_STATUS_LABELS, stav)}</Badge>
        <Badge variant={ZAV_COLOR[item.zavaznost] || 'muted'}>{label(NC_SEVERITY_LABELS, item.zavaznost)}</Badge>
        <Badge variant="blue">{item.kategorie}</Badge>
        {prop && <Badge variant="muted">{String(prop.nazev || prop.name)}</Badge>}
      </div>

      {/* Overdue warning */}
      {isOverdue && (
        <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, marginBottom: 12 }}>
          Prosly termin o {Math.abs(daysLeft)} dni
        </div>
      )}
      {!isOverdue && daysLeft > 0 && daysLeft <= 7 && (
        <div style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 600, marginBottom: 12 }}>
          Termin za {daysLeft} dni
        </div>
      )}

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <InfoBox label="Zjisteno" value={formatCzDate(item.datumZjisteni)} />
        <InfoBox label="Termin napravy" value={formatCzDate(item.terminNapravy)} highlight={isOverdue} />
      </div>

      {/* Popis */}
      {item.popis && (
        <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.9rem', lineHeight: 1.6 }}>
          {item.popis}
        </div>
      )}

      {/* Stav change */}
      <div style={{ marginBottom: 16 }}>
        <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 600 }}>ZMENA STAVU</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {STAVY.map(s => (
            <button key={s} onClick={() => handleStavChange(s)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer',
                border: `2px solid ${stav === s ? stavHex : 'var(--border)'}`,
                background: stav === s ? 'var(--surface-2, var(--surface))' : 'var(--surface)',
                color: 'var(--text)',
                fontWeight: stav === s ? 700 : 400,
              }}>
              {label(NC_STATUS_LABELS, s)}
            </button>
          ))}
          {saving && <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Ulozeno</span>}
        </div>
      </div>
    </Modal>
  );
}

function InfoBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? 'rgba(239,68,68,0.08)' : 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '10px 14px', border: highlight ? '1px solid var(--danger)' : 'none' }}>
      <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 3, color: highlight ? 'var(--danger)' : undefined }}>{label}</div>
      <div style={{ fontWeight: 600, color: highlight ? 'var(--danger)' : undefined }}>{value}</div>
    </div>
  );
}

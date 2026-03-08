import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useAssetStore, type Asset, type AssetStav, daysToRevize } from './asset-store';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';
import { ASSET_STATUS_LABELS, REVISION_STATUS_LABELS, label } from '../../constants/labels';

interface Props {
  asset: Asset;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const STAV_COLOR: Record<string, BadgeVariant> = { aktivni: 'green', servis: 'yellow', vyrazeno: 'red', neaktivni: 'muted' };
const REV_COLOR: Record<string, BadgeVariant> = { ok: 'green', blizi_se: 'yellow', prosla: 'red' };

const STAV_ACTIONS: Record<string, { label: string; target: AssetStav; variant: BadgeVariant }[]> = {
  aktivni: [
    { label: 'Odeslat do servisu', target: 'servis', variant: 'yellow' },
    { label: 'Deaktivovat', target: 'neaktivni', variant: 'muted' },
  ],
  servis: [
    { label: 'Zpet do provozu', target: 'aktivni', variant: 'green' },
    { label: 'Vyradit', target: 'vyrazeno', variant: 'red' },
  ],
  neaktivni: [
    { label: 'Aktivovat', target: 'aktivni', variant: 'green' },
    { label: 'Vyradit', target: 'vyrazeno', variant: 'red' },
  ],
  vyrazeno: [
    { label: 'Reaktivovat', target: 'aktivni', variant: 'green' },
  ],
};

export default function AssetDetailModal({ asset, onClose, onUpdated }: Props) {
  const { update, changeStav, remove } = useAssetStore();
  const [tab, setTab] = useState<'detail' | 'revize'>('detail');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    nazev: asset.nazev,
    vyrobce: asset.vyrobce || '',
    model: asset.model || '',
    umisteni: asset.umisteni || '',
    poznamka: asset.poznamka || '',
    pristiRevize: asset.pristiRevize || '',
    hodnotaPorizeni: asset.hodnotaPorizeni != null ? String(asset.hodnotaPorizeni) : '',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const prop = properties.find(p => String(p.id) === String(asset.propertyId));

  const days = daysToRevize(asset.pristiRevize);

  const handleSaveEdit = () => {
    update(asset.id, {
      nazev: editForm.nazev,
      vyrobce: editForm.vyrobce || undefined,
      model: editForm.model || undefined,
      umisteni: editForm.umisteni || undefined,
      poznamka: editForm.poznamka || undefined,
      pristiRevize: editForm.pristiRevize || undefined,
      hodnotaPorizeni: editForm.hodnotaPorizeni ? Number(editForm.hodnotaPorizeni) : undefined,
    });
    setEditing(false);
    onUpdated();
  };

  const handleStavChange = (stav: AssetStav) => {
    changeStav(asset.id, stav);
    onUpdated();
  };

  const handleDelete = () => {
    remove(asset.id);
    onUpdated();
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box' as const,
  };

  const revizePercent = days != null && asset.pristiRevize && asset.posledniRevize
    ? Math.max(0, Math.min(100, 100 - (days / Math.max(1, Math.ceil((new Date(asset.pristiRevize).getTime() - new Date(asset.posledniRevize).getTime()) / (1000 * 60 * 60 * 24)))) * 100))
    : null;

  return (
    <Modal open onClose={onClose} wide
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            {asset.stav === 'servis' ? '\u{1F527}' : '\u{1F3ED}'}
          </div>
          <div>
            <div>{asset.nazev}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {asset.typNazev || 'Zarizeni'} {prop ? `· ${String(prop.nazev || prop.name)}` : ''}
            </div>
          </div>
        </div>
      }
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

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Badge variant={STAV_COLOR[asset.stav] || 'muted'}>{label(ASSET_STATUS_LABELS, asset.stav)}</Badge>
        <Badge variant={REV_COLOR[asset.stavRevize] || 'muted'}>{label(REVISION_STATUS_LABELS, asset.stavRevize)}</Badge>
      </div>

      {/* Stav actions */}
      {STAV_ACTIONS[asset.stav] && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STAV_ACTIONS[asset.stav].map(a => (
            <Button key={a.target} size="sm" onClick={() => handleStavChange(a.target)}>{a.label}</Button>
          ))}
        </div>
      )}

      {/* Revize progress */}
      {days != null && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
            <span className="text-muted">Pristi revize</span>
            <span style={{ fontWeight: 600, color: days <= 0 ? 'var(--danger)' : days <= 30 ? 'var(--accent-orange)' : 'var(--text)' }}>
              {days <= 0 ? `Proslá o ${Math.abs(days)} dni` : `Za ${days} dni`}
            </span>
          </div>
          {revizePercent != null && (
            <div style={{ height: 6, background: 'var(--surface-3, var(--border))', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${revizePercent}%`, height: '100%', borderRadius: 3,
                background: days <= 0 ? 'var(--danger)' : days <= 30 ? 'var(--accent-orange)' : 'var(--accent-green)',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn${tab === 'detail' ? ' active' : ''}`} onClick={() => setTab('detail')}>Detail</button>
        <button className={`tab-btn${tab === 'revize' ? ' active' : ''}`} onClick={() => setTab('revize')}>Revize & Udrzba</button>
      </div>

      {tab === 'detail' && !editing && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.9rem' }}>
            <InfoRow label="Vyrobce" value={asset.vyrobce} />
            <InfoRow label="Model" value={asset.model} />
            <InfoRow label="Umisteni" value={asset.umisteni} />
            <InfoRow label="Nemovitost" value={String(prop?.nazev || prop?.name || '—')} />
            <InfoRow label="Datum porizeni" value={asset.datumPorizeni ? formatCzDate(asset.datumPorizeni) : undefined} />
            <InfoRow label="Hodnota" value={asset.hodnotaPorizeni != null ? `${asset.hodnotaPorizeni.toLocaleString('cs-CZ')} Kc` : undefined} />
          </div>
          {asset.poznamka && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2, var(--surface))', borderRadius: 8, fontSize: '0.85rem' }}>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Poznamka</div>
              {asset.poznamka}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Button size="sm" onClick={() => setEditing(true)}>Upravit</Button>
          </div>
        </div>
      )}

      {tab === 'detail' && editing && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="form-label">Nazev</label>
              <input value={editForm.nazev} onChange={e => setEditForm(f => ({ ...f, nazev: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Vyrobce</label>
              <input value={editForm.vyrobce} onChange={e => setEditForm(f => ({ ...f, vyrobce: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Model</label>
              <input value={editForm.model} onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Umisteni</label>
              <input value={editForm.umisteni} onChange={e => setEditForm(f => ({ ...f, umisteni: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Pristi revize</label>
              <input type="date" value={editForm.pristiRevize} onChange={e => setEditForm(f => ({ ...f, pristiRevize: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Hodnota (Kc)</label>
              <input type="number" value={editForm.hodnotaPorizeni} onChange={e => setEditForm(f => ({ ...f, hodnotaPorizeni: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="form-label">Poznamka</label>
            <textarea value={editForm.poznamka} onChange={e => setEditForm(f => ({ ...f, poznamka: e.target.value }))} style={{ ...inputStyle, minHeight: 60 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>Ulozit</Button>
            <Button size="sm" onClick={() => setEditing(false)}>Zrusit</Button>
          </div>
        </div>
      )}

      {tab === 'revize' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <KpiMini label="Stav revize" value={label(REVISION_STATUS_LABELS, asset.stavRevize)} color={REV_COLOR[asset.stavRevize] === 'green' ? 'var(--accent-green)' : REV_COLOR[asset.stavRevize] === 'yellow' ? 'var(--accent-orange)' : 'var(--danger)'} />
            <KpiMini label="Posledni revize" value={asset.posledniRevize ? formatCzDate(asset.posledniRevize) : '—'} />
            <KpiMini label="Pristi revize" value={asset.pristiRevize ? formatCzDate(asset.pristiRevize) : '—'} />
          </div>
          <div className="text-muted" style={{ textAlign: 'center', padding: 24, fontSize: '0.85rem' }}>
            Historie revizi a servisnich zaznamu bude k dispozici v dalsi verzi.
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

function KpiMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

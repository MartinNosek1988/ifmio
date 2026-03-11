import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { apiClient } from '../../core/api/client';
import type { Asset } from './AssetListPage';
import {
  Wrench, FileText, QrCode, Save, Plus, AlertTriangle, CheckCircle,
} from 'lucide-react';

/* ─── types ──────────────────────────────────────────────────────── */

interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  description: string | null;
  cost: number | null;
  supplier: string | null;
}

interface Props {
  asset: Asset;
  onClose: () => void;
  onUpdated: () => void;
}

/* ─── constants ──────────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = { aktivni: 'Aktivní', servis: 'V servisu', vyrazeno: 'Vyřazeno', neaktivni: 'Neaktivní' };
const STATUS_COLOR: Record<string, BadgeVariant> = { aktivni: 'green', servis: 'yellow', vyrazeno: 'red', neaktivni: 'muted' };
const CATEGORY_LABEL: Record<string, string> = { tzb: 'TZB', stroje: 'Stroje', vybaveni: 'Vybavení', vozidla: 'Vozidla', it: 'IT', ostatni: 'Ostatní' };

const STATUS_ACTIONS: Record<string, { label: string; target: string; variant: BadgeVariant }[]> = {
  aktivni: [
    { label: 'Do servisu', target: 'servis', variant: 'yellow' },
    { label: 'Deaktivovat', target: 'neaktivni', variant: 'muted' },
  ],
  servis: [
    { label: 'Zpět do provozu', target: 'aktivni', variant: 'green' },
    { label: 'Vyřadit', target: 'vyrazeno', variant: 'red' },
  ],
  neaktivni: [
    { label: 'Aktivovat', target: 'aktivni', variant: 'green' },
    { label: 'Vyřadit', target: 'vyrazeno', variant: 'red' },
  ],
  vyrazeno: [
    { label: 'Reaktivovat', target: 'aktivni', variant: 'green' },
  ],
};

const SERVICE_TYPES = [
  { value: 'preventivni', label: 'Preventivní' },
  { value: 'oprava', label: 'Oprava' },
  { value: 'revize', label: 'Revize' },
  { value: 'kalibrace', label: 'Kalibrace' },
];

type Tab = 'detail' | 'services' | 'qr';

/* ─── component ──────────────────────────────────────────────────── */

export default function AssetDetailModal({ asset, onClose, onUpdated }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('detail');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.patch(`/assets/${asset.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); onUpdated(); },
  });

  const deleteMut = useMutation({
    mutationFn: () => apiClient.delete(`/assets/${asset.id}`),
    onSuccess: () => onUpdated(),
  });

  const now = Date.now();
  const warrantyExpired = asset.warrantyUntil && new Date(asset.warrantyUntil).getTime() < now;
  const serviceDays = asset.nextServiceDate
    ? Math.ceil((new Date(asset.nextServiceDate).getTime() - now) / 86_400_000) : null;

  return (
    <Modal open onClose={onClose} wide
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            {asset.status === 'servis' ? '\u{1F527}' : '\u{1F3ED}'}
          </div>
          <div>
            <div>{asset.name}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {CATEGORY_LABEL[asset.category] ?? asset.category}
              {asset.property ? ` · ${asset.property.name}` : ''}
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
                <Button onClick={() => deleteMut.mutate()} style={{ color: 'var(--danger)' }}>Ano</Button>
                <Button onClick={() => setConfirmDelete(false)}>Ne</Button>
              </div>
            )}
          </div>
          <Button onClick={onClose}>Zavřít</Button>
        </div>
      }>

      {/* Status badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <Badge variant={STATUS_COLOR[asset.status] ?? 'muted'}>{STATUS_LABEL[asset.status] ?? asset.status}</Badge>
        {warrantyExpired && <Badge variant="red"><AlertTriangle size={11} style={{ marginRight: 3 }} />Záruka prošla</Badge>}
        {!warrantyExpired && asset.warrantyUntil && <Badge variant="green"><CheckCircle size={11} style={{ marginRight: 3 }} />V záruce</Badge>}
        {serviceDays !== null && serviceDays <= 0 && <Badge variant="red">Servis prošlý</Badge>}
        {serviceDays !== null && serviceDays > 0 && serviceDays <= 30 && <Badge variant="yellow">Servis za {serviceDays}d</Badge>}
      </div>

      {/* Status actions */}
      {STATUS_ACTIONS[asset.status] && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STATUS_ACTIONS[asset.status].map((a) => (
            <Button key={a.target} size="sm" onClick={() => updateMut.mutate({ status: a.target })}>{a.label}</Button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn${tab === 'detail' ? ' active' : ''}`} onClick={() => setTab('detail')}>
          <FileText size={14} /> Detail
        </button>
        <button className={`tab-btn${tab === 'services' ? ' active' : ''}`} onClick={() => setTab('services')}>
          <Wrench size={14} /> Servisní záznamy
        </button>
        <button className={`tab-btn${tab === 'qr' ? ' active' : ''}`} onClick={() => setTab('qr')}>
          <QrCode size={14} /> QR kód
        </button>
      </div>

      {tab === 'detail' && !editing && <DetailView asset={asset} onEdit={() => setEditing(true)} />}
      {tab === 'detail' && editing && (
        <EditView asset={asset} onSave={(d) => updateMut.mutate(d)} onCancel={() => setEditing(false)} saving={updateMut.isPending} />
      )}
      {tab === 'services' && <ServicesTab assetId={asset.id} />}
      {tab === 'qr' && <QrTab assetId={asset.id} name={asset.name} />}
    </Modal>
  );
}

/* ─── Detail View ────────────────────────────────────────────────── */

function DetailView({ asset, onEdit }: { asset: Asset; onEdit: () => void }) {
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—';
  const fmtMoney = (v: number | null) => v != null ? `${Number(v).toLocaleString('cs-CZ')} Kč` : '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.9rem' }}>
        <InfoRow label="Výrobce" value={asset.manufacturer} />
        <InfoRow label="Model" value={asset.model} />
        <InfoRow label="Sériové číslo" value={asset.serialNumber} />
        <InfoRow label="Umístění" value={asset.location} />
        <InfoRow label="Nemovitost" value={asset.property?.name} />
        <InfoRow label="Jednotka" value={asset.unit?.name} />
        <InfoRow label="Datum pořízení" value={fmtDate(asset.purchaseDate)} />
        <InfoRow label="Pořizovací hodnota" value={fmtMoney(asset.purchaseValue)} />
        <InfoRow label="Záruka do" value={fmtDate(asset.warrantyUntil)} />
        <InfoRow label="Interval servisu" value={asset.serviceInterval ? `${asset.serviceInterval} měsíců` : '—'} />
        <InfoRow label="Poslední servis" value={fmtDate(asset.lastServiceDate)} />
        <InfoRow label="Příští servis" value={fmtDate(asset.nextServiceDate)} />
      </div>
      {asset.notes && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2, var(--surface))', borderRadius: 8, fontSize: '0.85rem' }}>
          <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Poznámka</div>
          {asset.notes}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Button size="sm" onClick={onEdit}>Upravit</Button>
      </div>
    </div>
  );
}

/* ─── Edit View ──────────────────────────────────────────────────── */

function EditView({ asset, onSave, onCancel, saving }: {
  asset: Asset; onSave: (d: Record<string, unknown>) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState({
    name: asset.name,
    manufacturer: asset.manufacturer ?? '',
    model: asset.model ?? '',
    serialNumber: asset.serialNumber ?? '',
    location: asset.location ?? '',
    purchaseValue: asset.purchaseValue != null ? String(asset.purchaseValue) : '',
    warrantyUntil: asset.warrantyUntil?.slice(0, 10) ?? '',
    serviceInterval: asset.serviceInterval != null ? String(asset.serviceInterval) : '',
    nextServiceDate: asset.nextServiceDate?.slice(0, 10) ?? '',
    notes: asset.notes ?? '',
  });

  const s = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' as const };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label className="form-label">Název</label><input value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Výrobce</label><input value={f.manufacturer} onChange={(e) => setF((p) => ({ ...p, manufacturer: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Model</label><input value={f.model} onChange={(e) => setF((p) => ({ ...p, model: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Sériové číslo</label><input value={f.serialNumber} onChange={(e) => setF((p) => ({ ...p, serialNumber: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Umístění</label><input value={f.location} onChange={(e) => setF((p) => ({ ...p, location: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Hodnota (Kč)</label><input type="number" value={f.purchaseValue} onChange={(e) => setF((p) => ({ ...p, purchaseValue: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Záruka do</label><input type="date" value={f.warrantyUntil} onChange={(e) => setF((p) => ({ ...p, warrantyUntil: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Interval servisu (měs.)</label><input type="number" value={f.serviceInterval} onChange={(e) => setF((p) => ({ ...p, serviceInterval: e.target.value }))} style={s} /></div>
        <div><label className="form-label">Příští servis</label><input type="date" value={f.nextServiceDate} onChange={(e) => setF((p) => ({ ...p, nextServiceDate: e.target.value }))} style={s} /></div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="form-label">Poznámka</label>
        <textarea value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} style={{ ...s, minHeight: 60 }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button variant="primary" size="sm" onClick={() => onSave({
          name: f.name,
          manufacturer: f.manufacturer || null,
          model: f.model || null,
          serialNumber: f.serialNumber || null,
          location: f.location || null,
          purchaseValue: f.purchaseValue ? Number(f.purchaseValue) : null,
          warrantyUntil: f.warrantyUntil || null,
          serviceInterval: f.serviceInterval ? Number(f.serviceInterval) : null,
          nextServiceDate: f.nextServiceDate || null,
          notes: f.notes || null,
        })} disabled={saving}>
          <Save size={14} /> {saving ? 'Ukládám...' : 'Uložit'}
        </Button>
        <Button size="sm" onClick={onCancel}>Zrušit</Button>
      </div>
    </div>
  );
}

/* ─── Services Tab ───────────────────────────────────────────────── */

function ServicesTab({ assetId }: { assetId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: '', type: 'preventivni', description: '', cost: '', supplier: '' });

  const { data: records = [] } = useQuery<ServiceRecord[]>({
    queryKey: ['assets', assetId, 'services'],
    queryFn: () => apiClient.get(`/assets/${assetId}/services`).then((r) => r.data),
  });

  const addMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post(`/assets/${assetId}/services`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', assetId, 'services'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      setShowAdd(false);
      setForm({ date: '', type: 'preventivni', description: '', cost: '', supplier: '' });
    },
  });

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' as const };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '.9rem', fontWeight: 600 }}>Servisní historie ({records.length})</span>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Skrýt' : 'Přidat servis'}
        </Button>
      </div>

      {showAdd && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="form-label">Datum *</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Typ</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={inputStyle}>
                {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Cena (Kč)</label>
              <input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Dodavatel</label>
              <input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="form-label">Popis</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 50 }} />
          </div>
          <Button variant="primary" size="sm" onClick={() => {
            if (!form.date) return;
            addMut.mutate({
              date: form.date, type: form.type,
              description: form.description || undefined,
              cost: form.cost ? Number(form.cost) : undefined,
              supplier: form.supplier || undefined,
            });
          }} disabled={addMut.isPending || !form.date}>
            {addMut.isPending ? 'Ukládám...' : 'Uložit záznam'}
          </Button>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: 24, fontSize: '0.85rem' }}>
          Zatím žádné servisní záznamy.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map((r) => (
            <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant="blue">{SERVICE_TYPES.find((t) => t.value === r.type)?.label ?? r.type}</Badge>
                  <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
                    {new Date(r.date).toLocaleDateString('cs-CZ')}
                  </span>
                </div>
                {r.cost != null && (
                  <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{Number(r.cost).toLocaleString('cs-CZ')} Kč</span>
                )}
              </div>
              {r.description && <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{r.description}</div>}
              {r.supplier && <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Dodavatel: {r.supplier}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── QR Tab ─────────────────────────────────────────────────────── */

function QrTab({ assetId, name }: { assetId: string; name: string }) {
  // Generate a simple QR code using a public API for display
  const qrData = `ASSET:${assetId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <img src={qrUrl} alt="QR" style={{ borderRadius: 8, marginBottom: 12 }} width={200} height={200} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        ID: {assetId}
      </div>
      <Button size="sm" onClick={() => {
        const a = document.createElement('a');
        a.href = qrUrl; a.download = `asset-${assetId.slice(0, 8)}.png`;
        a.target = '_blank'; a.click();
      }}>
        Stáhnout QR kód
      </Button>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

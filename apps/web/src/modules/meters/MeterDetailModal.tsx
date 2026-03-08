import { useState, useEffect } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useMeterStore, type Meter } from './meter-store';
import { useMeterReadingStore } from './meter-reading-store';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';
import { METER_TYPE_LABELS, label } from '../../constants/labels';

interface Props {
  meter: Meter;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const TYP_COLOR: Record<string, BadgeVariant> = {
  elektrina: 'yellow', voda_studena: 'blue', voda_tepla: 'red',
  plyn: 'blue', teplo: 'red',
};
const TYP_ICON: Record<string, string> = {
  elektrina: '⚡', voda_studena: '💧', voda_tepla: '🔥',
  plyn: '🔵', teplo: '♨️',
};

export default function MeterDetailModal({ meter, onClose, onUpdated }: Props) {
  const { addReading } = useMeterStore();
  const { readings, load: loadReadings, getByMeter } = useMeterReadingStore();
  const [showAddReading, setShowAddReading] = useState(false);
  const [newStav, setNewStav] = useState('');
  const [newDatum, setNewDatum] = useState(new Date().toISOString().slice(0, 10));
  const [newPoznamka, setNewPoznamka] = useState('');

  useEffect(() => { loadReadings(); }, [loadReadings]);

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const prop = properties.find(p => String(p.id) === String(meter.propId));

  const meterReadings = getByMeter(meter.id);
  const latest = meterReadings[0];
  const previous = meterReadings[1];
  const trend = latest?.spotreba != null && previous?.spotreba != null
    ? latest.spotreba - previous.spotreba : null;

  const icon = TYP_ICON[meter.typ] || '📊';

  const handleAddReading = () => {
    if (!newStav || isNaN(Number(newStav))) return;
    addReading(meter.id, Number(newStav), newDatum, newPoznamka || undefined);
    setNewStav('');
    setNewPoznamka('');
    setShowAddReading(false);
    loadReadings();
    onUpdated();
  };

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' as const };

  return (
    <Modal open onClose={onClose} wide
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
          <div>
            <div>{meter.nazev}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {meter.cislo} · {String(prop?.nazev || prop?.name || '')}
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zavrit</Button>
        </div>
      }>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Badge variant={TYP_COLOR[meter.typ] || 'muted'}>{label(METER_TYPE_LABELS, meter.typ)}</Badge>
        <Badge variant="muted">{meter.jednotka}</Badge>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <KpiMini label="Aktualni stav" value={meter.posledniOdecet != null ? `${meter.posledniOdecet.toLocaleString('cs-CZ')} ${meter.jednotka}` : '—'} sub={meter.datumOdectu ? formatCzDate(meter.datumOdectu) : undefined} />
        <KpiMini label="Posledni spotreba"
          value={latest?.spotreba != null ? `+${latest.spotreba.toLocaleString('cs-CZ')} ${meter.jednotka}` : '—'}
          sub={trend != null ? (trend > 0 ? `▲ +${trend}` : `▼ ${trend}`) : undefined}
          subColor={trend != null ? (trend > 0 ? 'var(--danger)' : 'var(--accent-green)') : undefined} />
        <KpiMini label="Pocet odectu" value={String(meterReadings.length)} sub={meterReadings.length > 0 ? `Od ${formatCzDate(meterReadings[meterReadings.length - 1]?.datum)}` : undefined} />
      </div>

      {/* Add reading */}
      {!showAddReading ? (
        <Button variant="primary" size="sm" onClick={() => setShowAddReading(true)} style={{ marginBottom: 16 }}>+ Pridat odecet</Button>
      ) : (
        <div style={{ border: '1px solid var(--accent-blue)', borderRadius: 8, padding: 14, marginBottom: 16, background: 'var(--surface-2, var(--surface))' }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Novy odecet</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="form-label">Stav meridla ({meter.jednotka}) *</label>
              <input type="number" value={newStav} onChange={e => setNewStav(e.target.value)}
                placeholder={`napr. ${(meter.posledniOdecet || 0) + 100}`} style={inputStyle} />
              {meter.posledniOdecet != null && newStav && Number(newStav) > meter.posledniOdecet && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
                  Spotreba: {Number(newStav) - meter.posledniOdecet} {meter.jednotka}
                </div>
              )}
            </div>
            <div>
              <label className="form-label">Datum odectu</label>
              <input type="date" value={newDatum} onChange={e => setNewDatum(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <input value={newPoznamka} onChange={e => setNewPoznamka(e.target.value)}
            placeholder="Poznamka (volitelne)" style={{ ...inputStyle, marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="primary" size="sm" onClick={handleAddReading} disabled={!newStav}>Ulozit odecet</Button>
            <Button size="sm" onClick={() => { setShowAddReading(false); setNewStav(''); }}>Zrusit</Button>
          </div>
        </div>
      )}

      {/* Readings history */}
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>Historie odectu</div>
      {meterReadings.length === 0 ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: 20 }}>Zatim zadne odecty</div>
      ) : (
        <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['DATUM', 'STAV', 'SPOTREBA', 'ZDROJ', 'POZNAMKA'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 6px 6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meterReadings.map((r, i) => (
              <tr key={r.id} style={{ background: i === 0 ? 'var(--surface-2, transparent)' : undefined }}>
                <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)', fontWeight: i === 0 ? 600 : 400 }}>{formatCzDate(r.datum)}</td>
                <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{r.stav?.toLocaleString('cs-CZ')} {meter.jednotka}</td>
                <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)' }} className="text-muted">{r.spotreba != null ? `+${r.spotreba.toLocaleString('cs-CZ')}` : '—'}</td>
                <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)' }}><Badge variant={r.source === 'manual' ? 'muted' : 'blue'}>{r.source === 'manual' ? 'Rucni' : 'Import'}</Badge></td>
                <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }} className="text-muted text-sm">{r.poznamka || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

function KpiMini({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: subColor || 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

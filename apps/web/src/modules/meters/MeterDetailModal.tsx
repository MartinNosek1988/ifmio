import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useAddMeterReading } from './api/meters.queries';
import type { ApiMeter, ApiMeterReading } from './api/meters.api';
import { formatCzDate } from '../../shared/utils/format';
import { METER_TYPE_LABELS, label } from '../../constants/labels';

interface Props {
  meter: ApiMeter;
  onClose: () => void;
  onUpdated: () => void;
}

const TYP_COLOR: Record<string, BadgeVariant> = {
  elektrina: 'yellow', voda_studena: 'blue', voda_tepla: 'red',
  plyn: 'blue', teplo: 'red',
};
const TYP_ICON: Record<string, string> = {
  elektrina: '\u26A1', voda_studena: '\u{1F4A7}', voda_tepla: '\u{1F525}',
  plyn: '\u{1F535}', teplo: '\u2668\uFE0F',
};

function calibrationWarning(due: string | null): { text: string; color: string } | null {
  if (!due) return null;
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `Kalibrace prošla před ${Math.abs(days)} dny!`, color: 'var(--danger)' };
  if (days <= 90) return { text: `Kalibrace vyprší za ${days} dní`, color: 'var(--accent-orange)' };
  return null;
}

export default function MeterDetailModal({ meter, onClose, onUpdated }: Props) {
  const addReadingMutation = useAddMeterReading();
  const [tab, setTab] = useState<'detail' | 'readings' | 'chart'>('detail');
  const [showAddReading, setShowAddReading] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newNote, setNewNote] = useState('');

  const readings = meter.readings ?? [];
  const latest = readings[0];
  const previous = readings[1];
  const trend = latest?.consumption != null && previous?.consumption != null
    ? latest.consumption - previous.consumption : null;

  const icon = TYP_ICON[meter.meterType] || '\u{1F4CA}';
  const calWarn = calibrationWarning(meter.calibrationDue);

  const handleAddReading = () => {
    if (!newValue || isNaN(Number(newValue))) return;
    addReadingMutation.mutate({
      meterId: meter.id,
      dto: { readingDate: newDate, value: Number(newValue), note: newNote || undefined },
    }, {
      onSuccess: () => {
        setNewValue('');
        setNewNote('');
        setShowAddReading(false);
        onUpdated();
      },
    });
  };

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' as const };

  const tabs = ['detail', 'readings', 'chart'] as const;
  const tabLabels = { detail: 'Detail', readings: `Odečty (${readings.length})`, chart: 'Spotřeba' };

  return (
    <Modal open onClose={onClose} wide
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
          <div>
            <div>{meter.name}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {meter.serialNumber}{meter.property ? ` · ${meter.property.name}` : ''}
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zavřít</Button>
        </div>
      }>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge variant={TYP_COLOR[meter.meterType] || 'muted'}>{label(METER_TYPE_LABELS, meter.meterType)}</Badge>
        <Badge variant="muted">{meter.unit}</Badge>
        {!meter.isActive && <Badge variant="red">Neaktivní</Badge>}
      </div>

      {/* Calibration warning */}
      {calWarn && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: `${calWarn.color}18`, border: `1px solid ${calWarn.color}40`, marginBottom: 12, fontSize: '0.85rem', color: calWarn.color, fontWeight: 600 }}>
          {calWarn.text}
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <KpiMini label="Aktuální stav" value={meter.lastReading != null ? `${meter.lastReading.toLocaleString('cs-CZ')} ${meter.unit}` : '—'}
          sub={meter.lastReadingDate ? formatCzDate(meter.lastReadingDate) : undefined} />
        <KpiMini label="Poslední spotřeba"
          value={latest?.consumption != null ? `+${latest.consumption.toLocaleString('cs-CZ')} ${meter.unit}` : '—'}
          sub={trend != null ? (trend > 0 ? `\u25B2 +${trend.toLocaleString('cs-CZ')}` : `\u25BC ${trend.toLocaleString('cs-CZ')}`) : undefined}
          subColor={trend != null ? (trend > 0 ? 'var(--danger)' : 'var(--accent-green)') : undefined} />
        <KpiMini label="Počet odečtů" value={String(readings.length)}
          sub={readings.length > 0 ? `Od ${formatCzDate(readings[readings.length - 1]?.readingDate)}` : undefined} />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <InfoCell label="Nemovitost" value={meter.property?.name} />
            <InfoCell label="Jednotka" value={meter.unitRel?.name} />
            <InfoCell label="Umístění" value={meter.location || undefined} />
            <InfoCell label="Výrobce" value={meter.manufacturer || undefined} />
            <InfoCell label="Datum instalace" value={meter.installDate ? formatCzDate(meter.installDate) : undefined} />
            <InfoCell label="Kalibrace do" value={meter.calibrationDue ? formatCzDate(meter.calibrationDue) : undefined} />
          </div>
          {meter.parentMeter && (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>NADŘAZENÉ (PATNÍ) MĚŘIDLO</div>
              <div style={{ fontWeight: 600 }}>{meter.parentMeter.name}</div>
              <div className="text-muted" style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{meter.parentMeter.serialNumber}</div>
            </div>
          )}
          {meter.childMeters && meter.childMeters.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Podružná měřidla ({meter.childMeters.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {meter.childMeters.map((child) => (
                  <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>
                      <span style={{ fontWeight: 500 }}>{child.name}</span>{' '}
                      <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{child.serialNumber}</span>
                    </span>
                    <span className="text-muted">
                      {child.lastReading != null ? `${child.lastReading.toLocaleString('cs-CZ')} ${meter.unit}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {/* TODO: Common consumption widget — needs period picker, calls GET /meters/:id/common-consumption */}
            </div>
          )}
          {meter.note && (
            <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12 }}>
              <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>POZNÁMKA</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{meter.note}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'readings' && (
        <div>
          {/* Add reading */}
          {!showAddReading ? (
            <Button variant="primary" size="sm" onClick={() => setShowAddReading(true)} style={{ marginBottom: 16 }}>+ Přidat odečet</Button>
          ) : (
            <div style={{ border: '1px solid var(--accent-blue)', borderRadius: 8, padding: 14, marginBottom: 16, background: 'var(--surface-2, var(--surface))' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Nový odečet</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="form-label">Stav měřidla ({meter.unit}) *</label>
                  <input type="number" value={newValue} onChange={e => setNewValue(e.target.value)}
                    placeholder={`napr. ${(meter.lastReading || 0) + 100}`} style={inputStyle} />
                  {meter.lastReading != null && newValue && Number(newValue) > meter.lastReading && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
                      Spotřeba: {(Number(newValue) - meter.lastReading).toLocaleString('cs-CZ')} {meter.unit}
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">Datum odečtu</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <input value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder="Poznámka (volitelné)" style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="primary" size="sm" onClick={handleAddReading}
                  disabled={!newValue || addReadingMutation.isPending}>Uložit odečet</Button>
                <Button size="sm" onClick={() => { setShowAddReading(false); setNewValue(''); }}>Zrušit</Button>
              </div>
            </div>
          )}

          {/* Readings table */}
          {readings.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 20 }}>Zatím žádné odečty</div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['DATUM', 'STAV', 'SPOTŘEBA', 'ZDROJ', 'POZNÁMKA'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 6px 6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readings.map((r, i) => (
                  <tr key={r.id} style={{ background: i === 0 ? 'var(--surface-2, transparent)' : undefined }}>
                    <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)', fontWeight: i === 0 ? 600 : 400 }}>{formatCzDate(r.readingDate)}</td>
                    <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{r.value.toLocaleString('cs-CZ')} {meter.unit}</td>
                    <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)' }} className="text-muted">{r.consumption != null ? `+${r.consumption.toLocaleString('cs-CZ')}` : '—'}</td>
                    <td style={{ padding: '8px 6px 8px 0', borderBottom: '1px solid var(--border)' }}><Badge variant={r.source === 'manual' ? 'muted' : 'blue'}>{r.source === 'manual' ? 'Ruční' : 'Import'}</Badge></td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }} className="text-muted text-sm">{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'chart' && (
        <ConsumptionChart readings={readings} unit={meter.unit} />
      )}
    </Modal>
  );
}

function ConsumptionChart({ readings, unit }: { readings: ApiMeterReading[]; unit: string }) {
  const withConsumption = readings
    .filter(r => r.consumption != null && r.consumption > 0)
    .reverse()
    .slice(-12);

  if (withConsumption.length === 0) {
    return <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Nedostatek dat pro graf</div>;
  }

  const maxVal = Math.max(...withConsumption.map(r => r.consumption!));
  const barHeight = 140;

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Spotřeba ({unit})</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: barHeight + 30, padding: '0 4px' }}>
        {withConsumption.map(r => {
          const pct = maxVal > 0 ? (r.consumption! / maxVal) * 100 : 0;
          const h = Math.max(4, (pct / 100) * barHeight);
          return (
            <div key={r.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{r.consumption!.toLocaleString('cs-CZ')}</div>
              <div style={{
                width: '100%', maxWidth: 40, height: h, borderRadius: '4px 4px 0 0',
                background: 'var(--accent-blue)', transition: 'height 0.3s',
              }} />
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                {new Date(r.readingDate).toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
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

import { useState } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useCalendarStore, type CalendarEvent, type EventTyp } from './calendar-store';
import { loadFromStorage } from '../../core/storage';
import { EVENT_TYPE_LABELS, label } from '../../constants/labels';
import EventForm from './EventForm';

interface Props {
  event: CalendarEvent;
  onClose: () => void;
  onUpdated: () => void;
}

type R = Record<string, unknown>;

const TYP_COLOR: Record<string, BadgeVariant> = {
  schuze: 'purple', revize: 'yellow', udrzba: 'blue',
  predani: 'green', prohlidka: 'yellow', ostatni: 'muted',
};

const TYP_HEX: Record<string, string> = {
  schuze: '#8b5cf6', revize: '#f97316', udrzba: '#3b82f6',
  predani: '#22c55e', prohlidka: '#eab308', ostatni: '#6b7280',
};

const DATE_FMT_LONG = (d?: string) => d ? new Date(d).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function EventDetailModal({ event, onClose, onUpdated }: Props) {
  const { remove } = useCalendarStore();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const prop = properties.find(p => String(p.id) === String(event.propId));

  const color = TYP_HEX[event.typ] || '#6b7280';
  const isToday = new Date(event.datum).toDateString() === new Date().toDateString();
  const isPast = new Date(event.datum) < new Date() && !isToday;
  const daysTo = Math.ceil((new Date(event.datum).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleDelete = () => {
    remove(event.id);
    onUpdated();
  };

  if (showEdit) {
    return <EventForm event={event} onClose={() => { setShowEdit(false); onUpdated(); }} />;
  }

  return (
    <Modal open onClose={onClose} wide
      title={event.nazev}
      subtitle={`${label(EVENT_TYPE_LABELS, event.typ)}${prop ? ` · ${String(prop.nazev || prop.name)}` : ''}`}
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setShowEdit(true)}>Upravit</Button>
            <Button onClick={onClose}>Zavrit</Button>
          </div>
        </div>
      }>

      {/* Color bar */}
      <div style={{ height: 4, background: color, borderRadius: 2, marginBottom: 14 }} />

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Badge variant={TYP_COLOR[event.typ] || 'muted'}>{label(EVENT_TYPE_LABELS, event.typ)}</Badge>
        {isToday && <Badge variant="green">Dnes</Badge>}
        {isPast && <Badge variant="muted">Probehlo</Badge>}
        {prop && <Badge variant="muted">{String(prop.nazev || prop.name)}</Badge>}
      </div>

      {/* Days countdown */}
      {!isPast && daysTo > 0 && (
        <div style={{ fontSize: '0.85rem', marginBottom: 14, color: daysTo <= 7 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: daysTo <= 7 ? 600 : 400 }}>
          {daysTo <= 7 ? `Za ${daysTo} ${daysTo === 1 ? 'den' : daysTo < 5 ? 'dny' : 'dni'}` : `Za ${daysTo} dni`}
        </div>
      )}

      {/* Datum & cas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <InfoBox label="Datum" value={DATE_FMT_LONG(event.datum)} />
        <InfoBox label="Cas" value={`${event.cas || '—'}${event.casDo ? ` – ${event.casDo}` : ''}`} />
      </div>

      {/* Misto */}
      {event.misto && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
          <span style={{ fontSize: '1.2rem' }}>{'\u{1F4CD}'}</span>
          <div>
            <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 2 }}>MISTO</div>
            <div style={{ fontWeight: 500 }}>{event.misto}</div>
          </div>
        </div>
      )}

      {/* Popis */}
      {event.popis && (
        <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>POPIS</div>
          <div style={{ fontSize: '0.875rem' }}>{event.popis}</div>
        </div>
      )}

      {/* Ucastnici */}
      {event.ucastnici && event.ucastnici.length > 0 && (
        <div>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>UCASTNICI</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {event.ucastnici.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px 3px 4px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                  {u.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.82rem' }}>{u}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '10px 14px' }}>
      <div className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{value}</div>
    </div>
  );
}

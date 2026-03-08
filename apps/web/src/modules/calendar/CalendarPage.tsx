import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Badge, SearchBar, Button } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { EVENT_TYPE_LABELS, label } from '../../constants/labels';
import { useCalendarStore, type CalendarEvent, type EventTyp } from './calendar-store';
import EventDetailModal from './EventDetailModal';
import EventForm from './EventForm';

const DAYS_CS = ['Po', 'Ut', 'St', 'Ct', 'Pa', 'So', 'Ne'];
const MONTHS_CS = ['Leden', 'Unor', 'Brezen', 'Duben', 'Kveten', 'Cerven', 'Cervenec', 'Srpen', 'Zari', 'Rijen', 'Listopad', 'Prosinec'];

const TYP_COLOR: Record<string, BadgeVariant> = {
  schuze: 'purple', revize: 'yellow', udrzba: 'blue',
  predani: 'green', prohlidka: 'yellow', ostatni: 'muted',
};

const TYP_HEX: Record<string, string> = {
  schuze: '#8b5cf6', revize: '#f97316', udrzba: '#3b82f6',
  predani: '#22c55e', prohlidka: '#eab308', ostatni: '#6b7280',
};

const TYPY: EventTyp[] = ['schuze', 'revize', 'udrzba', 'predani', 'prohlidka', 'ostatni'];

export default function CalendarPage() {
  const { events, load, getStats } = useCalendarStore();
  const [view, setView] = useState<'list' | 'month'>('list');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDefaultDatum, setFormDefaultDatum] = useState('');
  const [search, setSearch] = useState('');
  const [filterTyp, setFilterTyp] = useState('');

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  useEffect(() => { load(); }, [load]);

  const stats = getStats();

  const filtered = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => e.nazev.toLowerCase().includes(q) || (e.popis || '').toLowerCase().includes(q));
    }
    if (filterTyp) result = result.filter(e => e.typ === filterTyp);
    return [...result].sort((a, b) => a.datum.localeCompare(b.datum));
  }, [events, search, filterTyp]);

  // Month view helpers
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const monthEvents = useMemo(() =>
    events.filter(e => {
      const d = new Date(e.datum);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    }),
    [events, calYear, calMonth]
  );

  const getEventsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return monthEvents.filter(e => e.datum === dateStr);
  };

  const handleDayClick = (day: number) => {
    if (selected) return;
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormDefaultDatum(dateStr);
    setShowForm(true);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kalendar</h1>
          <p className="page-subtitle">{stats.nadchazejici} nadchazejicich udalosti</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setFormDefaultDatum(''); setShowForm(true); }}>Nova udalost</Button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem udalosti" value={String(stats.celkem)} color="var(--accent-blue)" />
        <KpiCard label="Nadchazejici" value={String(stats.nadchazejici)} color="var(--accent-green)" />
        <KpiCard label="Tento mesic" value={String(stats.tentoMesic)} color="var(--accent-orange)" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar placeholder="Hledat udalosti..." onSearch={setSearch} />
        </div>
        <select value={filterTyp} onChange={e => setFilterTyp(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
          <option value="">Vse</option>
          {TYPY.map(t => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
        </select>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(['list', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                background: view === v ? 'var(--accent)' : 'var(--surface)',
                color: view === v ? 'var(--bg)' : 'var(--text)',
              }}>
              {v === 'list' ? 'Seznam' : 'Mesic'}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="data-table" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Datum', 'Cas', 'Nazev', 'Typ', 'Popis'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Zadne udalosti</td></tr>
              )}
              {filtered.map(e => {
                const isToday = new Date(e.datum).toDateString() === new Date().toDateString();
                const isPast = new Date(e.datum) < new Date() && !isToday;
                return (
                  <tr key={e.id}
                    onClick={() => setSelected(e)}
                    style={{ cursor: 'pointer', opacity: isPast ? 0.6 : 1 }}>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: isToday ? 700 : 400 }}>
                      {formatCzDate(e.datum)}
                      {isToday && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>DNES</span>}
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }} className="text-muted">{e.cas || '—'}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{e.nazev}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <Badge variant={TYP_COLOR[e.typ] || 'muted'}>{label(EVENT_TYPE_LABELS, e.typ)}</Badge>
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="text-muted text-sm">
                      {e.popis || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <Button size="sm" onClick={prevMonth}>{'\u2039'}</Button>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{MONTHS_CS[calMonth]} {calYear}</span>
            <Button size="sm" onClick={nextMonth}>{'\u203A'}</Button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAYS_CS.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {/* Empty cells */}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`e-${i}`} style={{ minHeight: 80, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', opacity: 0.5 }} />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();
              const col = (startDow + i) % 7;
              const isWeekend = col === 5 || col === 6;

              return (
                <div key={day}
                  onClick={() => handleDayClick(day)}
                  style={{
                    minHeight: 80, padding: '6px 8px',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isToday ? 'rgba(200,240,80,0.06)' : isWeekend ? 'var(--surface-2, var(--surface))' : 'transparent',
                  }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? 'var(--accent)' : 'transparent',
                    color: isToday ? 'var(--bg)' : isWeekend ? 'var(--text-muted)' : 'var(--text)',
                    fontSize: '0.82rem', fontWeight: isToday ? 700 : 400, marginBottom: 4,
                  }}>
                    {day}
                  </div>
                  {dayEvents.slice(0, 2).map(e => (
                    <button key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        setSelected(e);
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left' as const,
                        fontSize: '0.72rem', padding: '2px 5px', borderRadius: 3, marginBottom: 2,
                        background: (TYP_HEX[e.typ] || '#6b7280') + '22',
                        border: 'none',
                        borderLeft: `3px solid ${TYP_HEX[e.typ] || '#6b7280'}`,
                        whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: 'pointer', position: 'relative' as const, zIndex: 2,
                        color: 'var(--text)',
                      }}>
                      {e.cas && <span style={{ marginRight: 3, color: 'var(--text-muted)' }}>{e.cas}</span>}
                      {e.nazev}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: 4 }}>+{dayEvents.length - 2} dalsi</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {selected && (
        <EventDetailModal
          event={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      {showForm && (
        <EventForm
          defaultDatum={formDefaultDatum}
          onClose={() => { setShowForm(false); setFormDefaultDatum(''); load(); }}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Badge, SearchBar, Button } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import type { BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { EVENT_TYPE_LABELS, label } from '../../constants/labels';
import { useCalendarEvents, useCalendarStats } from './api/calendar.queries';
import type { ApiCalendarEvent } from './api/calendar.api';
import EventDetailModal from './EventDetailModal';
import EventForm from './EventForm';

const DAYS_CS = ['Po', 'Ut', 'St', 'Ct', 'Pa', 'So', 'Ne'];
const MONTHS_CS = ['Leden', 'Unor', 'Brezen', 'Duben', 'Kveten', 'Cerven', 'Cervenec', 'Srpen', 'Zari', 'Rijen', 'Listopad', 'Prosinec'];

const SOURCE_COLOR: Record<string, BadgeVariant> = {
  workorder: 'blue', contract: 'yellow', meter: 'yellow', custom: 'green',
};
const SOURCE_LABEL: Record<string, string> = {
  workorder: 'Work Order', contract: 'Smlouva', meter: 'Kalibrace', custom: 'Vlastní',
};

const TYP_COLOR: Record<string, BadgeVariant> = {
  schuze: 'purple', revize: 'yellow', udrzba: 'blue',
  predani: 'green', prohlidka: 'yellow', ostatni: 'muted',
  workorder: 'blue', contract: 'yellow', meter: 'yellow',
};

const TYP_HEX: Record<string, string> = {
  schuze: '#8b5cf6', revize: '#f97316', udrzba: '#3b82f6',
  predani: '#22c55e', prohlidka: '#eab308', ostatni: '#6b7280',
  workorder: '#3b82f6', contract: '#f97316', meter: '#eab308',
};

const FILTER_TYPES = [
  { value: '', label: 'Vse' },
  { value: 'schuze', label: 'Schůze' },
  { value: 'revize', label: 'Revize' },
  { value: 'udrzba', label: 'Údržba' },
  { value: 'predani', label: 'Předání' },
  { value: 'prohlidka', label: 'Prohlídka' },
  { value: 'ostatni', label: 'Ostatní' },
  { value: 'workorder', label: 'Work Orders' },
  { value: 'contract', label: 'Smlouvy' },
  { value: 'meter', label: 'Kalibrace' },
];

export default function CalendarPage() {
  const [view, setView] = useState<'list' | 'month' | 'week'>('month');
  const [selected, setSelected] = useState<ApiCalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState('');
  const [search, setSearch] = useState('');
  const [filterTyp, setFilterTyp] = useState('');

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  });

  // Fetch range covers 3 months to handle month navigation
  const fetchFrom = useMemo(() => {
    const d = new Date(calYear, calMonth - 1, 1);
    return d.toISOString().slice(0, 10);
  }, [calYear, calMonth]);
  const fetchTo = useMemo(() => {
    const d = new Date(calYear, calMonth + 2, 0);
    return d.toISOString().slice(0, 10);
  }, [calYear, calMonth]);

  const apiParams = useMemo(() => ({
    from: fetchFrom,
    to: fetchTo,
    ...(filterTyp ? { eventType: filterTyp } : {}),
    ...(search ? { search } : {}),
  }), [fetchFrom, fetchTo, filterTyp, search]);

  const { data: events, isLoading, isError, refetch } = useCalendarEvents(apiParams);
  const { data: stats } = useCalendarStats();

  const items = events ?? [];

  // Month view helpers
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const monthEvents = useMemo(() =>
    items.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    }),
    [items, calYear, calMonth]
  );

  const getEventsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return monthEvents.filter(e => e.date === dateStr);
  };

  // Week view helpers
  const weekDays = useMemo(() => {
    const start = new Date(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekEvents = useMemo(() => {
    const startStr = weekDays[0].toISOString().slice(0, 10);
    const endStr = weekDays[6].toISOString().slice(0, 10);
    return items.filter(e => e.date >= startStr && e.date <= endStr);
  }, [items, weekDays]);

  const getWeekDayEvents = (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return weekEvents.filter(e => e.date === dateStr);
  };

  const handleDayClick = (dateStr: string) => {
    if (selected) return;
    setFormDefaultDate(dateStr);
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

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const filtered = useMemo(() =>
    [...items].sort((a, b) => a.date.localeCompare(b.date)),
    [items]
  );

  if (isLoading) return <LoadingState text="Nacitani kalendare..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kalendar</h1>
          <p className="page-subtitle">{stats?.upcoming ?? 0} nadchazejicich udalosti</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setFormDefaultDate(''); setShowForm(true); }}>Nova udalost</Button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem vlastnich" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Nadchazejici" value={String(stats?.upcoming ?? 0)} color="var(--accent-green)" />
        <KpiCard label="Tento mesic" value={String(stats?.thisMonth ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="WO / Smlouvy / Kal." value={`${stats?.workorders ?? 0} / ${stats?.contracts ?? 0} / ${stats?.meters ?? 0}`} color="var(--accent-blue)" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar placeholder="Hledat udalosti..." onSearch={setSearch} />
        </div>
        <select value={filterTyp} onChange={e => setFilterTyp(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
          {FILTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(['list', 'week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                background: view === v ? 'var(--accent)' : 'var(--surface)',
                color: view === v ? 'var(--bg)' : 'var(--text)',
              }}>
              {v === 'list' ? 'Seznam' : v === 'week' ? 'Tyden' : 'Mesic'}
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
                {['Datum', 'Cas', 'Nazev', 'Typ', 'Zdroj', 'Popis'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Zadne udalosti</td></tr>
              )}
              {filtered.map(e => {
                const isToday = e.date === today.toISOString().slice(0, 10);
                const isPast = e.date < today.toISOString().slice(0, 10);
                return (
                  <tr key={e.id}
                    onClick={() => setSelected(e)}
                    style={{ cursor: 'pointer', opacity: isPast ? 0.6 : 1 }}>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: isToday ? 700 : 400 }}>
                      {formatCzDate(e.date)}
                      {isToday && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>DNES</span>}
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }} className="text-muted">{e.timeFrom || '—'}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{e.title}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <Badge variant={TYP_COLOR[e.eventType] || 'muted'}>{label(EVENT_TYPE_LABELS, e.eventType)}</Badge>
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <Badge variant={SOURCE_COLOR[e.source] || 'muted'}>{SOURCE_LABEL[e.source] || e.source}</Badge>
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="text-muted text-sm">
                      {e.description || '—'}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <Button size="sm" onClick={prevMonth}>{'\u2039'}</Button>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{MONTHS_CS[calMonth]} {calYear}</span>
            <Button size="sm" onClick={nextMonth}>{'\u203A'}</Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAYS_CS.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`e-${i}`} style={{ minHeight: 80, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', opacity: 0.5 }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();
              const col = (startDow + i) % 7;
              const isWeekend = col === 5 || col === 6;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

              return (
                <div key={day}
                  onClick={() => handleDayClick(dateStr)}
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
                    <EventChip key={e.id} event={e} onClick={() => setSelected(e)} />
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

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <Button size="sm" onClick={prevWeek}>{'\u2039'}</Button>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {formatCzDate(weekDays[0].toISOString().slice(0, 10))} — {formatCzDate(weekDays[6].toISOString().slice(0, 10))}
            </span>
            <Button size="sm" onClick={nextWeek}>{'\u203A'}</Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((d, i) => {
              const dateStr = d.toISOString().slice(0, 10);
              const dayEvts = getWeekDayEvents(d);
              const isToday = dateStr === today.toISOString().slice(0, 10);
              const isWeekend = i === 5 || i === 6;

              return (
                <div key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  style={{
                    minHeight: 120, padding: '8px',
                    borderRight: i < 6 ? '1px solid var(--border)' : undefined,
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isToday ? 'rgba(200,240,80,0.06)' : isWeekend ? 'var(--surface-2, var(--surface))' : 'transparent',
                  }}>
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{DAYS_CS[i]}</div>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: isToday ? 'var(--accent)' : 'transparent',
                      color: isToday ? 'var(--bg)' : 'var(--text)',
                      fontSize: '0.9rem', fontWeight: isToday ? 700 : 400,
                    }}>
                      {d.getDate()}
                    </div>
                  </div>
                  {dayEvts.map(e => (
                    <EventChip key={e.id} event={e} onClick={() => setSelected(e)} />
                  ))}
                  {dayEvts.length === 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>—</div>
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
          onUpdated={() => setSelected(null)}
        />
      )}

      {showForm && (
        <EventForm
          defaultDate={formDefaultDate}
          onClose={() => { setShowForm(false); setFormDefaultDate(''); }}
        />
      )}
    </div>
  );
}

function EventChip({ event, onClick }: { event: ApiCalendarEvent; onClick: () => void }) {
  const color = TYP_HEX[event.source !== 'custom' ? event.source : event.eventType] || '#6b7280';
  return (
    <button
      onClick={(ev) => { ev.stopPropagation(); ev.preventDefault(); onClick(); }}
      style={{
        display: 'block', width: '100%', textAlign: 'left' as const,
        fontSize: '0.72rem', padding: '2px 5px', borderRadius: 3, marginBottom: 2,
        background: color + '22',
        border: 'none',
        borderLeft: `3px solid ${color}`,
        whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
        cursor: 'pointer', position: 'relative' as const, zIndex: 2,
        color: 'var(--text)',
      }}>
      {event.timeFrom && <span style={{ marginRight: 3, color: 'var(--text-muted)' }}>{event.timeFrom}</span>}
      {event.title}
    </button>
  );
}

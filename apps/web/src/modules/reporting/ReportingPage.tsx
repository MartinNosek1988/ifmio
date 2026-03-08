import { useMemo } from 'react';
import { KpiCard } from '../../shared/components';
import { loadFromStorage } from '../../core/storage';
import { formatKc } from '../../shared/utils/format';

type R = Record<string, unknown>;

function BarChart({ data, color = '#6366f1', height = 160 }: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {d.value > 0 ? (d.value >= 1000 ? Math.round(d.value / 1000) + 'k' : d.value) : ''}
          </div>
          <div
            title={`${d.label}: ${d.value}`}
            style={{
              width: '80%', maxWidth: 36,
              height: `${Math.max((d.value / max) * (height - 40), d.value > 0 ? 4 : 0)}px`,
              background: color, borderRadius: '4px 4px 0 0',
            }}
          />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size = 120 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.25;

  let angle = -Math.PI / 2;
  const paths = segments.filter(s => s.value > 0).map(seg => {
    const ratio = seg.value / total;
    const startAngle = angle;
    angle += ratio * 2 * Math.PI;
    const endAngle = angle;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + inner * Math.cos(startAngle), yi1 = cy + inner * Math.sin(startAngle);
    const xi2 = cx + inner * Math.cos(endAngle), yi2 = cy + inner * Math.sin(endAngle);
    const largeArc = ratio > 0.5 ? 1 : 0;
    return { ...seg, d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${largeArc} 0 ${xi1} ${yi1} Z` };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85} />)}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={size * 0.13} fill="var(--text)" fontWeight="700">
        {total}
      </text>
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

export default function ReportingPage() {
  const transactions = useMemo(() => loadFromStorage<R[]>('estateos_fin_transactions', []).filter(t => !t.deleted_at), []);
  const properties = useMemo(() => loadFromStorage<R[]>('estateos_properties', []), []);
  const units = useMemo(() => loadFromStorage<R[]>('estateos_units', []), []);
  const tickets = useMemo(() => loadFromStorage<R[]>('estateos_tickets', []), []);
  const workorders = useMemo(() => loadFromStorage<R[]>('estateos_work_orders', []), []);

  const prijmy = transactions.filter(t => t.typ === 'prijem' || t.typ === 'p\u0159\u00EDjem');
  const vydaje = transactions.filter(t => t.typ === 'vydej' || t.typ === 'v\u00FDdej');
  const totalPrijmy = prijmy.reduce((s, t) => s + (Number(t.castka) || 0), 0);
  const totalVydaje = vydaje.reduce((s, t) => s + (Number(t.castka) || 0), 0);
  const bilance = totalPrijmy - totalVydaje;

  // Monthly income (last 6 months)
  const mesicniData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const lbl = d.toLocaleDateString('cs-CZ', { month: 'short' });
      const value = prijmy
        .filter(t => {
          const td = new Date(String(t.datum || t.created_at));
          return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
        })
        .reduce((s, t) => s + (Number(t.castka) || 0), 0);
      return { label: lbl, value };
    });
  }, [prijmy]);

  // Property expenses donut
  const propColors = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#eab308', '#06b6d4'];
  const propSegments = properties.slice(0, 6).map((p, i) => {
    const propT = vydaje.filter(t => String(t.propId) === String(p.id));
    return {
      label: String(p.nazev || p.name || '').slice(0, 12),
      value: propT.reduce((s, t) => s + (Number(t.castka) || 0), 0) || 1,
      color: propColors[i % propColors.length],
    };
  });

  // Work orders by status
  const woStats = [
    { label: 'Nove', value: workorders.filter(w => w.stav === 'nova').length, color: '#6366f1' },
    { label: 'V reseni', value: workorders.filter(w => w.stav === 'v_reseni').length, color: '#f97316' },
    { label: 'Hotove', value: workorders.filter(w => w.stav === 'dokoncena' || w.stav === 'vyresena').length, color: '#22c55e' },
  ];

  // Tickets by priority
  const hdStats = [
    { label: 'Nizka', value: tickets.filter(t => t.priorita === 'nizka' || t.priority === 'low').length, color: '#22c55e' },
    { label: 'Normalni', value: tickets.filter(t => t.priorita === 'normalni' || t.priority === 'medium').length, color: '#6366f1' },
    { label: 'Vysoka', value: tickets.filter(t => t.priorita === 'vysoka' || t.priority === 'high').length, color: '#f97316' },
    { label: 'Kriticka', value: tickets.filter(t => t.priorita === 'kriticka' || t.priority === 'critical').length, color: '#ef4444' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporting</h1>
          <p className="page-subtitle">Prehled klicovych ukazatelu</p>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkove prijmy" value={formatKc(totalPrijmy)} color="var(--accent-green)" />
        <KpiCard label="Celkove vydaje" value={formatKc(totalVydaje)} color="var(--accent-red)" />
        <KpiCard label="Bilance" value={formatKc(bilance)} color={bilance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <KpiCard label="Nemovitosti" value={String(properties.length)} color="var(--accent-blue)" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Section title="Mesicni prijmy (poslednich 6 mesicu)">
          <BarChart data={mesicniData} color="#22c55e" height={180} />
        </Section>
        <Section title="Vydaje dle nemovitosti">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <DonutChart segments={propSegments} size={140} />
            <div style={{ width: '100%' }}>
              {propSegments.filter(s => s.value > 1).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <div style={{ fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Section title="Work Orders dle stavu">
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 16 }}>
            {woStats.map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <BarChart data={woStats.map(s => ({ label: s.label, value: s.value }))} color="#6366f1" height={100} />
        </Section>
        <Section title="HelpDesk dle priority">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
            <DonutChart segments={hdStats} size={110} />
            <div>
              {hdStats.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: '0.8rem' }}>{s.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: 4 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Occupancy */}
      <Section title="Obsazenost nemovitosti">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {properties.map(p => {
            const propUnits = units.filter(u => String(u.property_id || u.propId) === String(p.id));
            const obsazene = propUnits.filter(u => u.stav === 'obsazena' || u.stav === 'obsazeno' || u.status === 'obsazena' || u.status === 'obsazeno' || u.najemnik_id || u.residentId).length;
            const total = propUnits.length || 1;
            const pct = Math.round((obsazene / total) * 100);
            return (
              <div key={String(p.id)} style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(p.nazev || p.name)}
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#22c55e' : pct > 50 ? '#f97316' : '#ef4444', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{obsazene}/{total} jednotek · {pct}%</div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

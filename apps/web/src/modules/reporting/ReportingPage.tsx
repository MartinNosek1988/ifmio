import { useState, useMemo } from 'react';
import { KpiCard, Button, Badge } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { formatKc } from '../../shared/utils/format';
import { useDashboardKpi, useYearlyOverview, usePropertyReport } from './api/reports.queries';
import type { MonthlyRow, PropertyReport } from './api/reports.api';

const MONTHS_CS = ['Leden', 'Unor', 'Brezen', 'Duben', 'Kveten', 'Cerven', 'Cervenec', 'Srpen', 'Zari', 'Rijen', 'Listopad', 'Prosinec'];

type Tab = 'prehled' | 'financni' | 'nemovitosti';

// ── CSV Export Helpers ──

function exportCSV(filename: string, csvContent: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function yearlyToCSV(months: MonthlyRow[], year: number): string {
  const header = 'Mesic;Prijmy;Vydaje;Saldo;Inkaso %';
  const rows = months.map(m =>
    `${MONTHS_CS[m.month - 1]};${m.income};${m.expense};${m.balance};${m.collectionRate}`
  );
  return [header, ...rows].join('\n');
}

function propertiesToCSV(props: PropertyReport[]): string {
  const header = 'Nemovitost;Adresa;Jednotky;Obsazene;Obsazenost %;Predpisy/mes;Najem/mes;Tickety;WO';
  const rows = props.map(p =>
    `"${p.name}";"${p.address}";${p.totalUnits};${p.occupied};${p.occupancyPct};${p.monthlyPrescriptions};${p.monthlyRent};${p.openTickets};${p.openWorkOrders}`
  );
  return [header, ...rows].join('\n');
}

// ── Chart Components ──

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
          <div title={`${d.label}: ${formatKc(d.value)}`}
            style={{
              width: '80%', maxWidth: 36,
              height: `${Math.max((d.value / max) * (height - 40), d.value > 0 ? 4 : 0)}px`,
              background: color, borderRadius: '4px 4px 0 0', transition: 'height 0.3s',
            }}
          />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function DualBarChart({ data, height = 200 }: {
  data: { label: string; income: number; expense: number }[];
  height?: number;
}) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: height - 30, width: '100%' }}>
            <div title={`Příjmy: ${formatKc(d.income)}`}
              style={{
                flex: 1, borderRadius: '3px 3px 0 0', background: '#22c55e',
                height: `${Math.max((d.income / max) * 100, d.income > 0 ? 3 : 0)}%`,
                transition: 'height 0.3s',
              }} />
            <div title={`Výdaje: ${formatKc(d.expense)}`}
              style={{
                flex: 1, borderRadius: '3px 3px 0 0', background: '#ef4444',
                height: `${Math.max((d.expense / max) * 100, d.expense > 0 ? 3 : 0)}%`,
                transition: 'height 0.3s',
              }} />
          </div>
          <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', textAlign: 'center' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function OccupancyBarChart({ data, height = 160 }: {
  data: { label: string; pct: number }[];
  height?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => {
        const color = d.pct >= 90 ? '#22c55e' : d.pct >= 70 ? '#f97316' : '#ef4444';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: '0.68rem', color, fontWeight: 700 }}>{d.pct}%</div>
            <div style={{
              width: '80%', maxWidth: 40, borderRadius: '4px 4px 0 0', background: color,
              height: `${Math.max((d.pct / 100) * (height - 40), 4)}px`, transition: 'height 0.3s',
            }} />
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.1, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        );
      })}
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

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main Page ──

export default function ReportingPage() {
  const [tab, setTab] = useState<Tab>('prehled');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const { data: kpi, isLoading: kpiLoading, isError: kpiError, refetch: kpiRefetch } = useDashboardKpi();
  const { data: yearly, isLoading: yearlyLoading } = useYearlyOverview(year);
  const { data: propReport, isLoading: propLoading } = usePropertyReport();

  if (kpiLoading) return <LoadingState text="Nacitani reportu..." />;
  if (kpiError) return <ErrorState onRetry={kpiRefetch} />;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prehled', label: 'Prehled KPI' },
    { key: 'financni', label: 'Financni reporty' },
    { key: 'nemovitosti', label: 'Nemovitosti' },
  ];

  return (
    <div className="print-area">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporting & KPI</h1>
          <p className="page-subtitle">Prehled klicovych ukazatelu</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => window.print()}>Tisk / PDF</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'prehled' && kpi && <PrehledTab kpi={kpi} yearly={yearly} year={year} setYear={setYear} yearlyLoading={yearlyLoading} />}
      {tab === 'financni' && <FinancniTab yearly={yearly} year={year} setYear={setYear} yearlyLoading={yearlyLoading} />}
      {tab === 'nemovitosti' && <NemovitostiTab data={propReport ?? []} loading={propLoading} />}
    </div>
  );
}

// ── Prehled KPI Tab ──

function PrehledTab({ kpi, yearly, year, setYear, yearlyLoading }: {
  kpi: NonNullable<ReturnType<typeof useDashboardKpi>['data']>;
  yearly: ReturnType<typeof useYearlyOverview>['data'];
  year: number;
  setYear: (y: number) => void;
  yearlyLoading: boolean;
}) {
  const occColor = kpi.occupancyPct >= 90 ? 'var(--accent-green)' : kpi.occupancyPct >= 70 ? 'var(--accent-orange)' : 'var(--danger)';

  return (
    <div>
      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <KpiCard label="Obsazenost" value={`${kpi.occupancyPct}%`} color={occColor} />
        <KpiCard label="Prijmy tento mesic" value={formatKc(kpi.monthIncome)} color="var(--accent-green)" />
        <KpiCard label="Vydaje tento mesic" value={formatKc(kpi.monthExpense)} color="var(--danger)" />
        <KpiCard label="Bilance" value={formatKc(kpi.monthBalance)} color={kpi.monthBalance >= 0 ? 'var(--accent-green)' : 'var(--danger)'} />
      </div>

      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Dluznici" value={String(kpi.debtResidents)} color={kpi.debtResidents > 0 ? 'var(--danger)' : 'var(--accent-green)'} />
        <KpiCard label="Otevrene tickety" value={String(kpi.openTickets)} color={kpi.openTickets > 5 ? 'var(--accent-orange)' : 'var(--accent-blue)'} />
        <KpiCard label="Expirace smluv (90d)" value={String(kpi.expiringLeases)} color={kpi.expiringLeases > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'} />
        <KpiCard label="Otevrene WO" value={String(kpi.openWorkOrders)} color="var(--accent-blue)" />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Section title="Nemovitosti">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MiniStat label="Celkem" value={String(kpi.properties)} />
            <MiniStat label="Jednotek" value={String(kpi.units)} />
            <MiniStat label="Obsazeno" value={String(kpi.occupiedUnits)} />
            <MiniStat label="Volnych" value={String(kpi.units - kpi.occupiedUnits)} />
          </div>
        </Section>
        <Section title="Finance">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MiniStat label="Predpisy/mes" value={formatKc(kpi.expectedMonthly)} />
            <MiniStat label="Inkaso" value={`${kpi.collectionRate}%`} />
            <MiniStat label="Akt. predpisy" value={String(kpi.activePrescriptions)} />
            <MiniStat label="Rezidenti" value={String(kpi.activeResidents)} />
          </div>
        </Section>
        <Section title="Provoz">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MiniStat label="Tickety" value={String(kpi.openTickets)} />
            <MiniStat label="Work Orders" value={String(kpi.openWorkOrders)} />
            <MiniStat label="Exp. smlouvy" value={String(kpi.expiringLeases)} />
            <MiniStat label="Prosl. kalibrace" value={String(kpi.calibrationDue)} />
          </div>
        </Section>
      </div>

      {/* Income/Expense chart */}
      {!yearlyLoading && yearly && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <Section title={`Prijmy vs Vydaje ${year}`}
            action={<YearSelector year={year} setYear={setYear} />}>
            <DualBarChart
              data={yearly.months.map(m => ({
                label: MONTHS_CS[m.month - 1].slice(0, 3),
                income: m.income,
                expense: m.expense,
              }))}
              height={200}
            />
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#22c55e' }} />
                <span style={{ fontSize: '0.8rem' }}>Prijmy: {formatKc(yearly.totals.income)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
                <span style={{ fontSize: '0.8rem' }}>Vydaje: {formatKc(yearly.totals.expense)}</span>
              </div>
            </div>
          </Section>
          <Section title="Mesicni inkaso">
            <BarChart
              data={yearly.months.map(m => ({
                label: MONTHS_CS[m.month - 1].slice(0, 3),
                value: m.collectionRate,
              }))}
              color="#6366f1"
              height={200}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

// ── Financni Report Tab ──

function FinancniTab({ yearly, year, setYear, yearlyLoading }: {
  yearly: ReturnType<typeof useYearlyOverview>['data'];
  year: number;
  setYear: (y: number) => void;
  yearlyLoading: boolean;
}) {
  const handleExportCSV = () => {
    if (!yearly) return;
    exportCSV(`report_${year}.csv`, yearlyToCSV(yearly.months, year));
  };

  return (
    <div>
      <Section title={`Mesicni report ${year}`}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <YearSelector year={year} setYear={setYear} />
            <Button size="sm" onClick={handleExportCSV} disabled={!yearly}>Export CSV</Button>
          </div>
        }>
        {yearlyLoading ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Nacitam...</div>
        ) : yearly ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Mesic', 'Prijmy', 'Vydaje', 'Saldo', 'Inkaso %'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Mesic' ? 'left' : 'right', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearly.months.map(m => (
                  <tr key={m.month}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{MONTHS_CS[m.month - 1]}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: '#22c55e', fontFamily: 'monospace' }}>{formatKc(m.income)}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace' }}>{formatKc(m.expense)}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: m.balance >= 0 ? '#22c55e' : '#ef4444' }}>{formatKc(m.balance)}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                      <Badge variant={m.collectionRate >= 90 ? 'green' : m.collectionRate >= 70 ? 'yellow' : 'red'}>{m.collectionRate}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ padding: '10px 12px', borderTop: '2px solid var(--border)' }}>CELKEM</td>
                  <td style={{ padding: '10px 12px', borderTop: '2px solid var(--border)', textAlign: 'right', color: '#22c55e', fontFamily: 'monospace' }}>{formatKc(yearly.totals.income)}</td>
                  <td style={{ padding: '10px 12px', borderTop: '2px solid var(--border)', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace' }}>{formatKc(yearly.totals.expense)}</td>
                  <td style={{ padding: '10px 12px', borderTop: '2px solid var(--border)', textAlign: 'right', fontFamily: 'monospace', color: yearly.totals.balance >= 0 ? '#22c55e' : '#ef4444' }}>{formatKc(yearly.totals.balance)}</td>
                  <td style={{ padding: '10px 12px', borderTop: '2px solid var(--border)' }} />
                </tr>
              </tfoot>
            </table>

            {/* Inline chart */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>Graf prijmu a vydaju</div>
              <DualBarChart
                data={yearly.months.map(m => ({
                  label: MONTHS_CS[m.month - 1].slice(0, 3),
                  income: m.income,
                  expense: m.expense,
                }))}
                height={180}
              />
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#22c55e' }} />
                  <span style={{ fontSize: '0.78rem' }}>Prijmy</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
                  <span style={{ fontSize: '0.78rem' }}>Vydaje</span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </Section>
    </div>
  );
}

// ── Nemovitosti Report Tab ──

function NemovitostiTab({ data, loading }: { data: PropertyReport[]; loading: boolean }) {
  const handleExportCSV = () => {
    exportCSV(`nemovitosti_report_${new Date().toISOString().slice(0, 10)}.csv`, propertiesToCSV(data));
  };

  // Sort data for chart: by occupancy descending
  const chartData = useMemo(() =>
    [...data].sort((a, b) => b.occupancyPct - a.occupancyPct).slice(0, 15),
    [data]
  );

  if (loading) return <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>Nacitam...</div>;

  return (
    <div>
      {/* Occupancy chart */}
      {data.length > 0 && (
        <Section title="Graf obsazenosti" action={
          <Button size="sm" onClick={handleExportCSV}>Export CSV</Button>
        }>
          <OccupancyBarChart
            data={chartData.map(p => ({ label: p.name.slice(0, 10), pct: p.occupancyPct }))}
            height={180}
          />
        </Section>
      )}

      {/* Property table */}
      <div style={{ marginTop: 20 }}>
        <Section title={`Report nemovitosti (${data.length})`}>
          {data.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 20 }}>Zadne nemovitosti</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Nemovitost', 'Jednotky', 'Obsazenost', 'Predpisy/mes', 'Najem/mes', 'Tickety', 'WO', 'Smlouvy'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Nemovitost' ? 'left' : 'right', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(p => {
                  const occColor = p.occupancyPct >= 90 ? '#22c55e' : p.occupancyPct >= 70 ? '#f97316' : '#ef4444';
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.address}</div>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        {p.occupied}/{p.totalUnits}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                          <div style={{ width: 50, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p.occupancyPct}%`, background: occColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ color: occColor, fontWeight: 600, minWidth: 35 }}>{p.occupancyPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{formatKc(p.monthlyPrescriptions)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{formatKc(p.monthlyRent)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        {p.openTickets > 0 ? <Badge variant="yellow">{p.openTickets}</Badge> : <span className="text-muted">0</span>}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        {p.openWorkOrders > 0 ? <Badge variant="blue">{p.openWorkOrders}</Badge> : <span className="text-muted">0</span>}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        {p.activeLeases}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}

// ── Helpers ──

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{value}</div>
    </div>
  );
}

function YearSelector({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  const now = new Date().getFullYear();
  return (
    <select value={year} onChange={e => setYear(Number(e.target.value))}
      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}>
      {Array.from({ length: 5 }, (_, i) => now - i).map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}

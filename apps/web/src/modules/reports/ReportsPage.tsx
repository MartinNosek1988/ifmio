import { useState } from 'react';
import { KpiCard } from '../../shared/components';
import { useMonthlyReport, useYearlyOverview } from './api/reports.queries';
import { reportsApi } from './api/reports.api';

const MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

function formatKc(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0 }).format(n);
}

function BarChart({ data, height = 160 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {d.value > 0 ? (d.value >= 1000 ? Math.round(d.value / 1000) + 'k' : Math.round(d.value)) : ''}
          </div>
          <div
            title={`${d.label}: ${formatKc(d.value)}`}
            style={{
              width: '80%',
              maxWidth: 36,
              height: `${Math.max((Math.abs(d.value) / max) * (height - 40), d.value !== 0 ? 4 : 0)}px`,
              background: d.color || '#6366f1',
              borderRadius: '4px 4px 0 0',
            }}
          />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState<'monthly' | 'yearly'>('monthly');
  const [exporting, setExporting] = useState(false);

  const { data: monthly, isLoading: loadingM } = useMonthlyReport(year, month);
  const { data: yearly, isLoading: loadingY } = useYearlyOverview(year);

  const handleExport = async () => {
    setExporting(true);
    try {
      await reportsApi.exportMonthly(year, month);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Výkazy</h1>
          <p className="page-subtitle">Měsíční a roční přehledy</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="form-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{ width: 140 }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 100 }}
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            <button
              className={`btn btn-sm ${tab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('monthly')}
            >
              Měsíční
            </button>
            <button
              className={`btn btn-sm ${tab === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('yearly')}
            >
              Roční
            </button>
          </div>
        </div>
      </div>

      {tab === 'monthly' && (
        <>
          {loadingM ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Načítám report...</div>
          ) : monthly ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <KpiCard label="Příjmy" value={formatKc(monthly.summary.income)} color="var(--accent-green)" />
                <KpiCard label="Výdaje" value={formatKc(monthly.summary.expense)} color="var(--accent-red)" />
                <KpiCard label="Bilance" value={formatKc(monthly.summary.balance)} color={monthly.summary.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
                <KpiCard label="Míra inkasa" value={`${monthly.summary.collectionRate}%`} color="var(--accent-blue)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <Section
                  title={`Transakce — ${MONTHS[month - 1]} ${year}`}
                  action={
                    <button className="btn btn-sm btn-secondary" onClick={handleExport} disabled={exporting}>
                      {exporting ? 'Exportuji...' : 'Export XLSX'}
                    </button>
                  }
                >
                  <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Datum</th>
                          <th>Částka</th>
                          <th>Typ</th>
                          <th>Protistrana</th>
                          <th>VS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.transactions.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Žádné transakce</td></tr>
                        ) : (
                          monthly.transactions.map((t) => (
                            <tr key={t.id}>
                              <td>{new Date(t.date).toLocaleDateString('cs-CZ')}</td>
                              <td style={{ color: t.type === 'credit' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                                {t.type === 'credit' ? '+' : '-'}{formatKc(t.amount)}
                              </td>
                              <td>{t.type === 'credit' ? 'Příjem' : 'Výdaj'}</td>
                              <td>{t.counterparty || '—'}</td>
                              <td>{t.variableSymbol || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Section>

                <Section title="Aktivní předpisy">
                  <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Popis</th>
                          <th>Částka</th>
                          <th>Splatnost</th>
                          <th>Nemovitost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.prescriptions.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Žádné předpisy</td></tr>
                        ) : (
                          monthly.prescriptions.map((p) => (
                            <tr key={p.id}>
                              <td>{p.description}</td>
                              <td style={{ fontWeight: 600 }}>{formatKc(p.amount)}</td>
                              <td>{p.dueDay}. den</td>
                              <td>{p.property || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </div>

              <Section title="Souhrn">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Aktivní bydlící</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{monthly.summary.activeResidents}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Aktivní předpisy</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{monthly.summary.activePrescriptions}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Očekávané příjmy</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatKc(monthly.summary.expectedIncome)}</div>
                  </div>
                </div>
              </Section>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Žádná data</div>
          )}
        </>
      )}

      {tab === 'yearly' && (
        <>
          {loadingY ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Načítám roční přehled...</div>
          ) : yearly ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <KpiCard label="Roční příjmy" value={formatKc(yearly.totals.income)} color="var(--accent-green)" />
                <KpiCard label="Roční výdaje" value={formatKc(yearly.totals.expense)} color="var(--accent-red)" />
                <KpiCard label="Roční bilance" value={formatKc(yearly.totals.balance)} color={yearly.totals.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <Section title="Příjmy dle měsíců">
                  <BarChart
                    data={yearly.months.map((m) => ({
                      label: MONTHS[m.month - 1].slice(0, 3),
                      value: m.income,
                      color: '#22c55e',
                    }))}
                    height={180}
                  />
                </Section>
                <Section title="Výdaje dle měsíců">
                  <BarChart
                    data={yearly.months.map((m) => ({
                      label: MONTHS[m.month - 1].slice(0, 3),
                      value: m.expense,
                      color: '#ef4444',
                    }))}
                    height={180}
                  />
                </Section>
              </div>

              <Section title="Měsíční přehled">
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Měsíc</th>
                      <th>Příjmy</th>
                      <th>Výdaje</th>
                      <th>Bilance</th>
                      <th>Inkaso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearly.months.map((m) => (
                      <tr key={m.month}>
                        <td>{MONTHS[m.month - 1]}</td>
                        <td style={{ color: 'var(--accent-green)' }}>{formatKc(m.income)}</td>
                        <td style={{ color: 'var(--accent-red)' }}>{formatKc(m.expense)}</td>
                        <td style={{ fontWeight: 600, color: m.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {formatKc(m.balance)}
                        </td>
                        <td>{m.collectionRate}%</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                      <td>Celkem</td>
                      <td style={{ color: 'var(--accent-green)' }}>{formatKc(yearly.totals.income)}</td>
                      <td style={{ color: 'var(--accent-red)' }}>{formatKc(yearly.totals.expense)}</td>
                      <td style={{ color: yearly.totals.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {formatKc(yearly.totals.balance)}
                      </td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Žádná data</div>
          )}
        </>
      )}
    </div>
  );
}

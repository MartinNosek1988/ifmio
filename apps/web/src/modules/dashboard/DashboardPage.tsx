import { useDashboardOverview } from './api/dashboard.queries'
import { LoadingState } from '../../shared/components/LoadingState'
import { ErrorState }   from '../../shared/components/ErrorState'

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardOverview()

  if (isLoading) return <LoadingState text="Načítání dashboardu..." />
  if (isError)   return <ErrorState onRetry={refetch} />

  const { kpi, alerts, recentTransactions, recentTickets } = data

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Dashboard
      </h1>

      {/* Alerty */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {alerts.map((alert: any, i: number) => (
            <div key={i} style={{
              padding: '10px 16px',
              borderRadius: 8,
              marginBottom: 8,
              background: alert.type === 'error'   ? '#fef2f2' :
                          alert.type === 'warning' ? '#fffbeb' : '#eff6ff',
              borderLeft: `4px solid ${
                alert.type === 'error'   ? '#ef4444' :
                alert.type === 'warning' ? '#f59e0b' : '#3b82f6'
              }`,
              color: '#374151',
              fontSize: 14,
            }}>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {[
          { label: 'Nemovitosti',      value: kpi.propertiesCount,       icon: '🏢' },
          { label: 'Jednotky',         value: kpi.unitsCount,            icon: '🚪' },
          { label: 'Obsazenost',       value: `${kpi.occupancyRate}%`,   icon: '📊' },
          { label: 'Obyvatelé', value: kpi.residentsCount,        icon: '👥' },
          { label: 'Dlužníci', value: kpi.debtorsCount,   icon: '⚠️',  warn: kpi.debtorsCount > 0 },
          { label: 'Otevřené tickety', value: kpi.openTickets, icon: '🎫',  warn: kpi.urgentTickets > 0 },
          { label: 'Aktivní předpisy', value: kpi.activePrescriptions, icon: '📋' },
          { label: 'Nespárované', value: kpi.unmatchedTransactions, icon: '🏦', warn: kpi.unmatchedTransactions > 0 },
        ].map((item) => (
          <div key={item.label} style={{
            background: item.warn ? '#fffbeb' : '#f9fafb',
            border:     `1px solid ${item.warn ? '#fcd34d' : '#e5e7eb'}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#111' }}>
              {item.value}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Recent tickets */}
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: 20,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Otevřené tickety
          </h2>
          {recentTickets.length === 0
            ? <div style={{ color: '#9ca3af', fontSize: 14 }}>Žádné otevřené tickety</div>
            : recentTickets.map((t: any) => (
              <div key={t.id} style={{
                padding: '10px 0',
                borderBottom: '1px solid #f3f4f6',
                fontSize: 14,
              }}>
                <div style={{ fontWeight: 500 }}>#{t.number} {t.title}</div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                  {t.property?.name} &middot; {t.priority}
                </div>
              </div>
            ))
          }
        </div>

        {/* Recent transactions */}
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: 20,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Poslední transakce
          </h2>
          {recentTransactions.length === 0
            ? <div style={{ color: '#9ca3af', fontSize: 14 }}>Žádné transakce</div>
            : recentTransactions.map((t: any) => (
              <div key={t.id} style={{
                padding: '10px 0',
                borderBottom: '1px solid #f3f4f6',
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{t.description ?? t.counterparty ?? '—'}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                    {new Date(t.date).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
                <div style={{
                  fontWeight: 600,
                  color: t.type === 'credit' ? '#10b981' : '#ef4444',
                }}>
                  {t.type === 'credit' ? '+' : '-'}
                  {Number(t.amount).toLocaleString('cs-CZ')} Kč
                </div>
              </div>
            ))
          }
        </div>

      </div>
    </div>
  )
}


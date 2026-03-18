import { useMyKonto } from './api/portal.queries'
import { LoadingSpinner } from '../../shared/components'

const TYPE_LABELS: Record<string, string> = { DEBIT: 'Předpis', CREDIT: 'Platba', ADJUSTMENT: 'Úprava' }
const SOURCE_LABELS: Record<string, string> = {
  PRESCRIPTION: 'Předpis', BANK_TRANSACTION: 'Bankovní platba',
  CREDIT_APPLICATION: 'Kredit', LATE_FEE: 'Penále',
  MANUAL_ADJUSTMENT: 'Ruční úprava', OPENING_BALANCE: 'Počáteční stav',
}

export default function MyKontoPage() {
  const { data, isLoading, error } = useMyKonto()

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-danger">Nepodařilo se načíst konto.</div>

  const totalBalance = data?.totalBalance ?? 0
  const accounts = data?.accounts ?? []

  if (!accounts.length) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Žádné záznamy na kontě</div>
  }

  return (
    <div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '24px', marginBottom: 24, textAlign: 'center' }}>
        <div className="text-muted" style={{ fontSize: '.85rem', marginBottom: 4 }}>Celkový stav konta</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: totalBalance >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
          {totalBalance >= 0 ? '+' : ''}{totalBalance.toLocaleString('cs-CZ')} Kč
        </div>
        <div style={{ fontSize: '.85rem', color: totalBalance >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
          {totalBalance >= 0 ? 'Přeplatek' : 'Nedoplatek'}
        </div>
      </div>

      {accounts.map((acc: any) => (
        <div key={acc.id} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: '.95rem', fontWeight: 600, margin: 0 }}>{acc.unitName}</h3>
            <span style={{ fontWeight: 700, color: acc.currentBalance >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
              {acc.currentBalance >= 0 ? '+' : ''}{acc.currentBalance.toLocaleString('cs-CZ')} Kč
            </span>
          </div>
          {acc.entries?.length > 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead>
                  <tr>
                    {['Datum', 'Typ', 'Popis', 'Částka', 'Zůstatek'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acc.entries.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{e.postingDate?.slice(0, 10)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '.72rem', fontWeight: 600, borderRadius: 3, padding: '1px 6px', background: e.type === 'CREDIT' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: e.type === 'CREDIT' ? '#22c55e' : '#ef4444' }}>
                          {TYPE_LABELS[e.type] ?? e.type}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{e.description ?? SOURCE_LABELS[e.sourceType] ?? e.sourceType}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: e.type === 'CREDIT' ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
                        {e.type === 'CREDIT' ? '-' : '+'}{Math.abs(e.amount).toLocaleString('cs-CZ')} Kč
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{e.balance.toLocaleString('cs-CZ')} Kč</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted" style={{ fontSize: '.85rem' }}>Žádné pohyby</div>
          )}
        </div>
      ))}
    </div>
  )
}

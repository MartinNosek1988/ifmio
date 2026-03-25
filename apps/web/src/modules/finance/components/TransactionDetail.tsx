import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, Button, Modal } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { formatKc, formatCzDate } from '../../../shared/utils/format'
import { useMatchSuggestions, useManualMatch, useUnmatchTransaction } from '../api/finance.queries'
import type { FinTransaction } from '../types'
import type { MatchTarget, MatchSuggestion } from '../api/finance.api'

const MATCH_TARGET_LABELS: Record<string, { label: string; variant: string }> = {
  KONTO: { label: 'Konto', variant: 'green' },
  INVOICE: { label: 'Doklad', variant: 'blue' },
  COMPONENT: { label: 'Složka', variant: 'purple' },
  NO_EFFECT: { label: 'Bez vlivu', variant: 'muted' },
  UNSPECIFIED: { label: 'Neuvedeno', variant: 'yellow' },
}

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  matched: { label: 'Spárováno', variant: 'green' },
  partially_matched: { label: 'Částečně', variant: 'yellow' },
  unmatched: { label: 'Nespárováno', variant: 'red' },
  ignored: { label: 'Ignorováno', variant: 'muted' },
}

const row = (label: string, value: React.ReactNode) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '.88rem' }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
  </div>
)

interface Props {
  tx: FinTransaction
  list: FinTransaction[]
  onClose: () => void
  onNavigate: (tx: FinTransaction) => void
}

export function TransactionDetail({ tx, list, onClose, onNavigate }: Props) {
  const toast = useToast()
  const [tab, setTab] = useState<'general' | 'konto'>('general')
  const isMatched = tx.status === 'matched' || tx.status === 'partially_matched'
  const isCredit = tx.typ === 'prijem'
  const idx = list.findIndex(t => t.id === tx.id)

  const { data: suggestions = [] } = useMatchSuggestions(!isMatched ? tx.id : null)
  const manualMatchMut = useManualMatch()
  const unmatchMut = useUnmatchTransaction()

  const handleMatch = async (target: MatchTarget, entityId?: string) => {
    try {
      await manualMatchMut.mutateAsync({ txId: tx.id, dto: { target, entityId } })
      toast.success('Spárováno')
    } catch { toast.error('Párování selhalo') }
  }

  const handleUnmatch = async () => {
    try {
      await unmatchMut.mutateAsync(tx.id)
      toast.success('Odpárováno')
    } catch { toast.error('Odpárování selhalo') }
  }

  const mt = tx.matchTarget ? MATCH_TARGET_LABELS[tx.matchTarget] : null
  const st = STATUS_LABELS[tx.status] ?? STATUS_LABELS.unmatched

  return (
    <Modal open onClose={onClose} wide title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Transakce</span>
        <Badge variant={st.variant as any}>{st.label}</Badge>
        {mt && <Badge variant={mt.variant as any}>{mt.label}</Badge>}
      </div>
    } subtitle={
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <button className="btn btn--sm" disabled={idx <= 0} onClick={() => onNavigate(list[idx - 1])} style={{ padding: '4px 8px' }}><ChevronLeft size={14} /></button>
        <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{idx + 1} z {list.length}</span>
        <button className="btn btn--sm" disabled={idx >= list.length - 1} onClick={() => onNavigate(list[idx + 1])} style={{ padding: '4px 8px' }}><ChevronRight size={14} /></button>
      </div>
    }>
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn${tab === 'general' ? ' active' : ''}`} onClick={() => setTab('general')}>Obecné</button>
        {tx.matchTarget === 'KONTO' && <button className={`tab-btn${tab === 'konto' ? ' active' : ''}`} onClick={() => setTab('konto')}>Pohyby na kontě</button>}
      </div>

      {tab === 'general' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Left panel — basic info */}
          <div style={{ flex: 1, minWidth: 280 }}>
            {/* Amount highlight */}
            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 12 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: isCredit ? '#0d9488' : '#ef4444' }}>
                {isCredit ? '+' : '-'}{formatKc(Math.abs(tx.castka))}
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{isCredit ? 'Příjem' : 'Výdaj'}</div>
            </div>

            {row('Datum', formatCzDate(tx.datum))}
            {row('Variabilní symbol', tx.vs)}
            {row('Popis', tx.popis)}
            {row('Protiúčet', tx.protiUcet)}
            {row('Stav', <Badge variant={st.variant as any}>{st.label}</Badge>)}
            {mt && row('Cíl', <Badge variant={mt.variant as any}>{mt.label}</Badge>)}
            {tx.matchNote && row('Poznámka párování', tx.matchNote)}
            {tx.matchedAt && row('Spárováno', formatCzDate(tx.matchedAt))}
            {tx.prescriptionDesc && row('Předpis', tx.prescriptionDesc)}
            {tx.splitParentId && row('Rozděleno z', <span style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{tx.splitParentId.slice(0, 8)}…</span>)}
          </div>

          {/* Right panel — matching */}
          <div style={{ flex: 1, minWidth: 280 }}>
            {isMatched ? (
              <>
                <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Spárované entity</div>
                <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: '.85rem' }}>
                    {tx.matchedEntityType === 'prescription' && <Badge variant="green">Předpis</Badge>}
                    {tx.matchedEntityType === 'invoice' && <Badge variant="blue">Doklad</Badge>}
                    <span style={{ marginLeft: 8 }}>{tx.prescriptionDesc ?? tx.matchedEntityId?.slice(0, 8) ?? '—'}</span>
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    VS: {tx.vs || '—'} · Částka: {formatKc(tx.castka)}
                  </div>
                </div>
                <Button size="sm" variant="danger" onClick={handleUnmatch} disabled={unmatchMut.isPending}>
                  {unmatchMut.isPending ? 'Odpárovávám…' : 'Odpárovat'}
                </Button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Návrhy párování</div>
                {suggestions.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', fontStyle: 'italic' }}>Žádné návrhy</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(suggestions as MatchSuggestion[]).map(s => (
                      <div key={s.entityId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface-2, var(--surface))', borderRadius: 6, fontSize: '.84rem' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.label}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                            VS: {s.vs ?? '—'} · {formatKc(s.amount)}
                            {s.residentName && ` · ${s.residentName}`}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleMatch(s.entityType === 'invoice' ? 'INVOICE' : 'KONTO', s.entityId)}>
                          Spárovat
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                  <Button size="sm" onClick={() => handleMatch('NO_EFFECT')}>Bez vlivu</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pohyby na kontě tab */}
      {tab === 'konto' && (
        <div>
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Pohyby na kontě — transakce {tx.vs || tx.id.slice(0, 8)}
          </div>
          <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Datum', 'Předpis', 'VS', 'Částka', 'Stav'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>{formatCzDate(tx.datum)}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{tx.prescriptionDesc ?? '—'}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{tx.vs || '—'}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: isCredit ? '#0d9488' : '#ef4444' }}>{formatKc(tx.castka)}</td>
                  <td style={{ padding: '6px 8px' }}><Badge variant="green">Uhrazeno</Badge></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ padding: '8px', fontWeight: 600 }}>Bilance</td>
                  <td style={{ padding: '8px', fontWeight: 700, color: '#0d9488' }}>
                    {formatKc(0)} <span style={{ color: '#22c55e' }}>✓</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
            Detailní pohyby budou dostupné po napojení na konto ledger.
          </div>
        </div>
      )}
    </Modal>
  )
}

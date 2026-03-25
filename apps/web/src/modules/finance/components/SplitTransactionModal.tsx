import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { formatKc, formatCzDate } from '../../../shared/utils/format'
import { apiClient } from '../../../core/api/client'
import type { FinTransaction } from '../types'

interface SplitRow {
  amount: string
  description: string
}

interface Props {
  transaction: FinTransaction
  onClose: () => void
  onSuccess: () => void
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
  color: 'var(--text)', boxSizing: 'border-box', fontSize: '.84rem',
}

export function SplitTransactionModal({ transaction, onClose, onSuccess }: Props) {
  const toast = useToast()
  const [rows, setRows] = useState<SplitRow[]>([
    { amount: '', description: '' },
    { amount: '', description: '' },
  ])
  const [loading, setLoading] = useState(false)

  const total = transaction.castka
  const splitSum = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const remaining = Math.round((total - splitSum) * 100) / 100
  const isBalanced = Math.abs(remaining) <= 0.01

  const updateRow = (idx: number, key: keyof SplitRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r))
  }

  const addRow = () => setRows(prev => [...prev, { amount: '', description: '' }])

  const removeRow = (idx: number) => {
    if (rows.length <= 2) return
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSplit = async () => {
    if (!isBalanced) return
    setLoading(true)
    try {
      await apiClient.post(`/finance/transactions/${transaction.id}/split`, {
        splits: rows.map(r => ({
          amount: parseFloat(r.amount) || 0,
          description: r.description || undefined,
        })),
      })
      toast.success(`Transakce rozdělena na ${rows.length} částí`)
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Rozdělení se nezdařilo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Rozdělit transakci" wide footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={handleSplit} disabled={loading || !isBalanced}>
          {loading ? 'Rozděluji…' : 'Rozdělit'}
        </Button>
      </div>
    }>
      {/* Original transaction info */}
      <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '.85rem' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Částka:</span> <strong>{formatKc(total)}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Datum:</span> {formatCzDate(transaction.datum)}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>VS:</span> {transaction.vs || '—'}</div>
        </div>
        {transaction.popis && <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{transaction.popis}</div>}
      </div>

      {/* Split rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {rows.map((r, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', width: 20 }}>{idx + 1}.</span>
            <input
              type="number" min="0" step="0.01" placeholder="Částka" value={r.amount}
              onChange={e => updateRow(idx, 'amount', e.target.value)}
              style={{ ...inputStyle, width: 120, textAlign: 'right' }}
            />
            <input
              placeholder="Popis (volitelné)" value={r.description}
              onChange={e => updateRow(idx, 'description', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            {rows.length > 2 && (
              <button onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <Button size="sm" icon={<Plus size={14} />} onClick={addRow}>Přidat řádek</Button>

      {/* Balance indicator */}
      <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: isBalanced ? 'var(--surface-2, var(--surface))' : '#2d1b1b', border: `1px solid ${isBalanced ? 'var(--border)' : '#ef4444'}`, fontSize: '.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Součet částí: <strong>{formatKc(splitSum)}</strong></span>
          <span>Původní: <strong>{formatKc(total)}</strong></span>
        </div>
        {!isBalanced && (
          <div style={{ color: '#ef4444', fontWeight: 500, marginTop: 4 }}>
            {remaining > 0 ? `Zbývá rozdělit: ${formatKc(remaining)}` : `Přesah o: ${formatKc(Math.abs(remaining))}`}
          </div>
        )}
        {isBalanced && <div style={{ color: 'var(--success)', marginTop: 4 }}>✓ Součet odpovídá</div>}
      </div>
    </Modal>
  )
}

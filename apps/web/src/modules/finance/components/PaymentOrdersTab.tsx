import { useState } from 'react'
import { Plus, Download, Trash2 } from 'lucide-react'
import { Button, Badge, Modal, LoadingState, EmptyState } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../core/api/client'
import { useBankAccounts } from '../api/finance.queries'
import { formatKc, formatCzDate } from '../../../shared/utils/format'

interface PaymentOrderItem {
  counterpartyName: string
  counterpartyAccount: string
  counterpartyBankCode: string
  amount: string
  variableSymbol: string
  description: string
}

const emptyItem = (): PaymentOrderItem => ({ counterpartyName: '', counterpartyAccount: '', counterpartyBankCode: '', amount: '', variableSymbol: '', description: '' })

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box', fontSize: '.84rem',
}

export default function PaymentOrdersTab() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: accounts = [] } = useBankAccounts()
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['payment-orders'],
    queryFn: () => apiClient.get('/finance/payment-orders').then(r => r.data),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [bankAccountId, setBankAccountId] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<PaymentOrderItem[]>([emptyItem(), emptyItem()])

  const createMut = useMutation({
    mutationFn: (data: any) => apiClient.post('/finance/payment-orders', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-orders'] }); toast.success('Příkaz vytvořen'); setShowCreate(false) },
    onError: (error: any) => { toast.error(error?.response?.data?.message || 'Vytvoření příkazu selhalo') },
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/finance/payment-orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-orders'] }); toast.success('Příkaz zrušen') },
  })

  const handleExport = async (id: string, format: 'pdf' | 'abo') => {
    try {
      const res = await apiClient.post(`/finance/payment-orders/${id}/export`, { format }, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `prikaz.${format}`
      link.click()
      URL.revokeObjectURL(link.href)
      qc.invalidateQueries({ queryKey: ['payment-orders'] })
      toast.success(`Export ${format.toUpperCase()} stažen`)
    } catch { toast.error('Export selhal') }
  }

  const updateItem = (idx: number, key: keyof PaymentOrderItem, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it))
  }

  const total = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)

  const handleCreate = () => {
    const account = (accounts as any[]).find((a: any) => a.id === bankAccountId)
    if (!account?.financialContextId) {
      toast.error('Bankovní účet nemá přiřazen finanční kontext.')
      return
    }
    const validItems = items.filter(it => it.counterpartyAccount && it.amount)
    if (validItems.length === 0) {
      toast.error('Přidejte alespoň jednu položku s účtem a částkou')
      return
    }
    createMut.mutate({
      bankAccountId,
      financialContextId: account.financialContextId,
      note: note || undefined,
      items: validItems.map(it => ({
        counterpartyName: it.counterpartyName || undefined,
        counterpartyAccount: it.counterpartyAccount,
        counterpartyBankCode: it.counterpartyBankCode || '0000',
        amount: parseFloat(it.amount),
        variableSymbol: it.variableSymbol || undefined,
        description: it.description || undefined,
      })),
    })
  }

  const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
    draft: { label: 'Koncept', variant: 'muted' },
    exported: { label: 'Exportováno', variant: 'green' },
    cancelled: { label: 'Zrušeno', variant: 'red' },
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setShowCreate(true); setBankAccountId(''); setNote(''); setItems([emptyItem(), emptyItem()]) }}>
          Nový příkaz
        </Button>
      </div>

      {isLoading ? <LoadingState text="Načítání…" /> : (orders as any[]).length === 0 ? (
        <EmptyState title="Žádné příkazy" description="Vytvořte nový příkaz k úhradě." />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Datum', 'Účet', 'Položek', 'Stav', 'Akce'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(orders as any[]).map((o: any) => {
                const sb = STATUS_BADGE[o.status] ?? STATUS_BADGE.draft
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px' }}>{formatCzDate(o.createdAt)}</td>
                    <td style={{ padding: '8px 12px' }}>{o.bankAccount?.name ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{o._count?.items ?? 0}</td>
                    <td style={{ padding: '8px 12px' }}><Badge variant={sb.variant as any}>{sb.label}</Badge></td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleExport(o.id, 'pdf')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: 'var(--primary)' }}><Download size={13} /> PDF</button>
                        <button onClick={() => handleExport(o.id, 'abo')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: 'var(--primary)' }}><Download size={13} /> ABO</button>
                        {o.status === 'draft' && (
                          <button onClick={() => { if (confirm('Zrušit příkaz?')) cancelMut.mutate(o.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: 'var(--danger)' }}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal open onClose={() => setShowCreate(false)} title="Nový příkaz k úhradě" wide footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>Celkem: {formatKc(total)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => setShowCreate(false)}>Zrušit</Button>
              <Button variant="primary" onClick={handleCreate} disabled={createMut.isPending || !bankAccountId || items.every(i => !i.counterpartyAccount)}>
                {createMut.isPending ? 'Ukládám…' : 'Uložit koncept'}
              </Button>
            </div>
          </div>
        }>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Zdrojový účet *</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                <option value="">— vyberte —</option>
                {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.accountNumber})</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Poznámka</label>
              <input value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
            </div>
          </div>

          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>POLOŽKY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', width: 20 }}>{idx + 1}.</span>
                <input placeholder="Příjemce" value={it.counterpartyName} onChange={e => updateItem(idx, 'counterpartyName', e.target.value)} style={{ ...inputStyle, width: 120 }} />
                <input placeholder="Účet" value={it.counterpartyAccount} onChange={e => updateItem(idx, 'counterpartyAccount', e.target.value)} style={{ ...inputStyle, width: 120 }} />
                <input placeholder="Kód" value={it.counterpartyBankCode} onChange={e => updateItem(idx, 'counterpartyBankCode', e.target.value)} style={{ ...inputStyle, width: 50 }} />
                <input type="number" placeholder="Částka" value={it.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} style={{ ...inputStyle, width: 90, textAlign: 'right' }} />
                <input placeholder="VS" value={it.variableSymbol} onChange={e => updateItem(idx, 'variableSymbol', e.target.value)} style={{ ...inputStyle, width: 80 }} />
                <input placeholder="Popis" value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                {items.length > 1 && (
                  <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setItems(prev => [...prev, emptyItem()])} style={{ marginTop: 8 }}>Přidat položku</Button>
        </Modal>
      )}
    </div>
  )
}

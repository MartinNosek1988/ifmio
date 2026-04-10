import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, LoadingSkeleton } from '../../shared/components'
import { formatKc, formatCzDate } from '../../shared/utils/format'
import { expensesApi } from './api/expenses.api'

const CATEGORY_LABELS: Record<string, string> = {
  material: 'Material',
  fuel: 'PHM',
  transport: 'Doprava',
  tools: 'Nastroje',
  services: 'Sluzby',
  accommodation: 'Ubytovani',
  food: 'Stravne',
  other: 'Ostatni',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Navrh',
  submitted: 'Odeslan',
  approved: 'Schvaleno',
  rejected: 'Zamitnuto',
  reimbursed: 'Proplaceno',
}

const STATUS_VARIANT: Record<string, 'muted' | 'yellow' | 'green' | 'red' | 'blue'> = {
  draft: 'muted',
  submitted: 'yellow',
  approved: 'green',
  rejected: 'red',
  reimbursed: 'blue',
}

const TIMELINE_STEPS = ['draft', 'submitted', 'approved', 'reimbursed'] as const

const REIMBURSEMENT_LABELS: Record<string, string> = {
  cash: 'Hotovost',
  bank_transfer: 'Bankovni prevod',
  company_card: 'Firemni karta',
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesApi.getById(id!),
    enabled: !!id,
  })

  const submitMutation = useMutation({
    mutationFn: () => expensesApi.submit(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const approveMutation = useMutation({
    mutationFn: () => expensesApi.approve(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: () => expensesApi.reject(id!, rejectReason),
    onSuccess: () => {
      setShowRejectInput(false)
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })

  const reimburseMutation = useMutation({
    mutationFn: () => expensesApi.reimburse(id!, {
      reimbursedAmount: expense?.amountTotal ?? 0,
      reimbursementType: expense?.reimbursementType ?? 'cash',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  if (isLoading) return <LoadingSkeleton variant="detail" />
  if (!expense) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Vydaj nenalezen</div>

  const isRejected = expense.status === 'rejected'
  const stepIndex = isRejected
    ? TIMELINE_STEPS.indexOf('submitted')
    : TIMELINE_STEPS.indexOf(expense.status as typeof TIMELINE_STEPS[number])

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2,
  }
  const valueStyle: React.CSSProperties = {
    fontSize: '0.9rem', color: 'var(--dark)', fontWeight: 500,
  }

  return (
    <div>
      {/* Back + header */}
      <button
        onClick={() => navigate('/expenses')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginBottom: 12, padding: 0 }}
      >
        <ArrowLeft size={16} /> Zpet na vydaje
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', margin: 0, color: 'var(--dark)' }}>
            {expense.number}
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{expense.description}</div>
          <div style={{ marginTop: 8 }}>
            <Badge variant={STATUS_VARIANT[expense.status] ?? 'muted'}>
              {STATUS_LABELS[expense.status] ?? expense.status}
            </Badge>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {expense.status === 'draft' && (
            <Button variant="primary" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              Odeslat ke schvaleni
            </Button>
          )}
          {expense.status === 'submitted' && (
            <>
              <Button variant="primary" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                Schvalit
              </Button>
              <Button variant="danger" onClick={() => setShowRejectInput(true)}>
                Zamitnout
              </Button>
            </>
          )}
          {expense.status === 'approved' && (
            <Button variant="primary" onClick={() => reimburseMutation.mutate()} disabled={reimburseMutation.isPending}>
              Proplatit
            </Button>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {isRejected && expense.rejectionReason && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: 'var(--danger)',
          fontSize: '0.88rem',
        }}>
          <strong>Duvod zamitnuti:</strong> {expense.rejectionReason}
        </div>
      )}

      {/* Reject input */}
      {showRejectInput && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Duvod zamitnuti..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              border: '1px solid var(--border)', fontSize: '0.9rem',
            }}
          />
          <Button variant="danger" onClick={() => rejectMutation.mutate()} disabled={!rejectReason || rejectMutation.isPending}>
            Potvrdit zamitnuti
          </Button>
          <Button onClick={() => setShowRejectInput(false)}>Zrusit</Button>
        </div>
      )}

      {/* Timeline stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, overflowX: 'auto' }}>
        {TIMELINE_STEPS.map((s, i) => {
          const done = i <= stepIndex
          const isCurrent = i === stepIndex
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700,
                background: done ? (isRejected && isCurrent ? 'var(--danger)' : 'var(--primary, #6366f1)') : 'var(--gray-200)',
                color: done ? '#fff' : 'var(--text-muted)',
                border: isCurrent ? '2px solid var(--primary, #6366f1)' : 'none',
              }}>
                {i + 1}
              </div>
              <div style={{ marginLeft: 6, marginRight: 12, fontSize: '0.78rem', fontWeight: done ? 600 : 400, color: done ? 'var(--dark)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {STATUS_LABELS[s]}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div style={{ width: 32, height: 2, background: i < stepIndex ? 'var(--primary, #6366f1)' : 'var(--gray-200)', marginRight: 4 }} />
              )}
            </div>
          )
        })}
        {isRejected && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
            <div style={{ width: 32, height: 2, background: 'var(--danger)' }} />
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700,
              background: 'var(--danger)', color: '#fff',
            }}>
              !
            </div>
            <div style={{ marginLeft: 6, fontSize: '0.78rem', fontWeight: 600, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
              Zamitnuto
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: image + AI badge */}
        <div>
          {expense.imageBase64 && expense.mimeType && (
            <div style={{ marginBottom: 16 }}>
              <img
                src={`data:${expense.mimeType};base64,${expense.imageBase64}`}
                alt="Doklad"
                style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>
          )}
          {expense.aiConfidence != null && (
            <Badge variant={expense.aiConfidence > 0.8 ? 'green' : expense.aiConfidence > 0.5 ? 'yellow' : 'red'}>
              AI spolehlivost: {Math.round(expense.aiConfidence * 100)} %
            </Badge>
          )}
          {!expense.imageBase64 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
              Zadny doklad
            </div>
          )}
        </div>

        {/* Right: readonly fields */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={labelStyle}>Dodavatel</div>
              <div style={valueStyle}>{expense.vendor ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>ICO dodavatele</div>
              <div style={{ ...valueStyle, fontFamily: 'var(--font-mono, monospace)' }}>{expense.vendorIco ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Castka bez DPH</div>
              <div style={{ ...valueStyle, fontFamily: 'var(--font-mono, monospace)' }}>{formatKc(expense.amount)}</div>
            </div>
            <div>
              <div style={labelStyle}>DPH</div>
              <div style={valueStyle}>{expense.vatRate != null ? `${expense.vatRate} %` : '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Castka vcetne DPH</div>
              <div style={{ ...valueStyle, fontFamily: 'var(--font-mono, monospace)' }}>{formatKc(expense.amountTotal)}</div>
            </div>
            <div>
              <div style={labelStyle}>Kategorie</div>
              <div style={valueStyle}>{CATEGORY_LABELS[expense.category] ?? expense.category}</div>
            </div>
            <div>
              <div style={labelStyle}>Datum dokladu</div>
              <div style={valueStyle}>{formatCzDate(expense.receiptDate)}</div>
            </div>
            <div>
              <div style={labelStyle}>Cislo dokladu</div>
              <div style={valueStyle}>{expense.receiptNumber ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Nemovitost</div>
              <div style={valueStyle}>{expense.property?.name ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Pracovni ukol</div>
              <div style={valueStyle}>{expense.workOrderId ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Typ proplaceni</div>
              <div style={valueStyle}>{REIMBURSEMENT_LABELS[expense.reimbursementType] ?? expense.reimbursementType}</div>
            </div>
            <div>
              <div style={labelStyle}>Podal</div>
              <div style={valueStyle}>{expense.submittedByName ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Vytvoreno</div>
              <div style={valueStyle}>{formatCzDate(expense.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { KpiCard, Button, Badge, LoadingSkeleton } from '../../shared/components'
import { formatKc, formatCzDate } from '../../shared/utils/format'
import { expensesApi } from './api/expenses.api'
import type { ApiExpense } from './api/expenses.api'
import { ExpenseForm } from './ExpenseForm'

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

type ActiveTab = 'all' | 'my'

export default function ExpensesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['expenses', 'list', filterStatus, filterCategory],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus
      if (filterCategory) params.category = filterCategory
      return expensesApi.list(params)
    },
  })

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['expenses', 'my'],
    queryFn: () => expensesApi.my(),
  })

  const { data: stats } = useQuery({
    queryKey: ['expenses', 'stats'],
    queryFn: () => expensesApi.stats(),
  })

  const isLoading = activeTab === 'my' ? myLoading : listLoading
  const tableData: ApiExpense[] = (activeTab === 'my' ? myData : listData) ?? []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', margin: 0, color: 'var(--dark)' }}>
          Vydaje
        </h1>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          Novy vydaj
        </Button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Čeká na schválení" value={String(stats?.pending ?? 0)} color="var(--accent-yellow, #eab308)" />
        <KpiCard label="Schváleno" value={String(stats?.approved ?? 0)} color="var(--accent-green, #22c55e)" />
        <KpiCard label="K proplacení" value={String(stats?.toReimburse ?? 0)} color="var(--accent-blue, #3b82f6)" />
        <KpiCard label="Celkem tento měsíc" value={formatKc(stats?.totalThisMonth ?? 0)} color="var(--primary, #6366f1)" />
      </div>

      {/* Tab toggle + filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(['all', 'my'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '6px 16px',
                border: 'none',
                background: activeTab === t ? 'var(--primary, #6366f1)' : 'var(--color-surface, #fff)',
                color: activeTab === t ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              {t === 'all' ? 'Vsechny' : 'Moje vydaje'}
            </button>
          ))}
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--color-surface, #fff)', fontSize: '0.85rem',
          }}
        >
          <option value="">Vsechny stavy</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--color-surface, #fff)', fontSize: '0.85rem',
          }}
        >
          <option value="">Vsechny kategorie</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSkeleton variant="table" rows={6} columns={7} />
      ) : tableData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Zadne vydaje
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Cislo</th>
                <th>Popis</th>
                <th>Kategorie</th>
                <th style={{ textAlign: 'right' }}>Castka</th>
                <th>Podal</th>
                <th>Stav</th>
                <th>Datum</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/expenses/${e.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem' }}>{e.number}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.description}
                  </td>
                  <td>{CATEGORY_LABELS[e.category] ?? e.category}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
                    {formatKc(e.amountTotal)}
                  </td>
                  <td>{e.submittedByName ?? '-'}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[e.status] ?? 'muted'}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </Badge>
                  </td>
                  <td>{formatCzDate(e.receiptDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <ExpenseForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => setShowForm(false)}
      />
    </div>
  )
}

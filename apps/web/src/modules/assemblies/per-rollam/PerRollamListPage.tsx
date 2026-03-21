import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState } from '../../../shared/components'
import type { BadgeVariant } from '../../../shared/components'
import { usePerRollamList } from '../lib/perRollamApi'
import { PR_STATUS_LABELS, PR_STATUS_COLORS } from '../lib/perRollamTypes'
import PerRollamForm from './PerRollamForm'

export default function PerRollamListPage() {
  const { id: propertyId } = useParams()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const { data: votings, isLoading } = usePerRollamList(propertyId)

  if (isLoading) return <LoadingState />
  const items = votings ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hlasování per rollam</h1>
          <p className="page-subtitle">{items.length} hlasování</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nové hlasování</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Žádná hlasování" description="Vytvořte první hlasování per rollam." />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                {['#', 'Název', 'Termín', 'Stav', 'Účast', 'Výsledky'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(v => {
                const ballotsCount = v._count?.ballots ?? 0
                const totalS = Number(v.totalShares ?? 0)
                const respondedS = Number(v.respondedShares ?? 0)
                const pct = totalS > 0 ? ((respondedS / totalS) * 100).toFixed(1) : null
                const itemsCount = v._count?.items ?? 0

                return (
                  <tr key={v.id} onClick={() => navigate(`/properties/${propertyId}/per-rollam/${v.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>{v.votingNumber}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{v.title}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{new Date(v.deadline).toLocaleDateString('cs-CZ')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant={PR_STATUS_COLORS[v.status] as BadgeVariant}>{PR_STATUS_LABELS[v.status]}</Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {pct ? `${pct} %` : ballotsCount > 0 ? `0/${ballotsCount}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{itemsCount > 0 ? `${itemsCount} bodů` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && propertyId && <PerRollamForm propertyId={propertyId} onClose={() => setShowForm(false)} />}
    </div>
  )
}

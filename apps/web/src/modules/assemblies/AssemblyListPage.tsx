import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState } from '../../shared/components'
import type { BadgeVariant } from '../../shared/components'
import { useAssemblies } from './lib/assemblyApi'
import { STATUS_LABELS, STATUS_COLORS } from './lib/assemblyTypes'
import AssemblyForm from './AssemblyForm'

export default function AssemblyListPage() {
  const { id: propertyId } = useParams()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const { data: assemblies, isLoading } = useAssemblies(propertyId)

  if (isLoading) return <LoadingState />

  const items = assemblies ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shromáždění</h1>
          <p className="page-subtitle">{items.length} shromáždění</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
          Nové shromáždění
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Žádná shromáždění" description="Vytvořte první shromáždění vlastníků." />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                {['#', 'Název', 'Datum', 'Místo', 'Stav', 'Přítomnost', 'Usnesení'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(a => {
                const votingItems = a.agendaItems?.filter(i => i.requiresVote) ?? []
                const approved = votingItems.filter(i => i.result === 'SCHVALENO').length
                const totalS = Number(a.totalShares ?? 0)
                const presentS = Number(a.presentShares ?? 0)
                const pct = totalS > 0 ? ((presentS / totalS) * 100).toFixed(2) : null

                return (
                  <tr key={a.id}
                    onClick={() => navigate(`/properties/${propertyId}/assemblies/${a.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>{a.assemblyNumber}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.title}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {new Date(a.scheduledAt).toLocaleDateString('cs-CZ')}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '.8rem' }}>{a.location}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant={STATUS_COLORS[a.status] as BadgeVariant}>{STATUS_LABELS[a.status]}</Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{pct ? `${pct} %` : '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {votingItems.length > 0 ? `${approved}/${votingItems.length} schváleno` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && propertyId && (
        <AssemblyForm propertyId={propertyId} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

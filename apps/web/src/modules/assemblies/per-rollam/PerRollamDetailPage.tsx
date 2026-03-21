import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Download, Trash2, Copy } from 'lucide-react'
import { Badge, Button, LoadingState, ErrorState } from '../../../shared/components'
import type { BadgeVariant } from '../../../shared/components'
import { usePerRollam, usePerRollamTransition, useDeletePerRollam, usePerRollamBallots, usePerRollamProgress } from '../lib/perRollamApi'
import { PR_STATUS_LABELS, PR_STATUS_COLORS, BALLOT_STATUS_LABELS, BALLOT_STATUS_COLORS, type PerRollamBallot } from '../lib/perRollamTypes'
import { MAJORITY_LABELS, RESULT_LABELS } from '../lib/assemblyTypes'
import { BallotProgressBar } from './BallotProgressBar'
import PerRollamForm from './PerRollamForm'
import PerRollamItemForm from './PerRollamItemForm'
import BallotManualEntryModal from './BallotManualEntryModal'
import { apiClient } from '../../../core/api/client'

type Tab = 'items' | 'ballots' | 'results' | 'documents'

export default function PerRollamDetailPage() {
  const { id: propertyId, votingId } = useParams()
  const navigate = useNavigate()
  const { data: voting, isLoading, error } = usePerRollam(votingId!)
  const transitionMut = usePerRollamTransition()
  const deleteMut = useDeletePerRollam()
  const { data: ballots = [] } = usePerRollamBallots(votingId!)
  const { data: progress } = usePerRollamProgress(votingId!)

  const [tab, setTab] = useState<Tab>('items')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [manualBallot, setManualBallot] = useState<PerRollamBallot | null>(null)

  if (isLoading) return <LoadingState />
  if (error || !voting) return (
    <div>
      <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(`/properties/${propertyId}/per-rollam`)}>Zpět</Button>
      <ErrorState message="Hlasování nenalezeno." />
    </div>
  )

  const handleTransition = (action: 'publish' | 'close' | 'evaluate' | 'notify-results' | 'cancel') => {
    transitionMut.mutate({ id: voting.id, action })
  }

  const handleDelete = () => {
    if (!confirm('Opravdu smazat hlasování?')) return
    deleteMut.mutate(voting.id, { onSuccess: () => navigate(`/properties/${propertyId}/per-rollam`) })
  }

  const downloadPdf = async (type: string, ballotId?: string) => {
    const url = ballotId ? `/per-rollam/${voting.id}/pdf/ballot/${ballotId}` : `/per-rollam/${voting.id}/pdf/${type}`
    const res = await apiClient.get(url, { responseType: 'blob' })
    const u = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = u; a.download = `${type}-${voting.votingNumber}.pdf`; a.click()
    window.URL.revokeObjectURL(u)
  }

  const copyBallotUrl = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/hlasovani/${token}`)
  }

  const isActive = voting.status === 'PUBLISHED' || voting.status === 'CLOSED' || voting.status === 'COMPLETED'
  const submittedBallots = ballots.filter(b => b.status === 'SUBMITTED')
  const manualBallots = ballots.filter(b => b.status === 'MANUAL_ENTRY')
  const pendingBallots = ballots.filter(b => b.status === 'PENDING')

  const TABS: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: 'items', label: 'Hlasovací body' },
    { key: 'ballots', label: `Hlasovací lístky (${ballots.length})`, disabled: voting.status === 'DRAFT' },
    { key: 'results', label: 'Výsledky', disabled: voting.status === 'DRAFT' || voting.status === 'PUBLISHED' },
    { key: 'documents', label: 'Dokumenty' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(`/properties/${propertyId}/per-rollam`)}>Zpět</Button>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Per rollam #{voting.votingNumber}: {voting.title}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <Badge variant={PR_STATUS_COLORS[voting.status] as BadgeVariant}>{PR_STATUS_LABELS[voting.status]}</Badge>
            <span className="text-muted text-sm">Termín: {new Date(voting.deadline).toLocaleDateString('cs-CZ')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {voting.status === 'DRAFT' && (
            <>
              <Button onClick={() => setShowEdit(true)}>Upravit</Button>
              <Button variant="primary" onClick={() => handleTransition('publish')} disabled={transitionMut.isPending}>Publikovat</Button>
              <Button onClick={handleDelete} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></Button>
            </>
          )}
          {voting.status === 'PUBLISHED' && (
            <Button variant="primary" onClick={() => handleTransition('close')} disabled={transitionMut.isPending}>Uzavřít hlasování</Button>
          )}
          {voting.status === 'CLOSED' && (
            <>
              <Button variant="primary" onClick={() => handleTransition('evaluate')} disabled={transitionMut.isPending}>Vyhodnotit</Button>
              <Button onClick={() => handleTransition('notify-results')} disabled={transitionMut.isPending}>Oznámit výsledky</Button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && progress && (
        <BallotProgressBar
          submitted={submittedBallots.length}
          manualEntry={manualBallots.length}
          pending={pendingBallots.length}
          totalShares={progress.totalShares}
          respondedShares={progress.respondedShares}
          deadline={voting.deadline}
        />
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => !t.disabled && setTab(t.key)}
            disabled={t.disabled}
            style={t.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ITEMS TAB */}
      {tab === 'items' && (
        <div>
          {voting.status === 'DRAFT' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAddItem(true)}>Přidat bod</Button>
            </div>
          )}
          {(voting.items ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Žádné hlasovací body.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(voting.items ?? []).map(item => (
                <div key={item.id} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>{item.orderNumber}.</span>{item.title}
                    </div>
                    {item.description && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{item.description.slice(0, 120)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Badge variant="blue">{MAJORITY_LABELS[item.majorityType]}</Badge>
                    {item.result && <Badge variant={item.result === 'SCHVALENO' ? 'green' : item.result === 'NESCHVALENO' ? 'red' : 'muted'}>{RESULT_LABELS[item.result]}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BALLOTS TAB */}
      {tab === 'ballots' && (
        <div>
          {ballots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Žádné hlasovací lístky. Publikujte hlasování pro vygenerování.</div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Vlastník', 'Jednotky', 'Podíl', 'Stav', 'Metoda', 'Odevzdáno', 'Akce'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ballots.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 500 }}>{b.name}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '.8rem' }}>{b.unitIds.join(', ').slice(0, 20) || '—'}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{(Number(b.totalShare) * 100).toFixed(4)} %</td>
                      <td style={{ padding: '8px 10px' }}><Badge variant={BALLOT_STATUS_COLORS[b.status] as BadgeVariant}>{BALLOT_STATUS_LABELS[b.status]}</Badge></td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '.8rem' }}>{b.submissionMethod ?? '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '.8rem' }}>{b.submittedAt ? new Date(b.submittedAt).toLocaleDateString('cs-CZ') : '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {b.status === 'PENDING' && (
                            <Button size="sm" onClick={() => setManualBallot(b)}>Zadat ručně</Button>
                          )}
                          {b.accessToken && (
                            <Button size="sm" onClick={() => copyBallotUrl(b.accessToken!)} title="Kopírovat odkaz">
                              <Copy size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {tab === 'results' && (
        <div>
          {(voting.items ?? []).map(item => (
            <div key={item.id} style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.orderNumber}. {item.title}</div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>{MAJORITY_LABELS[item.majorityType]}</div>
              {item.result ? (
                <div style={{
                  padding: 12, borderRadius: 8, marginBottom: 8,
                  background: item.result === 'SCHVALENO' ? 'rgba(34,197,94,.1)' : item.result === 'NESCHVALENO' ? 'rgba(239,68,68,.1)' : 'rgba(100,100,100,.1)',
                  border: `1px solid ${item.result === 'SCHVALENO' ? '#22c55e' : item.result === 'NESCHVALENO' ? '#ef4444' : 'var(--border)'}`,
                }}>
                  <div style={{ fontWeight: 700, color: item.result === 'SCHVALENO' ? '#22c55e' : item.result === 'NESCHVALENO' ? '#ef4444' : 'var(--text-muted)' }}>
                    {RESULT_LABELS[item.result]}
                  </div>
                  <div style={{ fontSize: '.85rem', marginTop: 4 }}>
                    Pro: {fmtPct(item.votesFor)} | Proti: {fmtPct(item.votesAgainst)} | Zdržel se: {fmtPct(item.votesAbstain)}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Dosud nevyhodnoceno</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {tab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { type: 'cover-letter', label: 'Průvodní dopis', desc: 'Dopis vlastníkům s hlasovacími body' },
            { type: 'results', label: 'Výsledky hlasování', desc: 'Souhrnný protokol výsledků', disabled: voting.status === 'DRAFT' || voting.status === 'PUBLISHED' },
          ].map(doc => (
            <div key={doc.type} style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: doc.disabled ? 0.5 : 1 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{doc.label}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{doc.desc}</div>
              </div>
              <Button icon={<Download size={14} />} onClick={() => downloadPdf(doc.type)} disabled={doc.disabled}>Stáhnout PDF</Button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showEdit && <PerRollamForm propertyId={voting.propertyId} voting={voting} onClose={() => setShowEdit(false)} />}
      {showAddItem && <PerRollamItemForm votingId={voting.id} onClose={() => setShowAddItem(false)} />}
      {manualBallot && <BallotManualEntryModal votingId={voting.id} ballot={manualBallot} items={voting.items ?? []} onClose={() => setManualBallot(null)} />}
    </div>
  )
}

function fmtPct(val: string | null | undefined): string {
  if (!val) return '0.00 %'
  return (Number(val) * 100).toFixed(2) + ' %'
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Download, Trash2 } from 'lucide-react'
import { Badge, Button, LoadingState, ErrorState } from '../../shared/components'
import type { BadgeVariant } from '../../shared/components'
import { useAssembly, useAssemblyTransition, useDeleteAssembly, useDeleteAgendaItem } from './lib/assemblyApi'
import {
  STATUS_LABELS, STATUS_COLORS, MAJORITY_LABELS, RESULT_LABELS,
  type AgendaItem,
} from './lib/assemblyTypes'
import { QuorumBar } from './QuorumBar'
import AssemblyForm from './AssemblyForm'
import AgendaItemForm from './AgendaItemForm'
import AttendeeRegistration from './AttendeeRegistration'
import VotingPanel from './VotingPanel'
import { apiClient } from '../../core/api/client'

type Tab = 'program' | 'ucast' | 'hlasovani' | 'dokumenty'

export default function AssemblyDetailPage() {
  const { id: propertyId, assemblyId } = useParams()
  const navigate = useNavigate()
  const { data: assembly, isLoading, error } = useAssembly(assemblyId!)
  const transitionMut = useAssemblyTransition()
  const deleteMut = useDeleteAssembly()
  const deleteItemMut = useDeleteAgendaItem()

  const [tab, setTab] = useState<Tab>('program')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editItem, setEditItem] = useState<AgendaItem | null>(null)
  const [selectedVotingItem, setSelectedVotingItem] = useState<AgendaItem | null>(null)

  if (isLoading) return <LoadingState />
  if (error || !assembly) return (
    <div>
      <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(`/properties/${propertyId}/assemblies`)}>Zpět</Button>
      <ErrorState message="Shromáždění nenalezeno." />
    </div>
  )

  const handleTransition = (action: 'publish' | 'start' | 'complete' | 'cancel') => {
    transitionMut.mutate({ id: assembly.id, action })
  }

  const handleDelete = () => {
    if (!confirm('Opravdu smazat shromáždění?')) return
    deleteMut.mutate(assembly.id, { onSuccess: () => navigate(`/properties/${propertyId}/assemblies`) })
  }

  const downloadPdf = async (type: 'minutes' | 'attendance' | 'voting-report') => {
    const res = await apiClient.get(`/assemblies/${assembly.id}/pdf/${type}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-${assembly.assemblyNumber}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const totalS = Number(assembly.totalShares ?? 0)
  const presentS = Number(assembly.presentShares ?? 0)
  const isActive = assembly.status === 'IN_PROGRESS' || assembly.status === 'COMPLETED'
  const votingItems = (assembly.agendaItems ?? []).filter(i => i.requiresVote)

  const TABS: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: 'program', label: 'Program' },
    { key: 'ucast', label: 'Účast' },
    { key: 'hlasovani', label: 'Hlasování', disabled: !isActive },
    { key: 'dokumenty', label: 'Dokumenty', disabled: assembly.status !== 'COMPLETED' },
  ]

  return (
    <div>
      {/* Back */}
      <div style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(`/properties/${propertyId}/assemblies`)}>Zpět</Button>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Shromáždění #{assembly.assemblyNumber}: {assembly.title}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <Badge variant={STATUS_COLORS[assembly.status] as BadgeVariant}>{STATUS_LABELS[assembly.status]}</Badge>
            <span className="text-muted text-sm">
              {new Date(assembly.scheduledAt).toLocaleDateString('cs-CZ')} • {assembly.location}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {assembly.status === 'DRAFT' && (
            <>
              <Button onClick={() => setShowEdit(true)}>Upravit</Button>
              <Button variant="primary" onClick={() => handleTransition('publish')} disabled={transitionMut.isPending}>Publikovat</Button>
              <Button onClick={handleDelete} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></Button>
            </>
          )}
          {assembly.status === 'PUBLISHED' && (
            <>
              <Button onClick={() => setShowEdit(true)}>Upravit</Button>
              <Button variant="primary" onClick={() => handleTransition('start')} disabled={transitionMut.isPending}>Zahájit shromáždění</Button>
            </>
          )}
          {assembly.status === 'IN_PROGRESS' && (
            <Button variant="primary" onClick={() => handleTransition('complete')} disabled={transitionMut.isPending}>Ukončit shromáždění</Button>
          )}
          {assembly.status === 'COMPLETED' && (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button icon={<Download size={14} />} onClick={() => downloadPdf('minutes')}>Zápis</Button>
              <Button icon={<Download size={14} />} onClick={() => downloadPdf('attendance')}>Prezenční listina</Button>
              <Button icon={<Download size={14} />} onClick={() => downloadPdf('voting-report')}>Protokol</Button>
            </div>
          )}
        </div>
      </div>

      {/* Quorum bar */}
      {isActive && totalS > 0 && <QuorumBar presentShares={presentS} totalShares={totalS} />}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => !t.disabled && setTab(t.key)}
            disabled={t.disabled}
            style={t.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROGRAM TAB ────────────────────────────────── */}
      {tab === 'program' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAddItem(true)}>Přidat bod programu</Button>
          </div>

          {(assembly.agendaItems ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              Žádné body programu. Přidejte první bod.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(assembly.agendaItems ?? []).map(item => (
                <div key={item.id}
                  onClick={() => setEditItem(item)}
                  style={{
                    padding: 14, borderRadius: 10, cursor: 'pointer',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>{item.orderNumber}.</span>
                      {item.title}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        {item.description.slice(0, 120)}{item.description.length > 120 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {item.requiresVote && (
                      <Badge variant="blue">{MAJORITY_LABELS[item.majorityType]}</Badge>
                    )}
                    {!item.requiresVote && <Badge variant="muted">Info</Badge>}
                    {item.result && (
                      <Badge variant={item.result === 'SCHVALENO' ? 'green' : item.result === 'NESCHVALENO' ? 'red' : 'muted'}>
                        {RESULT_LABELS[item.result]}
                      </Badge>
                    )}
                    <Button size="sm" onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      deleteItemMut.mutate({ assemblyId: assembly.id, itemId: item.id })
                    }} style={{ color: 'var(--danger)', padding: '2px 6px' }}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ÚČAST TAB ──────────────────────────────────── */}
      {tab === 'ucast' && <AttendeeRegistration assembly={assembly} />}

      {/* ── HLASOVÁNÍ TAB ──────────────────────────────── */}
      {tab === 'hlasovani' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          {/* Left sidebar — agenda items */}
          <div style={{ borderRight: '1px solid var(--border)', paddingRight: 12 }}>
            <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 8, color: 'var(--text-muted)' }}>Body k hlasování</div>
            {votingItems.map(item => (
              <button key={item.id}
                onClick={() => setSelectedVotingItem(item)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 4,
                  borderRadius: 8, cursor: 'pointer', fontSize: '.82rem',
                  border: selectedVotingItem?.id === item.id ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border)',
                  background: selectedVotingItem?.id === item.id ? 'rgba(99,102,241,.08)' : 'var(--surface)',
                  color: 'var(--text)',
                }}>
                <div style={{ fontWeight: 600 }}>{item.orderNumber}. {item.title}</div>
                {item.result && (
                  <Badge variant={item.result === 'SCHVALENO' ? 'green' : item.result === 'NESCHVALENO' ? 'red' : 'muted'}>
                    {RESULT_LABELS[item.result]}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Right panel */}
          <div>
            {selectedVotingItem ? (
              <VotingPanel
                assemblyId={assembly.id}
                item={selectedVotingItem}
                attendees={assembly.attendees ?? []}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                Vyberte bod programu pro hlasování
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DOKUMENTY TAB ──────────────────────────────── */}
      {tab === 'dokumenty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { type: 'minutes', label: 'Zápis ze shromáždění', desc: 'Kompletní zápis s výsledky hlasování' },
            { type: 'attendance', label: 'Prezenční listina', desc: 'Seznam účastníků s podíly a podpisy' },
            { type: 'voting-report', label: 'Protokol hlasování', desc: 'Souhrnný přehled výsledků hlasování' },
          ].map(doc => (
            <div key={doc.type} style={{
              padding: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{doc.label}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{doc.desc}</div>
              </div>
              <Button icon={<Download size={14} />} onClick={() => downloadPdf(doc.type as any)}>
                Stáhnout PDF
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showEdit && (
        <AssemblyForm propertyId={assembly.propertyId} assembly={assembly} onClose={() => setShowEdit(false)} />
      )}
      {showAddItem && (
        <AgendaItemForm assemblyId={assembly.id} onClose={() => setShowAddItem(false)} />
      )}
      {editItem && (
        <AgendaItemForm assemblyId={assembly.id} item={editItem} onClose={() => setEditItem(null)} />
      )}
    </div>
  )
}

import { useState } from 'react'
import { Plus, Trash2, FileText, CheckCircle } from 'lucide-react'
import { Badge, Button } from '../../shared/components'
import type { BadgeVariant } from '../../shared/components'
import {
  useProtocolsBySource, useGenerateProtocol,
  useCompleteProtocol,
  useAddProtocolLine, useDeleteProtocolLine,
} from './api/protocols.queries'

interface Props {
  sourceType: 'helpdesk' | 'revision' | 'work_order'
  sourceId: string
  protocolType?: string
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rozpracovaný', completed: 'Dokončený', confirmed: 'Potvrzený',
}
const STATUS_COLOR: Record<string, BadgeVariant> = {
  draft: 'yellow', completed: 'green', confirmed: 'blue',
}
const SATISFACTION_LABEL: Record<string, string> = {
  satisfied: 'Spokojený', partially_satisfied: 'Částečně', dissatisfied: 'Nespokojený',
}
const SATISFACTION_COLOR: Record<string, BadgeVariant> = {
  satisfied: 'green', partially_satisfied: 'yellow', dissatisfied: 'red',
}
const LINE_TYPE_LABEL: Record<string, string> = {
  labor: 'Práce', material: 'Materiál', transport: 'Doprava', other: 'Ostatní',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
  color: 'var(--text)', boxSizing: 'border-box',
}

export default function ProtocolPanel({ sourceType, sourceId, protocolType }: Props) {
  const { data: protocols, isLoading } = useProtocolsBySource(sourceType, sourceId)
  const generateMutation = useGenerateProtocol()
  const completeMutation = useCompleteProtocol()
  const addLineMutation = useAddProtocolLine()
  const deleteLineMutation = useDeleteProtocolLine()

  const [showLineForm, setShowLineForm] = useState(false)
  const [lineForm, setLineForm] = useState({ name: '', lineType: 'labor', unit: 'hod', quantity: '1', description: '' })
  const [showComplete, setShowComplete] = useState(false)
  const [completeForm, setCompleteForm] = useState({
    satisfaction: 'satisfied', satisfactionComment: '',
    supplierSignatureName: '', customerSignatureName: '',
  })

  if (isLoading) return <div className="text-muted" style={{ padding: 16, textAlign: 'center' }}>Načítání...</div>

  const protocol = protocols?.[0] // Most recent

  if (!protocol) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div className="text-muted" style={{ marginBottom: 12 }}>Protokol dosud nebyl vytvořen.</div>
        <Button
          variant="primary"
          icon={<FileText size={14} />}
          onClick={() => generateMutation.mutate({
            sourceType,
            sourceId,
            protocolType: protocolType ?? (sourceType === 'revision' ? 'revision_report' : 'work_report'),
          })}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? 'Generuji...' : 'Vygenerovat protokol'}
        </Button>
        {generateMutation.isError && (
          <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>Nepodařilo se vygenerovat protokol.</div>
        )}
      </div>
    )
  }

  const handleAddLine = () => {
    if (!lineForm.name.trim()) return
    addLineMutation.mutate({
      protocolId: protocol.id,
      dto: {
        name: lineForm.name.trim(),
        lineType: lineForm.lineType,
        unit: lineForm.unit || undefined,
        quantity: parseFloat(lineForm.quantity) || 1,
        description: lineForm.description || undefined,
      },
    }, {
      onSuccess: () => {
        setLineForm({ name: '', lineType: 'labor', unit: 'hod', quantity: '1', description: '' })
        setShowLineForm(false)
      },
    })
  }

  const handleComplete = () => {
    if (completeForm.satisfaction === 'dissatisfied' && !completeForm.satisfactionComment.trim()) return
    completeMutation.mutate({
      id: protocol.id,
      dto: {
        satisfaction: completeForm.satisfaction,
        satisfactionComment: completeForm.satisfactionComment || undefined,
        supplierSignatureName: completeForm.supplierSignatureName || undefined,
        customerSignatureName: completeForm.customerSignatureName || undefined,
      },
    }, { onSuccess: () => setShowComplete(false) })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{protocol.number}</span>
          <Badge variant={STATUS_COLOR[protocol.status]}>{STATUS_LABEL[protocol.status]}</Badge>
        </div>
        {protocol.status === 'draft' && (
          <Button size="sm" variant="primary" icon={<CheckCircle size={14} />} onClick={() => setShowComplete(true)}>
            Dokončit předání
          </Button>
        )}
      </div>

      {/* Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {protocol.requesterName && <InfoField label="Zadavatel" value={protocol.requesterName} />}
        {protocol.dispatcherName && <InfoField label="Dispečer" value={protocol.dispatcherName} />}
        {protocol.resolverName && <InfoField label="Řešitel" value={protocol.resolverName} />}
      </div>

      {/* Description */}
      {protocol.description && (
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)', marginBottom: 16 }}>
          <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Popis požadavku</div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{protocol.description}</div>
        </div>
      )}

      {/* Lines table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Výkony a materiál ({protocol.lines.length})</div>
          {protocol.status === 'draft' && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowLineForm(!showLineForm)}>
              Přidat řádek
            </Button>
          )}
        </div>

        {protocol.lines.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Typ</th>
                <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Popis</th>
                <th style={{ textAlign: 'left', padding: '6px 0', width: 60 }} className="text-muted">MJ</th>
                <th style={{ textAlign: 'right', padding: '6px 0', width: 60 }} className="text-muted">Počet</th>
                {protocol.status === 'draft' && <th style={{ width: 36 }} />}
              </tr>
            </thead>
            <tbody>
              {protocol.lines.map((line) => (
                <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0' }}>
                    <Badge variant="muted">{LINE_TYPE_LABEL[line.lineType] ?? line.lineType}</Badge>
                  </td>
                  <td style={{ padding: '6px 0' }}>
                    {line.name}
                    {line.description && <div className="text-muted" style={{ fontSize: '0.8rem' }}>{line.description}</div>}
                  </td>
                  <td style={{ padding: '6px 0' }}>{line.unit ?? '—'}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>{line.quantity}</td>
                  {protocol.status === 'draft' && (
                    <td style={{ padding: '6px 0' }}>
                      <button
                        onClick={() => deleteLineMutation.mutate({ protocolId: protocol.id, lineId: line.id })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                        title="Smazat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {protocol.lines.length === 0 && (
          <div className="text-muted" style={{ textAlign: 'center', padding: 12 }}>Zatím žádné řádky.</div>
        )}
      </div>

      {/* Add line form */}
      {showLineForm && protocol.status === 'draft' && (
        <div style={{ border: '2px solid var(--accent-blue, #6366f1)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="form-label">Typ</label>
              <select value={lineForm.lineType} onChange={(e) => setLineForm({ ...lineForm, lineType: e.target.value })} style={inputStyle}>
                {Object.entries(LINE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Popis *</label>
              <input value={lineForm.name} onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })} style={inputStyle} placeholder="Popis práce / materiálu" />
            </div>
            <div>
              <label className="form-label">MJ</label>
              <input value={lineForm.unit} onChange={(e) => setLineForm({ ...lineForm, unit: e.target.value })} style={inputStyle} placeholder="hod, ks, m" />
            </div>
            <div>
              <label className="form-label">Počet</label>
              <input type="number" value={lineForm.quantity} onChange={(e) => setLineForm({ ...lineForm, quantity: e.target.value })} style={inputStyle} min="0" step="0.01" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="primary" onClick={handleAddLine} disabled={addLineMutation.isPending || !lineForm.name.trim()}>
              {addLineMutation.isPending ? 'Přidávám...' : 'Přidat'}
            </Button>
            <Button size="sm" onClick={() => setShowLineForm(false)}>Zrušit</Button>
          </div>
        </div>
      )}

      {/* Transport */}
      {(protocol.transportKm || protocol.transportMode) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {protocol.transportKm && <InfoField label="Doprava (km)" value={String(protocol.transportKm)} />}
          {protocol.transportMode && <InfoField label="Způsob dopravy" value={protocol.transportMode} />}
        </div>
      )}

      {/* Handover / satisfaction */}
      {protocol.status !== 'draft' && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 10 }}>Předání</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <InfoField label="Datum předání" value={protocol.handoverAt ? new Date(protocol.handoverAt).toLocaleDateString('cs-CZ') : '—'} />
            {protocol.satisfaction && (
              <div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spokojenost</div>
                <Badge variant={SATISFACTION_COLOR[protocol.satisfaction]}>
                  {SATISFACTION_LABEL[protocol.satisfaction] ?? protocol.satisfaction}
                </Badge>
              </div>
            )}
            {protocol.supplierSignatureName && <InfoField label="Podpis dodavatel" value={protocol.supplierSignatureName} />}
            {protocol.customerSignatureName && <InfoField label="Podpis odběratel" value={protocol.customerSignatureName} />}
          </div>
          {protocol.satisfactionComment && (
            <div style={{ marginTop: 10 }}>
              <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2 }}>Komentář</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{protocol.satisfactionComment}</div>
            </div>
          )}
        </div>
      )}

      {/* Complete form */}
      {showComplete && protocol.status === 'draft' && (
        <div style={{ border: '2px solid var(--accent-blue, #6366f1)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Dokončit a předat</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Spokojenost</label>
              <select
                value={completeForm.satisfaction}
                onChange={(e) => setCompleteForm({ ...completeForm, satisfaction: e.target.value })}
                style={inputStyle}
              >
                {Object.entries(SATISFACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">
                Komentář{completeForm.satisfaction === 'dissatisfied' ? ' *' : ''}
              </label>
              <input
                value={completeForm.satisfactionComment}
                onChange={(e) => setCompleteForm({ ...completeForm, satisfactionComment: e.target.value })}
                style={inputStyle}
                placeholder="Komentář k předání"
              />
            </div>
            <div>
              <label className="form-label">Podpis dodavatel</label>
              <input
                value={completeForm.supplierSignatureName}
                onChange={(e) => setCompleteForm({ ...completeForm, supplierSignatureName: e.target.value })}
                style={inputStyle}
                placeholder="Jméno"
              />
            </div>
            <div>
              <label className="form-label">Podpis odběratel</label>
              <input
                value={completeForm.customerSignatureName}
                onChange={(e) => setCompleteForm({ ...completeForm, customerSignatureName: e.target.value })}
                style={inputStyle}
                placeholder="Jméno"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="sm" variant="primary"
              onClick={handleComplete}
              disabled={completeMutation.isPending || (completeForm.satisfaction === 'dissatisfied' && !completeForm.satisfactionComment.trim())}
            >
              {completeMutation.isPending ? 'Dokončuji...' : 'Dokončit předání'}
            </Button>
            <Button size="sm" onClick={() => setShowComplete(false)}>Zrušit</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

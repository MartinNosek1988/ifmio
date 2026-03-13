import { useState } from 'react'
import { Modal, Badge, Button, LoadingState } from '../../shared/components'
import type { BadgeVariant } from '../../shared/components'
import { useRevisionPlan, usePlanHistory, useRecordRevisionEvent } from './api/revisions.queries'
import ProtocolPanel from '../protocols/ProtocolPanel'

interface Props {
  planId: string
  onClose: () => void
}

const COMPLIANCE_LABEL: Record<string, string> = {
  compliant: 'V pořádku', due_soon: 'Blíží se', overdue: 'Po termínu', overdue_critical: 'Kritické',
  performed_pending_protocol: 'Bez protokolu', performed_pending_signature: 'Čeká podpis', performed_unconfirmed: 'Nepotvrzeno',
}
const COMPLIANCE_COLOR: Record<string, BadgeVariant> = {
  compliant: 'green', due_soon: 'yellow', overdue: 'red', overdue_critical: 'red',
  performed_pending_protocol: 'yellow', performed_pending_signature: 'yellow', performed_unconfirmed: 'muted',
}
const RESULT_LABEL: Record<string, string> = {
  passed: 'Prošlo', passed_with_notes: 'Prošlo s pozn.', failed: 'Neprošlo',
  cancelled: 'Zrušeno', planned: 'Plánováno',
}
const RESULT_COLOR: Record<string, BadgeVariant> = {
  passed: 'green', passed_with_notes: 'yellow', failed: 'red',
  cancelled: 'muted', planned: 'blue',
}

type TabKey = 'detail' | 'history' | 'protocol'

export default function RevisionPlanDetailModal({ planId, onClose }: Props) {
  const { data: plan, isLoading } = useRevisionPlan(planId)
  const { data: history } = usePlanHistory(planId)
  const recordMutation = useRecordRevisionEvent()

  const [tab, setTab] = useState<TabKey>('detail')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showRecord, setShowRecord] = useState(false)
  const [eventSummary, setEventSummary] = useState('')
  const [eventVendor, setEventVendor] = useState('')
  const [eventPerformer, setEventPerformer] = useState('')
  const [eventResult, setEventResult] = useState('passed')

  if (isLoading || !plan) {
    return <Modal open onClose={onClose} title="Načítání..."><LoadingState /></Modal>
  }

  const cs = plan.complianceStatus ?? 'compliant'
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'

  const handleRecord = () => {
    recordMutation.mutate({
      planId: plan.id,
      dto: {
        resultStatus: eventResult,
        summary: eventSummary || undefined,
        vendorName: eventVendor || undefined,
        performedBy: eventPerformer || undefined,
        performedAt: new Date().toISOString(),
      },
    }, {
      onSuccess: () => {
        setShowRecord(false)
        setEventSummary('')
        setEventVendor('')
        setEventPerformer('')
      },
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const tabItems = [
    { key: 'detail' as const, label: 'Detail' },
    { key: 'history' as const, label: `Historie (${history?.length ?? 0})` },
    { key: 'protocol' as const, label: 'Protokol' },
  ]

  return (
    <Modal
      open onClose={onClose} wide
      title={plan.title}
      subtitle={[plan.property?.name, plan.revisionType?.name].filter(Boolean).join(' · ') || undefined}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="primary" onClick={() => setShowRecord(true)}>Zapsat provedení</Button>
          <Button onClick={onClose}>Zavřít</Button>
        </div>
      }
    >
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabItems.map((t) => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'detail' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Badge variant={COMPLIANCE_COLOR[cs]}>{COMPLIANCE_LABEL[cs] || cs}</Badge>
            {plan.isMandatory && <Badge variant="red">Povinná</Badge>}
            <Badge variant="muted">{plan.status === 'active' ? 'Aktivní' : plan.status === 'paused' ? 'Pozastavený' : 'Archivovaný'}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <InfoField label="Předmět" value={plan.revisionSubject?.name ?? '—'} />
            <InfoField label="Typ revize" value={plan.revisionType?.name ?? '—'} />
            <InfoField label="Objekt" value={plan.property?.name ?? '—'} />
            <InfoField label="Interval" value={`${plan.intervalDays} dní`} />
            <InfoField label="Další termín" value={fmtDate(plan.nextDueAt)} />
            <InfoField label="Poslední provedení" value={fmtDate(plan.lastPerformedAt)} />
            <InfoField label="Odpovědný" value={plan.responsibleUser?.name ?? '—'} />
            <InfoField label="Dodavatel" value={plan.vendorName ?? '—'} />
            <InfoField label="Reminder" value={`${plan.reminderDaysBefore} dní předem`} />
          </div>

          {plan.description && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Popis</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{plan.description}</div>
            </div>
          )}

          {plan.revisionSubject && (plan.revisionSubject.manufacturer || plan.revisionSubject.model || plan.revisionSubject.location) && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Zařízení</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {plan.revisionSubject.manufacturer && <InfoField label="Výrobce" value={plan.revisionSubject.manufacturer} />}
                {plan.revisionSubject.model && <InfoField label="Model" value={plan.revisionSubject.model} />}
                {plan.revisionSubject.location && <InfoField label="Umístění" value={plan.revisionSubject.location} />}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {(!history || history.length === 0) ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
              Dosud žádné provedené revize.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Datum</th>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Výsledek</th>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Provedl</th>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Shrnutí</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {history.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0' }}>{fmtDate(ev.performedAt)}</td>
                    <td style={{ padding: '8px 0' }}>
                      <Badge variant={RESULT_COLOR[ev.resultStatus] || 'muted'}>
                        {RESULT_LABEL[ev.resultStatus] || ev.resultStatus}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 0' }}>{ev.performedBy ?? ev.vendorName ?? '—'}</td>
                    <td style={{ padding: '8px 0' }} className="text-muted">{ev.summary ?? '—'}</td>
                    <td style={{ padding: '8px 0' }}>
                      <Button size="sm" onClick={() => { setSelectedEventId(ev.id); setTab('protocol') }}>
                        Protokol
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'protocol' && (
        <div>
          {selectedEventId ? (
            <ProtocolPanel sourceType="revision" sourceId={selectedEventId} protocolType="revision_report" />
          ) : (
            <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
              Vyberte událost z historie pro zobrazení nebo vytvoření protokolu.
            </div>
          )}
        </div>
      )}

      {/* Record event inline form */}
      {showRecord && (
        <div style={{ marginTop: 16, padding: 14, border: '2px solid var(--accent-blue, #6366f1)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Zapsat provedení revize</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Výsledek</label>
              <select value={eventResult} onChange={(e) => setEventResult(e.target.value)} style={inputStyle}>
                {Object.entries(RESULT_LABEL).filter(([k]) => k !== 'planned').map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Provedl</label>
              <input value={eventPerformer} onChange={(e) => setEventPerformer(e.target.value)} style={inputStyle} placeholder="Jméno" />
            </div>
            <div>
              <label className="form-label">Dodavatel</label>
              <input value={eventVendor} onChange={(e) => setEventVendor(e.target.value)} style={inputStyle} placeholder="Dodavatel" />
            </div>
            <div>
              <label className="form-label">Shrnutí</label>
              <input value={eventSummary} onChange={(e) => setEventSummary(e.target.value)} style={inputStyle} placeholder="Krátké shrnutí" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" size="sm" onClick={handleRecord} disabled={recordMutation.isPending}>
              {recordMutation.isPending ? 'Ukládám...' : 'Zapsat'}
            </Button>
            <Button size="sm" onClick={() => setShowRecord(false)}>Zrušit</Button>
          </div>
        </div>
      )}
    </Modal>
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

import { useState } from 'react'
import { Badge, Button, Modal, LoadingState, EmptyState } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useProperties } from '../../properties/use-properties'
import {
  usePropertyReminders,
  useGenerateReminders,
  useMarkReminderSent,
  useMarkReminderResolved,
  useCancelReminder,
} from '../api/konto-reminders.queries'
import type { KontoReminderRow } from '../api/konto-reminders.api'

/* ── formatting helpers ── */

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ')
}

/* ── style constants ── */

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '.8rem',
  color: 'var(--text-muted)',
  borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--primary)',
  cursor: 'pointer',
  fontSize: '.8rem',
  fontWeight: 500,
  padding: '2px 6px',
  borderRadius: 4,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: '.9rem',
  background: 'var(--surface)',
  color: 'var(--text)',
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: '.85rem',
  background: 'var(--surface)',
  color: 'var(--text)',
  marginBottom: 16,
}

/* ── helpers ── */

function getStatusBadge(status: string): { variant: string; label: string } {
  switch (status) {
    case 'DRAFT':
      return { variant: 'muted', label: 'Ke schválení' }
    case 'SENT':
      return { variant: 'blue', label: 'Odesláno' }
    case 'ACKNOWLEDGED':
      return { variant: 'blue', label: 'Potvrzeno' }
    case 'RESOLVED':
      return { variant: 'green', label: 'Vyřešeno' }
    case 'CANCELLED':
      return { variant: 'muted', label: 'Zrušeno' }
    default:
      return { variant: 'muted', label: status }
  }
}

/* ── component ── */

export default function RemindersTab() {
  const toast = useToast()
  const { data: properties = [] } = useProperties()

  const [propertyId, setPropertyId] = useState<string>('')
  if (!propertyId && properties.length > 0) setPropertyId(properties[0].id)

  const [statusFilter, setStatusFilter] = useState<string>('DRAFT')
  const { data: reminders = [], isLoading } = usePropertyReminders(
    propertyId || undefined,
    statusFilter || undefined,
  )

  const generateMut = useGenerateReminders()
  const sendMut = useMarkReminderSent()
  const resolveMut = useMarkReminderResolved()
  const cancelMut = useCancelReminder()

  const [showGenerate, setShowGenerate] = useState(false)
  const [genMinAmount, setGenMinAmount] = useState('100')
  const [genMinDays, setGenMinDays] = useState('15')

  const [showText, setShowText] = useState<KontoReminderRow | null>(null)
  const [sendTarget, setSendTarget] = useState<KontoReminderRow | null>(null)

  const handleGenerate = () => {
    if (!propertyId) return
    generateMut.mutate(
      {
        propertyId,
        minAmount: parseFloat(genMinAmount) || 100,
        minDaysOverdue: parseInt(genMinDays) || 15,
      },
      {
        onSuccess: (data) => {
          toast.success(`Vygenerováno ${data.length} upomínek`)
          setShowGenerate(false)
        },
        onError: () => toast.error('Generování selhalo'),
      },
    )
  }

  const handleSend = (reminderId: string, method: string) => {
    sendMut.mutate(
      { reminderId, method },
      {
        onSuccess: () => {
          toast.success('Upomínka odeslána')
          setSendTarget(null)
        },
      },
    )
  }

  return (
    <div>
      {/* Property selector */}
      {properties.length > 1 && (
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          style={selectStyle}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant="primary" onClick={() => setShowGenerate(true)}>
          Generovat upomínky
        </Button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: '', label: 'Všechny' },
          { key: 'DRAFT', label: 'Ke schválení' },
          { key: 'SENT', label: 'Odeslané' },
          { key: 'RESOLVED', label: 'Vyřešené' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`tab-btn${statusFilter === f.key ? ' active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reminders table */}
      {isLoading ? (
        <LoadingState text="Načítání..." />
      ) : reminders.length === 0 ? (
        <EmptyState
          title="Žádné upomínky"
          description="Vygenerujte upomínky tlačítkem výše."
        />
      ) : (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '.85rem',
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Vlastník</th>
                <th style={thStyle}>Jednotka</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Částka</th>
                <th style={thStyle}>Stupeň</th>
                <th style={thStyle}>Stav</th>
                <th style={thStyle}>Splatnost</th>
                <th style={thStyle}>Odesláno</th>
                <th style={thStyle}>Akce</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((r) => {
                const resName =
                  r.resident.isLegalEntity && r.resident.companyName
                    ? r.resident.companyName
                    : `${r.resident.lastName} ${r.resident.firstName}`
                const levelColor =
                  r.reminderNumber === 1
                    ? 'yellow'
                    : r.reminderNumber === 2
                      ? 'orange'
                      : 'red'
                const statusBadge = getStatusBadge(r.status)
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={tdStyle}>{r.reminderNumber}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500 }}>{resName}</span>
                    </td>
                    <td style={tdStyle}>{r.unit.name}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        color: '#ef4444',
                      }}
                    >
                      {fmtCzk(r.amount)}
                    </td>
                    <td style={tdStyle}>
                      <Badge variant={levelColor as any}>
                        {r.reminderNumber}. upomínka
                      </Badge>
                    </td>
                    <td style={tdStyle}>
                      <Badge variant={statusBadge.variant as any}>
                        {statusBadge.label}
                      </Badge>
                      {r.status === 'RESOLVED' && r.note?.includes('Automaticky vyřešeno') && (
                        <div className="text-muted" style={{ fontSize: '.72rem', marginTop: 2 }}>
                          (automaticky)
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>{fmtDate(r.dueDate)}</td>
                    <td style={tdStyle}>
                      {r.sentAt ? fmtDate(r.sentAt) : '—'}
                      {r.sentMethod && (
                        <span
                          className="text-muted"
                          style={{ fontSize: '.75rem', marginLeft: 4 }}
                        >
                          ({r.sentMethod})
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
                      >
                        {r.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => setSendTarget(r)}
                              style={linkBtnStyle}
                            >
                              Odeslat
                            </button>
                            <button
                              onClick={() =>
                                cancelMut.mutate(r.id, {
                                  onSuccess: () => toast.success('Zrušeno'),
                                  onError: () => toast.error('Nepodařilo se zrušit upomínku'),
                                })
                              }
                              style={linkBtnStyle}
                            >
                              Zrušit
                            </button>
                          </>
                        )}
                        {r.status === 'SENT' && (
                          <button
                            onClick={() =>
                              resolveMut.mutate(r.id, {
                                onSuccess: () => toast.success('Vyřešeno'),
                                onError: () => toast.error('Nepodařilo se označit upomínku jako vyřešenou'),
                              })
                            }
                            style={linkBtnStyle}
                          >
                            Vyřešeno
                          </button>
                        )}
                        {r.generatedText && (
                          <button
                            onClick={() => setShowText(r)}
                            style={linkBtnStyle}
                            data-testid="reminder-show-text-btn"
                          >
                            Text
                          </button>
                        )}
                        {r.status === 'RESOLVED' && r.note && (
                          <span className="text-muted" style={{ fontSize: '.75rem' }} title={r.note}>
                            {r.note.length > 30 ? r.note.slice(0, 30) + '…' : r.note}
                          </span>
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

      {/* Generate modal */}
      <Modal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        title="Generovat upomínky"
        footer={
          <div
            style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
          >
            <Button onClick={() => setShowGenerate(false)}>Zrušit</Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generateMut.isPending}
            >
              {generateMut.isPending ? 'Generuji...' : 'Generovat'}
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Minimální dluh (Kč)</label>
          <input
            type="number"
            value={genMinAmount}
            onChange={(e) => setGenMinAmount(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="form-label">Min. dní po splatnosti</label>
          <input
            type="number"
            value={genMinDays}
            onChange={(e) => setGenMinDays(e.target.value)}
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* Text modal */}
      <Modal
        open={!!showText}
        onClose={() => setShowText(null)}
        title="Text upomínky"
      >
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: '.85rem',
            lineHeight: 1.6,
          }}
        >
          {showText?.generatedText}
        </pre>
      </Modal>

      {/* Send method modal */}
      {sendTarget && (
        <Modal
          open
          onClose={() => setSendTarget(null)}
          title="Odeslat upomínku"
          subtitle={`Upomínka #${sendTarget.reminderNumber}`}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {(['EMAIL', 'DATABOX', 'POST', 'IN_PERSON'] as const).map(
              (m) => (
                <Button
                  key={m}
                  onClick={() => handleSend(sendTarget.id, m)}
                  disabled={sendMut.isPending}
                >
                  {m === 'EMAIL'
                    ? 'Email'
                    : m === 'DATABOX'
                      ? 'Datová schránka'
                      : m === 'POST'
                        ? 'Poštou'
                        : 'Osobně'}
                </Button>
              ),
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

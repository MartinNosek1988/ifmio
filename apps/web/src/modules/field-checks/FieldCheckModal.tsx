import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Shield, MapPin, Camera, BookOpen, Activity } from 'lucide-react'
import { Button, Badge } from '../../shared/components'
import type { BadgeVariant } from '../../shared/components'
import { useCreateFieldCheck } from './api/field-checks.queries'
import type { FieldCheckSignalInput, FieldCheckResult, FieldCheckConfidenceLevel } from './api/field-checks.api'

interface Props {
  assetId: string
  assetName: string
  scanEventId?: string
  onClose: () => void
  onSuccess?: (checkId: string) => void
}

interface ChecklistItem {
  id: string
  label: string
  checked: boolean | null
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'visible', label: 'Zařízení je viditelně v pořádku', checked: null },
  { id: 'running', label: 'Zařízení je v provozu / je funkční', checked: null },
  { id: 'leaks', label: 'Žádné úniky nebo abnormality', checked: null },
  { id: 'readings', label: 'Provozní hodnoty jsou v normě', checked: null },
  { id: 'access', label: 'Přístup a okolí bez překážek', checked: null },
]

const RESULT_OPTIONS: { value: FieldCheckResult; label: string; variant: BadgeVariant; icon: React.ReactNode }[] = [
  { value: 'ok', label: 'V pořádku', variant: 'green', icon: <CheckCircle size={15} /> },
  { value: 'issue_found', label: 'Zjištěna závada', variant: 'red', icon: <XCircle size={15} /> },
  { value: 'needs_follow_up', label: 'Vyžaduje sledování', variant: 'yellow', icon: <AlertTriangle size={15} /> },
  { value: 'not_accessible', label: 'Nepřístupné', variant: 'muted', icon: <XCircle size={15} /> },
]

const CONFIDENCE_LABEL: Record<FieldCheckConfidenceLevel, string> = {
  low: 'Nízká',
  medium: 'Střední',
  high: 'Vysoká',
}
const CONFIDENCE_COLOR: Record<FieldCheckConfidenceLevel, string> = {
  low: '#f59e0b',
  medium: '#3b82f6',
  high: '#22c55e',
}

function computeLocalConfidence(
  hasQr: boolean,
  hasGps: boolean,
  checklistCount: number,
  hasReading: boolean,
): { score: number; level: FieldCheckConfidenceLevel } {
  let score = 0
  if (hasQr) score += 30
  if (hasGps) score += 25
  if (checklistCount > 0) score += Math.min(15, checklistCount * 3)
  if (hasReading) score += 15
  score = Math.min(score, 100)
  const level: FieldCheckConfidenceLevel = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  return { score, level }
}

export default function FieldCheckModal({ assetId, assetName, scanEventId, onClose, onSuccess }: Props) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST)
  const [result, setResult] = useState<FieldCheckResult | null>(null)
  const [notes, setNotes] = useState('')
  const [reading, setReading] = useState('')
  const [gpsGranted, setGpsGranted] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsError, setGpsError] = useState('')

  const checklistDone = checklist.filter((c) => c.checked !== null).length
  const { score, level } = computeLocalConfidence(!!scanEventId, gpsGranted, checklistDone, !!reading)

  const createMutation = useCreateFieldCheck(assetId)

  function toggleChecklist(id: string, value: boolean) {
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, checked: value } : c)))
  }

  function requestGps() {
    if (!navigator.geolocation) {
      setGpsError('GPS není dostupné')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setGpsGranted(true)
        setGpsError('')
      },
      () => setGpsError('GPS poloha nedostupná'),
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  async function handleSubmit() {
    if (!result) return

    const signals: FieldCheckSignalInput[] = []

    if (scanEventId) {
      signals.push({ signalType: 'qr_scan', isValid: true, payloadJson: { scanEventId } })
    }

    if (gpsCoords) {
      signals.push({
        signalType: 'gps',
        isValid: true,
        payloadJson: { latitude: gpsCoords.lat, longitude: gpsCoords.lng, accuracyMeters: gpsCoords.accuracy },
      })
    }

    const answeredItems = checklist.filter((c) => c.checked !== null)
    if (answeredItems.length > 0) {
      signals.push({
        signalType: 'checklist',
        isValid: answeredItems.every((c) => c.checked === true),
        payloadJson: {
          items: answeredItems.map((c) => ({ id: c.id, label: c.label, checked: c.checked })),
        },
      })
    }

    if (reading.trim()) {
      signals.push({
        signalType: 'reading',
        isValid: true,
        payloadJson: { value: reading.trim() },
      })
    }

    const check = await createMutation.mutateAsync({
      input: {
        checkType: 'daily_check',
        result,
        notes: notes.trim() || undefined,
        signals,
      },
      scanEventId,
    })

    onSuccess?.(check.id)
    onClose()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'flex-end', justifyContent: 'center',
  }

  const sheetStyle: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: '16px 16px 0 0',
    width: '100%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px 20px',
  }

  const sectionTitle: React.CSSProperties = {
    fontWeight: 700, fontSize: '0.88rem',
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 10,
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Ověření zařízení</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>{assetName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
            <XCircle size={20} />
          </button>
        </div>

        {/* Confidence indicator */}
        <div style={{
          background: 'var(--surface-alt, var(--surface))', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Shield size={16} style={{ color: CONFIDENCE_COLOR[level] }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 3 }}>Věrohodnost záznamu</div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${score}%`, background: CONFIDENCE_COLOR[level], transition: 'all 0.3s' }} />
            </div>
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: CONFIDENCE_COLOR[level] }}>
            {CONFIDENCE_LABEL[level]} ({score}%)
          </span>
        </div>

        {/* Signals: QR already present */}
        {scanEventId && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--success, #22c55e)' }}>
            <CheckCircle size={14} /> QR kód naskenován — identita potvrzena
          </div>
        )}

        {/* GPS */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionTitle}><MapPin size={13} style={{ marginRight: 4 }} />Poloha (GPS)</p>
          {gpsCoords ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--success, #22c55e)' }}>
              <CheckCircle size={13} style={{ marginRight: 4 }} />
              {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)} (±{Math.round(gpsCoords.accuracy)}m)
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Button size="sm" onClick={requestGps}>Získat polohu</Button>
              {gpsError && <span style={{ fontSize: '0.82rem', color: 'var(--danger, #ef4444)' }}>{gpsError}</span>}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionTitle}><BookOpen size={13} style={{ marginRight: 4 }} />Kontrolní seznam</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checklist.map((item) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: 'var(--surface-alt, var(--surface))',
                border: '1px solid var(--border)', borderRadius: 8,
              }}>
                <span style={{ fontSize: '0.88rem', flex: 1 }}>{item.label}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => toggleChecklist(item.id, true)}
                    style={{
                      padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                      background: item.checked === true ? '#22c55e' : 'var(--border)',
                      color: item.checked === true ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => toggleChecklist(item.id, false)}
                    style={{
                      padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                      background: item.checked === false ? '#ef4444' : 'var(--border)',
                      color: item.checked === false ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reading */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionTitle}><Activity size={13} style={{ marginRight: 4 }} />Provozní hodnota (volitelné)</p>
          <input
            type="text"
            placeholder="Naměřená hodnota (např. 72°C, 1.8 bar, 250 kWh…)"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
              borderRadius: 8, background: 'var(--surface-alt, var(--surface))',
              color: 'var(--text)', fontSize: '0.88rem', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Photo placeholder */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionTitle}><Camera size={13} style={{ marginRight: 4 }} />Foto (brzy)</p>
          <div style={{
            padding: '14px 16px', border: '1px dashed var(--border)', borderRadius: 8,
            fontSize: '0.83rem', color: 'var(--text-muted)', textAlign: 'center',
          }}>
            Nahrávání fotografií bude brzy k dispozici
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <p style={sectionTitle}>Poznámky</p>
          <textarea
            rows={3}
            placeholder="Volitelné poznámky ke kontrole…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
              borderRadius: 8, background: 'var(--surface-alt, var(--surface))',
              color: 'var(--text)', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Result */}
        <div style={{ marginBottom: 24 }}>
          <p style={sectionTitle}>Výsledek kontroly</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {RESULT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setResult(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', border: `2px solid ${result === opt.value ? 'var(--accent-blue)' : 'var(--border)'}`,
                  borderRadius: 10, background: result === opt.value ? 'var(--accent-blue-bg, rgba(99,102,241,0.08))' : 'var(--surface-alt, var(--surface))',
                  cursor: 'pointer', fontWeight: result === opt.value ? 700 : 400, fontSize: '0.88rem',
                  color: 'var(--text)', transition: 'all 0.15s',
                }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button size="sm" onClick={onClose}>Zrušit</Button>
          <Button
            size="sm"
            disabled={!result || createMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending ? 'Ukládám…' : 'Uložit kontrolu'}
          </Button>
        </div>

        {createMutation.isError && (
          <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--danger, #ef4444)' }}>
            Chyba při ukládání. Zkuste znovu.
          </div>
        )}
      </div>
    </div>
  )
}

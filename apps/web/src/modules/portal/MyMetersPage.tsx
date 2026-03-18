import { useState } from 'react'
import { useMyMeters, useSubmitReading } from './api/portal.queries'
import { LoadingSpinner, Modal, Button } from '../../shared/components'
import { ChevronDown, ChevronUp } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  elektrina: 'Elektřina', voda_studena: 'Studená voda', voda_tepla: 'Teplá voda', plyn: 'Plyn', teplo: 'Teplo',
}

export default function MyMetersPage() {
  const { data: meters, isLoading, error } = useMyMeters()
  const submitMut = useSubmitReading()
  const [readingMeter, setReadingMeter] = useState<any>(null)
  const [form, setForm] = useState({ value: '', readingDate: new Date().toISOString().slice(0, 10), note: '' })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-danger">Nepodařilo se načíst měřiče.</div>

  if (!meters?.length) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Žádné měřiče</div>
  }

  const handleSubmit = () => {
    if (!readingMeter || !form.value) return
    submitMut.mutate({
      meterId: readingMeter.id,
      data: { value: Number(form.value), readingDate: form.readingDate, note: form.note || undefined },
    }, {
      onSuccess: () => {
        setReadingMeter(null)
        setForm({ value: '', readingDate: new Date().toISOString().slice(0, 10), note: '' })
      },
    })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'grid', gap: 12 }}>
        {meters.map((m: any) => (
          <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{m.name}</div>
                <div className="text-muted" style={{ fontSize: '.82rem' }}>
                  {TYPE_LABELS[m.meterType] ?? m.meterType} — {m.serialNumber}
                </div>
                {m.unitRel && <div className="text-muted" style={{ fontSize: '.78rem' }}>{m.unitRel.name}</div>}
              </div>
              <Button size="sm" onClick={() => { setReadingMeter(m); setForm(f => ({ ...f, value: '' })) }}>Zadat odečet</Button>
            </div>
            {m.lastReading != null && (
              <div style={{ marginTop: 8, fontSize: '.85rem' }}>
                Poslední odečet: <strong>{m.lastReading} {m.unit}</strong>
                {m.lastReadingDate && <span className="text-muted"> ({m.lastReadingDate.slice(0, 10)})</span>}
              </div>
            )}
            {m.readings?.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={() => setExpanded(e => ({ ...e, [m.id]: !e[m.id] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #6366f1)', fontSize: '.78rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Historie ({m.readings.length}) {expanded[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {expanded[m.id] && (
                  <table style={{ width: '100%', fontSize: '.8rem', marginTop: 6, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0', color: 'var(--text-muted)' }}>Datum</th>
                        <th style={{ textAlign: 'right', padding: '4px 0', color: 'var(--text-muted)' }}>Hodnota</th>
                        <th style={{ textAlign: 'right', padding: '4px 0', color: 'var(--text-muted)' }}>Spotřeba</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.readings.map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '4px 0' }}>{r.readingDate?.slice(0, 10)}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>{r.value} {m.unit}</td>
                          <td style={{ textAlign: 'right', padding: '4px 0' }}>{r.consumption != null ? `${r.consumption} ${m.unit}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {readingMeter && (
        <Modal open onClose={() => setReadingMeter(null)} title={`Odečet: ${readingMeter.name}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setReadingMeter(null)}>Zrušit</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitMut.isPending || !form.value}>
                {submitMut.isPending ? 'Ukládám...' : 'Uložit odečet'}
              </Button>
            </div>
          }
        >
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Hodnota odečtu ({readingMeter.unit}) *</label>
            <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={inputStyle} step="0.001" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Datum odečtu *</label>
            <input type="date" value={form.readingDate} onChange={e => setForm(f => ({ ...f, readingDate: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label className="form-label">Poznámka</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={inputStyle} placeholder="Volitelná poznámka..." />
          </div>
          {submitMut.isError && <div className="text-danger" style={{ fontSize: '.85rem', marginTop: 8 }}>Nepodařilo se uložit odečet.</div>}
        </Modal>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Plus, Trash2, Shield, AlertTriangle } from 'lucide-react'

// ── Constants ──────────────────────────────────────────

const INSURANCE_TYPES: Record<string, { label: string; color: string }> = {
  BUILDING: { label: 'Pojištění budovy', color: '#3B82F6' },
  LIABILITY: { label: 'Odpovědnost', color: '#8B5CF6' },
  MACHINERY: { label: 'Stroje / technika', color: '#F97316' },
  DIRECTORS: { label: 'D&O pojištění', color: '#0D9B8A' },
  OTHER: { label: 'Ostatní', color: '#9CA3AF' },
}

const CLAIM_STATUSES: Record<string, { label: string; bg: string; color: string }> = {
  REPORTED: { label: 'Nahlášeno', bg: '#DBEAFE', color: '#1D4ED8' },
  IN_PROGRESS: { label: 'Řeší se', bg: '#FEF3C7', color: '#92400E' },
  APPROVED: { label: 'Schváleno', bg: '#DCFCE7', color: '#166534' },
  REJECTED: { label: 'Zamítnuto', bg: '#FEE2E2', color: '#991B1B' },
  PAID: { label: 'Vyplaceno', bg: '#CCFBF1', color: '#115E59' },
  CLOSED: { label: 'Uzavřeno', bg: '#F3F4F6', color: '#374151' },
}

// ── Component ──────────────────────────────────────────

export default function InsuranceTab({ property }: { property: { id: string } }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)

  const { data: insurances = [], isLoading } = useQuery<any[]>({
    queryKey: ['insurances', property.id],
    queryFn: () => apiClient.get(`/properties/${property.id}/insurances`).then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/properties/${property.id}/insurances/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurances', property.id] }),
  })

  const createMut = useMutation({
    mutationFn: (data: any) => apiClient.post(`/properties/${property.id}/insurances`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['insurances', property.id] }); setShowForm(false) },
  })

  // Expiring soon (within 60 days)
  const now = new Date()
  const soon = new Date(now.getTime() + 60 * 86400000)
  const expiring = insurances.filter(i => i.isActive && i.validTo && new Date(i.validTo) <= soon)

  if (isLoading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám...</div>

  return (
    <div>
      {/* Expiring alert */}
      {expiring.length > 0 && (
        <div style={{ padding: '10px 16px', background: '#FEF3C7', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
          <AlertTriangle size={16} style={{ color: '#92400E' }} />
          <span style={{ fontWeight: 600, color: '#92400E' }}>{expiring.length} pojistka/y expiruje v příštích 60 dnech</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={18} /> Pojištění ({insurances.length})
        </h3>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
          <Plus size={14} /> Přidat pojistku
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <InsuranceForm onSubmit={data => createMut.mutate(data)} onCancel={() => setShowForm(false)} isPending={createMut.isPending} />
      )}

      {/* Table */}
      {insurances.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={th}>Typ</th>
              <th style={th}>Pojišťovna</th>
              <th style={th}>Č. smlouvy</th>
              <th style={th}>Platnost</th>
              <th style={{ ...th, textAlign: 'right' }}>Roční pojistné</th>
              <th style={{ ...th, textAlign: 'right' }}>Pojistná částka</th>
              <th style={{ ...th, textAlign: 'center' }}>Události</th>
              <th style={{ ...th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {insurances.map((ins: any) => {
              const typeInfo = INSURANCE_TYPES[ins.type] || INSURANCE_TYPES.OTHER
              const isExpiring = ins.isActive && ins.validTo && new Date(ins.validTo) <= soon
              return (
                <tr key={ins.id} style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)', cursor: 'pointer' }}
                  onClick={() => setDetail(detail === ins.id ? null : ins.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600, background: typeInfo.color + '20', color: typeInfo.color }}>
                      {typeInfo.label}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 500 }}>{ins.provider}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem' }}>{ins.policyNumber || '—'}</td>
                  <td style={td}>
                    {new Date(ins.validFrom).toLocaleDateString('cs-CZ')}
                    {ins.validTo ? ` – ${new Date(ins.validTo).toLocaleDateString('cs-CZ')}` : ' – neurčito'}
                    {isExpiring && <span style={{ marginLeft: 4, color: '#92400E', fontWeight: 600 }}>⚠️</span>}
                    {!ins.isActive && <span style={{ marginLeft: 4, color: 'var(--text-muted)' }}>(neaktivní)</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{ins.annualPremium ? `${Number(ins.annualPremium).toLocaleString('cs-CZ')} Kč` : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{ins.insuredAmount ? `${Number(ins.insuredAmount).toLocaleString('cs-CZ')} Kč` : '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{ins._count?.claims || 0}</td>
                  <td style={td} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { if (confirm('Smazat pojistku?')) deleteMut.mutate(ins.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Shield size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div>Žádné pojistky</div>
          <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Přidejte pojištění budovy, odpovědnosti nebo D&O.</div>
        </div>
      )}

      {/* Detail + Claims */}
      {detail && <InsuranceDetail insuranceId={detail} propertyId={property.id} />}
    </div>
  )
}

// ── Insurance Form ─────────────────────────────────────

function InsuranceForm({ onSubmit, onCancel, isPending }: { onSubmit: (d: any) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ type: 'BUILDING', provider: '', policyNumber: '', validFrom: '', validTo: '', annualPremium: '', insuredAmount: '', deductible: '', notes: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ padding: 16, background: 'var(--border-light, #f9fafb)', borderRadius: 8, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
        <div>
          <label style={lbl}>Typ *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
            {Object.entries(INSURANCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Pojišťovna *</label>
          <input value={form.provider} onChange={e => set('provider', e.target.value)} style={inp} placeholder="Kooperativa, ČPP..." />
        </div>
        <div>
          <label style={lbl}>Č. smlouvy</label>
          <input value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Platnost od *</label>
          <input type="date" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Platnost do</label>
          <input type="date" value={form.validTo} onChange={e => set('validTo', e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Roční pojistné (Kč)</label>
          <input type="number" value={form.annualPremium} onChange={e => set('annualPremium', e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Pojistná částka (Kč)</label>
          <input type="number" value={form.insuredAmount} onChange={e => set('insuredAmount', e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Spoluúčast (Kč)</label>
          <input type="number" value={form.deductible} onChange={e => set('deductible', e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSecondary}>Zrušit</button>
        <button onClick={() => {
          if (!form.provider || !form.validFrom) return
          onSubmit({
            ...form,
            annualPremium: form.annualPremium ? Number(form.annualPremium) : undefined,
            insuredAmount: form.insuredAmount ? Number(form.insuredAmount) : undefined,
            deductible: form.deductible ? Number(form.deductible) : undefined,
            validTo: form.validTo || undefined,
          })
        }} disabled={isPending} style={btnPrimary}>Vytvořit</button>
      </div>
    </div>
  )
}

// ── Insurance Detail + Claims ──────────────────────────

function InsuranceDetail({ insuranceId, propertyId }: { insuranceId: string; propertyId: string }) {
  const qc = useQueryClient()
  const { data: ins } = useQuery<any>({
    queryKey: ['insurance-detail', insuranceId],
    queryFn: () => apiClient.get(`/properties/${propertyId}/insurances/${insuranceId}`).then(r => r.data),
  })

  const createClaimMut = useMutation({
    mutationFn: (data: any) => apiClient.post(`/insurances/${insuranceId}/claims`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance-detail', insuranceId] }),
  })

  if (!ins) return null

  return (
    <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>Pojistné události ({ins.claims?.length || 0})</h4>

      {ins.claims?.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginBottom: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={th}>Datum</th>
              <th style={th}>Typ</th>
              <th style={th}>Popis</th>
              <th style={th}>Stav</th>
              <th style={{ ...th, textAlign: 'right' }}>Požadováno</th>
              <th style={{ ...th, textAlign: 'right' }}>Vyplaceno</th>
            </tr>
          </thead>
          <tbody>
            {ins.claims.map((c: any) => {
              const st = CLAIM_STATUSES[c.status] || CLAIM_STATUSES.REPORTED
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={td}>{new Date(c.eventDate).toLocaleDateString('cs-CZ')}</td>
                  <td style={td}>{c.type}</td>
                  <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</td>
                  <td style={td}><span style={{ padding: '2px 6px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span></td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.claimedAmount ? `${Number(c.claimedAmount).toLocaleString('cs-CZ')} Kč` : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.paidAmount ? `${Number(c.paidAmount).toLocaleString('cs-CZ')} Kč` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>Žádné pojistné události</div>}

      <button onClick={() => {
        const desc = prompt('Popis události:')
        if (!desc) return
        createClaimMut.mutate({ eventDate: new Date().toISOString(), description: desc, type: 'OTHER' })
      }} style={btnSecondary}>
        <Plus size={14} /> Nahlásit událost
      </button>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────

const th: React.CSSProperties = { padding: '6px 8px', whiteSpace: 'nowrap', fontSize: '0.75rem' }
const td: React.CSSProperties = { padding: '6px 8px' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }
const inp: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border, #d1d5db)', fontSize: '0.82rem' }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--primary, #0d9488)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }
const btnSecondary: React.CSSProperties = { padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }

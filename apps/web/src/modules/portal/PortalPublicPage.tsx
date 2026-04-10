import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, FileText, Wallet, FolderOpen, Gauge, AlertTriangle, Mail } from 'lucide-react'
import { apiClient } from '../../core/api/client'
import { LoadingSpinner } from '../../shared/components'

// Standalone public portal — no JWT, token-based access

interface DashboardData {
  owner: { name: string }
  units: any[]
  kontoBalance: number
  prescriptions: any[]
  unreadMessages: number
}

const fmtKc = (v: number) => v.toLocaleString('cs-CZ') + ' Kč'
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'

export default function PortalPublicPage() {
  const { token } = useParams<{ token: string }>()
  const [tab, setTab] = useState<'overview' | 'konto' | 'prescriptions' | 'documents' | 'meters'>('overview')

  // Dashboard (overview)
  const { data: dashboard, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['portal-public', token, 'dashboard'],
    queryFn: () => apiClient.get(`/portal-public/${token}/dashboard`).then(r => r.data),
    enabled: !!token,
    retry: false,
  })

  // Tab-specific data (lazy loaded)
  const { data: kontoData } = useQuery({
    queryKey: ['portal-public', token, 'konto'],
    queryFn: () => apiClient.get(`/portal-public/${token}/konto`).then(r => r.data),
    enabled: !!token && tab === 'konto',
  })

  const { data: prescriptions } = useQuery({
    queryKey: ['portal-public', token, 'prescriptions'],
    queryFn: () => apiClient.get(`/portal-public/${token}/prescriptions`).then(r => r.data),
    enabled: !!token && tab === 'prescriptions',
  })

  const { data: documents } = useQuery({
    queryKey: ['portal-public', token, 'documents'],
    queryFn: () => apiClient.get(`/portal-public/${token}/documents`).then(r => r.data),
    enabled: !!token && tab === 'documents',
  })

  const { data: meters } = useQuery({
    queryKey: ['portal-public', token, 'meters'],
    queryFn: () => apiClient.get(`/portal-public/${token}/meters`).then(r => r.data),
    enabled: !!token && tab === 'meters',
  })

  // Error state — invalid/expired token
  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <AlertTriangle size={48} style={{ color: 'var(--danger, #ef4444)', marginBottom: 16 }} />
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>Přístup není dostupný</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              Odkaz na portál vlastníka je neplatný nebo jeho platnost vypršela.
              Kontaktujte prosím správce Vaší nemovitosti pro získání nového přístupu.
            </p>
            <a href="mailto:podpora@ifmio.com" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', background: 'var(--primary, #6366f1)', color: '#fff',
              borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
            }}>
              <Mail size={16} /> Kontaktovat správce
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!dashboard) return null

  const balance = dashboard.kontoBalance ?? 0
  const units = dashboard.units ?? []
  const totalMonthly = (dashboard.prescriptions ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
  const propertyNames = [...new Set(units.map((u: any) => u.property?.name).filter(Boolean))].join(', ')

  const tabs = [
    { id: 'overview' as const, label: 'Přehled', icon: <Building2 size={16} /> },
    { id: 'konto' as const, label: 'Konto', icon: <Wallet size={16} /> },
    { id: 'prescriptions' as const, label: 'Předpisy', icon: <FileText size={16} /> },
    { id: 'documents' as const, label: 'Dokumenty', icon: <FolderOpen size={16} /> },
    { id: 'meters' as const, label: 'Měřidla', icon: <Gauge size={16} /> },
  ]

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ background: '#1e1b4b', padding: '20px 24px', borderRadius: '12px 12px 0 0', color: '#fff' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>ifmio</div>
          <div style={{ fontSize: '0.82rem', opacity: 0.7, marginTop: 2 }}>Portál vlastníka</div>
        </div>

        {/* Welcome */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Dobrý den, {dashboard.owner.name}
          </h1>
          {propertyNames && <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.85rem', marginTop: 4 }}>{propertyNames}</div>}
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border, #e5e7eb)', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 16px', fontSize: '0.85rem', fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--primary, #6366f1)' : 'var(--text-muted, #6b7280)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--primary, #6366f1)' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '20px 24px', minHeight: 300 }}>

          {/* Overview */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                <StatCard label="Konto" value={`${balance >= 0 ? '+' : ''}${fmtKc(balance)}`} color={balance >= 0 ? '#22c55e' : '#ef4444'} onClick={() => setTab('konto')} />
                <StatCard label="Měsíční předpis" value={fmtKc(totalMonthly)} color="#3b82f6" onClick={() => setTab('prescriptions')} />
                <StatCard label="Jednotky" value={String(units.length)} color="#6366f1" />
              </div>

              {/* Units list */}
              <h3 style={sectionTitle}>Moje jednotky</h3>
              {units.map((u: any) => (
                <div key={u.id} style={cardStyle}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name ?? u.unitName}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #6b7280)' }}>
                    {u.property?.name} · {u.property?.address}
                  </div>
                  {u.relation && <div style={{ fontSize: '0.78rem', marginTop: 4, color: 'var(--primary, #6366f1)' }}>{u.relation === 'owner' ? 'Vlastník' : 'Nájemník'}</div>}
                </div>
              ))}

              {/* Prescriptions preview */}
              {(dashboard.prescriptions ?? []).length > 0 && (
                <>
                  <h3 style={sectionTitle}>Aktuální předpisy</h3>
                  {dashboard.prescriptions.map((p: any) => (
                    <div key={p.id} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.88rem' }}>{p.description}</span>
                        <span style={{ fontWeight: 600 }}>{fmtKc(Number(p.amount ?? 0))}</span>
                      </div>
                      {p.variableSymbol && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)' }}>VS: {p.variableSymbol}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Konto */}
          {tab === 'konto' && (
            <div>
              <div style={{ textAlign: 'center', padding: '20px 0 24px', borderBottom: '1px solid var(--border, #e5e7eb)', marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>Celkový stav konta</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: balance >= 0 ? '#22c55e' : '#ef4444' }}>
                  {balance >= 0 ? '+' : ''}{fmtKc(balance)}
                </div>
              </div>
              {(kontoData?.accounts ?? []).map((acc: any) => (
                <div key={acc.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>{acc.unitName}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: acc.currentBalance >= 0 ? '#22c55e' : '#ef4444', marginBottom: 8 }}>
                    Stav: {acc.currentBalance >= 0 ? '+' : ''}{fmtKc(Number(acc.currentBalance))}
                  </div>
                  {(acc.entries ?? []).slice(0, 10).map((e: any) => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem', borderBottom: '1px solid var(--border, #f3f4f6)' }}>
                      <span style={{ color: 'var(--text-muted, #6b7280)' }}>{fmtDate(e.effectiveDate ?? e.createdAt)}</span>
                      <span>{e.description ?? e.source}</span>
                      <span style={{ fontWeight: 500, color: Number(e.amount) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {Number(e.amount) >= 0 ? '+' : ''}{fmtKc(Number(e.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {!(kontoData?.accounts ?? []).length && <EmptyMsg text="Žádné záznamy na kontě" />}
            </div>
          )}

          {/* Prescriptions */}
          {tab === 'prescriptions' && (
            <div>
              {(prescriptions ?? []).length === 0 && <EmptyMsg text="Žádné předpisy" />}
              {(prescriptions ?? []).map((p: any) => (
                <div key={p.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p.description}</span>
                    <span style={{ fontWeight: 700 }}>{fmtKc(Number(p.amount ?? 0))}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)' }}>
                    {p.unitName && `${p.unitName} · `}
                    {p.variableSymbol && `VS: ${p.variableSymbol} · `}
                    Splatnost: {p.dueDay ?? '—'}. den
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Documents */}
          {tab === 'documents' && (
            <div>
              {(documents ?? []).length === 0 && <EmptyMsg text="Žádné dokumenty" />}
              {(documents ?? []).map((d: any) => (
                <div key={d.id} style={cardStyle}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{d.name ?? d.fileName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>
                    {d.category && `${d.category} · `}{d.entityType}
                    {d.tags?.length > 0 && ` · ${d.tags.join(', ')}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Meters */}
          {tab === 'meters' && (
            <div>
              {(meters ?? []).length === 0 && <EmptyMsg text="Žádná měřidla" />}
              {(meters ?? []).map((m: any) => (
                <div key={m.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{m.name}</span>
                    <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-muted, #6b7280)' }}>{m.serialNumber}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
                    {m.meterType} · {m.unit}
                    {m.lastReading != null && ` · Poslední odečet: ${m.lastReading} ${m.unit}`}
                    {m.lastReadingDate && ` (${fmtDate(m.lastReadingDate)})`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e5e7eb)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)' }}>
          ifmio · Klientský portál vlastníka
        </div>
      </div>
    </div>
  )
}

// ── Helper components ──

function StatCard({ label, value, color, onClick }: { label: string; value: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 10, padding: 16, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function EmptyMsg({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted, #6b7280)', fontSize: '0.9rem' }}>{text}</div>
}

// ── Styles ──

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg, #f9fafb)',
  display: 'flex',
  justifyContent: 'center',
  padding: '24px 16px',
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 680,
  background: 'var(--surface, #fff)',
  borderRadius: 12,
  border: '1px solid var(--border, #e5e7eb)',
  overflow: 'hidden',
}

const cardStyle: React.CSSProperties = {
  padding: '12px 14px',
  border: '1px solid var(--border, #e5e7eb)',
  borderRadius: 8,
  marginBottom: 8,
}

const sectionTitle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 600,
  margin: '20px 0 10px',
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Users, UserCheck } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState, ErrorState } from '../../shared/components'
import { usePrincipal, usePrincipalProperties, usePrincipalUnits, usePrincipalTenants } from './api/principals.queries'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  hoa: { label: 'SVJ', color: 'blue' },
  individual_owner: { label: 'Vlastník FO', color: 'green' },
  corporate_owner: { label: 'Vlastník PO', color: 'yellow' },
  tenant_client: { label: 'Klient nájemce', color: 'purple' },
  mixed_client: { label: 'Smíšený', color: 'muted' },
}

const MGMT_TYPE_LABELS: Record<string, string> = {
  hoa_management: 'Správa SVJ',
  rental_management: 'Správa pronájmu',
  technical_management: 'Technická správa',
  accounting_management: 'Účetní správa',
  admin_management: 'Administrativní správa',
}

type Tab = 'overview' | 'properties' | 'units' | 'tenants'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Přehled', icon: null },
  { key: 'properties', label: 'Nemovitosti', icon: <Building2 size={14} /> },
  { key: 'units', label: 'Jednotky', icon: <Users size={14} /> },
  { key: 'tenants', label: 'Nájemci', icon: <UserCheck size={14} /> },
]

export default function PrincipalDetailPage() {
  const { principalId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const { data: principal, isLoading, error } = usePrincipal(principalId!)

  if (isLoading) return <LoadingState />
  if (error || !principal) return (
    <div>
      <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/principals')}>Zpět</Button>
      <ErrorState message="Klient nenalezen." />
    </div>
  )

  const party = principal.party
  const t = TYPE_LABELS[principal.type] ?? { label: principal.type, color: 'muted' }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/principals')} size="sm">Klienti</Button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{principal.displayName}</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge variant={t.color as any}>{t.label}</Badge>
          {principal.code && <span className="text-muted text-sm">Kód: {principal.code}</span>}
          {party?.ic && <span className="text-muted text-sm">IČ: {party.ic}</span>}
          {party?.email && <span className="text-muted text-sm">{party.email}</span>}
          {party?.phone && <span className="text-muted text-sm">{party.phone}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.icon && <span style={{ marginRight: 4 }}>{t.icon}</span>}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab principal={principal} />}
      {tab === 'properties' && <PropertiesTab principalId={principalId!} />}
      {tab === 'units' && <UnitsTab principalId={principalId!} />}
      {tab === 'tenants' && <TenantsTab principalId={principalId!} />}
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────

function OverviewTab({ principal }: { principal: any }) {
  const party = principal.party
  const contracts = principal.managementContracts ?? []
  const fcs = principal.financialContexts ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Party info */}
      {party && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Subjekt</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '.85rem' }}>
            <div><span className="text-muted">Název:</span> {party.displayName}</div>
            <div><span className="text-muted">IČ:</span> {party.ic ?? '—'}</div>
            <div><span className="text-muted">DIČ:</span> {party.dic ?? '—'}</div>
            <div><span className="text-muted">Email:</span> {party.email ?? '—'}</div>
            <div><span className="text-muted">Telefon:</span> {party.phone ?? '—'}</div>
            {party.street && <div><span className="text-muted">Adresa:</span> {party.street}, {party.city}</div>}
          </div>
        </div>
      )}

      {/* Management contracts */}
      {contracts.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Smlouvy o správě ({contracts.length})</div>
          {contracts.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
              <div>
                <span style={{ fontWeight: 500 }}>{c.property?.name ?? '—'}</span>
                <span className="text-muted" style={{ marginLeft: 8 }}>{c.property?.address}</span>
              </div>
              <Badge variant={c.isActive ? 'green' : 'muted'}>{MGMT_TYPE_LABELS[c.type] ?? c.type}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Financial contexts */}
      {fcs.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Finanční kontexty ({fcs.length})</div>
          {fcs.map((fc: any) => (
            <div key={fc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
              <span style={{ fontWeight: 500 }}>{fc.displayName}</span>
              <Badge variant="muted">{fc.scopeType}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Properties Tab ──────────────────────────────────────────────────

function PropertiesTab({ principalId }: { principalId: string }) {
  const navigate = useNavigate()
  const { data: properties = [], isLoading } = usePrincipalProperties(principalId)

  const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--border)' }

  if (isLoading) return <LoadingState text="Načítání nemovitostí..." />
  if (properties.length === 0) return <EmptyState title="Žádné nemovitosti" description="Tento klient nemá přiřazené žádné nemovitosti." />

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
        <thead>
          <tr>
            <th style={thStyle}>Název / Adresa</th>
            <th style={thStyle}>Město</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Jednotky</th>
          </tr>
        </thead>
        <tbody>
          {properties.map(p => (
            <tr key={p.id} onClick={() => navigate(`/properties/${p.id}`)} style={{ cursor: 'pointer' }}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div className="text-muted text-sm">{p.address}</div>
              </td>
              <td style={tdStyle}>{p.city}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{p._count?.units ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Units Tab ───────────────────────────────────────────────────────

function UnitsTab({ principalId }: { principalId: string }) {
  const { data: units = [], isLoading } = usePrincipalUnits(principalId)

  const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--border)' }

  if (isLoading) return <LoadingState text="Načítání jednotek..." />
  if (units.length === 0) return <EmptyState title="Žádné jednotky" description="Tento klient nemá přiřazené žádné jednotky." />

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
        <thead>
          <tr>
            <th style={thStyle}>Jednotka</th>
            <th style={thStyle}>Nemovitost</th>
            <th style={thStyle}>Nájemce</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Plocha</th>
          </tr>
        </thead>
        <tbody>
          {units.map(u => {
            const tenantName = u.tenancies?.[0]?.party?.displayName
            return (
              <tr key={u.id}>
                <td style={tdStyle}><span style={{ fontWeight: 500 }}>{u.name}</span></td>
                <td style={tdStyle} className="text-muted">{u.property?.name}</td>
                <td style={tdStyle}>{tenantName ?? <Badge variant="muted">volný</Badge>}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{u.area != null ? `${u.area} m²` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tenants Tab ─────────────────────────────────────────────────────

function TenantsTab({ principalId }: { principalId: string }) {
  const { data: tenancies = [], isLoading } = usePrincipalTenants(principalId)

  const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--border)' }

  if (isLoading) return <LoadingState text="Načítání nájemníků..." />
  if (tenancies.length === 0) return <EmptyState title="Žádní nájemníci" description="Tento klient nemá žádné aktivní nájemníky." />

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
        <thead>
          <tr>
            <th style={thStyle}>Jméno</th>
            <th style={thStyle}>Jednotka</th>
            <th style={thStyle}>Nemovitost</th>
            <th style={thStyle}>Kontakt</th>
            <th style={thStyle}>Stav</th>
          </tr>
        </thead>
        <tbody>
          {tenancies.map(t => (
            <tr key={t.id}>
              <td style={tdStyle}><span style={{ fontWeight: 500 }}>{t.party?.displayName}</span></td>
              <td style={tdStyle}>{t.unit?.name}</td>
              <td style={tdStyle} className="text-muted">{t.unit?.property?.name}</td>
              <td style={tdStyle} className="text-muted text-sm">{t.party?.email ?? t.party?.phone ?? '—'}</td>
              <td style={tdStyle}><Badge variant={t.isActive ? 'green' : 'muted'}>{t.isActive ? 'Aktivní' : 'Ukončen'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

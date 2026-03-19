import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, Users, UserCheck, Pencil, Trash2, MessageSquare, Wallet, ChevronLeft, ChevronRight, FileText, User } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState, ErrorState } from '../../shared/components'
import { usePrincipal, usePrincipalProperties, usePrincipalUnits, usePrincipalTenants } from './api/principals.queries'
import ManagementContractFormModal from '../properties/ManagementContractFormModal'
import { managementContractsApi } from '../properties/management-contracts-api'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  hoa: { label: 'SVJ', color: 'blue' },
  individual_owner: { label: 'Vlastník FO', color: 'green' },
  corporate_owner: { label: 'Vlastník PO', color: 'yellow' },
  tenant_client: { label: 'Klient nájemce', color: 'purple' },
  mixed_client: { label: 'Smíšený', color: 'muted' },
}

const MGMT_TYPE_LABELS: Record<string, string> = {
  hoa_management: 'Správa SVJ', rental_management: 'Správa pronájmu',
  technical_management: 'Technická správa', accounting_management: 'Účetní správa',
  admin_management: 'Administrativní správa',
}

type Tab = 'overview' | 'persons' | 'users' | 'units' | 'finance' | 'communication' | 'profile'

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
  const qc = useQueryClient()
  const [contractModal, setContractModal] = useState<{ contract?: any } | null>(null)
  const displayName = (principal.displayName ?? '').replace(/^SJM\s+/i, 'SJ ')

  const handleDeleteContract = async (contractId: string) => {
    if (!window.confirm('Deaktivovat smlouvu správy?')) return
    try {
      await managementContractsApi.remove(contractId)
      qc.invalidateQueries({ queryKey: ['principals'] })
      qc.invalidateQueries({ queryKey: ['management-contracts'] })
    } catch { /* ignore */ }
  }

  const neuvedeno = <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>neuvedeno</span>
  const fieldStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }

  const TABS: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: 'overview', label: 'Obecné' },
    { key: 'persons', label: 'Odpovědné osoby' },
    { key: 'users', label: 'Uživatelé' },
    { key: 'units', label: 'Jednotky' },
    { key: 'finance', label: 'Jeho finance', disabled: true },
    { key: 'communication', label: 'Komunikace', disabled: true },
    { key: 'profile', label: 'Profil', disabled: true },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8, fontSize: '.82rem', color: 'var(--text-muted)' }}>
        <button onClick={() => navigate('/principals')} style={{ background: 'none', border: 'none', color: 'var(--primary, #6366f1)', cursor: 'pointer', padding: 0, fontSize: '.82rem' }}>
          Vlastníci jednotek
        </button>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{displayName}</span>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/principals')}>Zavřít</Button>
          <Button size="sm" icon={<Pencil size={13} />}>Upravit</Button>
          <Button size="sm" icon={<Trash2 size={13} />} style={{ color: 'var(--danger)' }}>Smazat</Button>
          <Button size="sm" icon={<Users size={13} />}>Přiřadit jednotku</Button>
          <Button size="sm" icon={<FileText size={13} />}>Vytvořit upomínku</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wallet size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Stav konta:</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success, #22c55e)' }}>0,00 Kč</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{displayName}</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge variant={t.color as any}>{t.label}</Badge>
          {principal.code && <span className="text-muted text-sm">Kód: {principal.code}</span>}
          {party?.ic && <span className="text-muted text-sm">IČ: {party.ic}</span>}
          {party?.email && <span className="text-muted text-sm">{party.email}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => !t.disabled && setTab(t.key)}
            style={t.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OBECNÉ TAB ──────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Left — owner info */}
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '.9rem' }}>Informace o vlastníkovi jednotky</div>
            <div style={fieldStyle}><span className="text-muted">Období:</span>
              <span><Badge variant="blue">Počátek</Badge> — <Badge variant="green">Současnost</Badge></span>
            </div>
            <div style={fieldStyle}><span className="text-muted">Stav konta:</span> <span style={{ fontWeight: 600 }}>0,00 Kč</span></div>
            <div style={{ height: 8 }} />
            <div style={fieldStyle}><span className="text-muted">Variabilní symbol:</span> {neuvedeno}</div>
            <div style={fieldStyle}><span className="text-muted">Vytvářet upomínky:</span> <span>Ano</span></div>
            <div style={fieldStyle}><span className="text-muted">Samostatné vyúčtování:</span> <span>Ne</span></div>
            <div style={fieldStyle}><span className="text-muted">Účet pro platby:</span> {neuvedeno}</div>
          </div>

          {/* Right — prescriptions */}
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>Předpisy a vyúčtování</div>
              <Badge variant="green">0 Kč</Badge>
            </div>
            <div style={fieldStyle}><span className="text-muted">Splatnost předpisu:</span> <span>Výchozí</span></div>
            <div style={fieldStyle}><span className="text-muted">Předpis jako faktura:</span> {neuvedeno}</div>
            <div style={fieldStyle}><span className="text-muted">Účet pro přeplatky:</span> {neuvedeno}</div>
            <div style={fieldStyle}><span className="text-muted">Chráněná výše konta:</span> <span>0,00 Kč</span></div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '.85rem' }}>Neuhrazené upomínky</span>
                <Badge variant="green">0</Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ODPOVĚDNÉ OSOBY TAB ─────────────────────────── */}
      {tab === 'persons' && <PersonsTab party={party} />}

      {/* ── UŽIVATELÉ TAB ───────────────────────────────── */}
      {tab === 'users' && <UsersTimelineTab principalId={principalId!} />}

      {/* ── JEDNOTKY TAB ────────────────────────────────── */}
      {tab === 'units' && <UnitsTabEnhanced principalId={principalId!} />}

      {/* ── PLACEHOLDER TABS ────────────────────────────── */}
      {tab === 'finance' && <EmptyState title="Finance vlastníka" description="Přehledy financí, předpisů a plateb — připravujeme." />}
      {tab === 'communication' && <EmptyState title="Komunikace" description="Připravujeme." />}
      {tab === 'profile' && <EmptyState title="Profil" description="Připravujeme." />}

      {contractModal !== null && (
        <ManagementContractFormModal
          principalId={principalId}
          contract={contractModal.contract}
          onClose={() => setContractModal(null)}
          onSaved={() => { setContractModal(null); qc.invalidateQueries({ queryKey: ['principals'] }); qc.invalidateQueries({ queryKey: ['management-contracts'] }); }}
        />
      )}
    </div>
  )
}

// ─── Persons Tab (Domsys Odpovědné osoby) ──────────────────────────

type RoleCategory = 'owner' | 'representative' | 'tenant' | 'other'
const ROLE_CATEGORIES: { key: RoleCategory; label: string; required?: boolean }[] = [
  { key: 'owner', label: 'Majitel', required: true },
  { key: 'representative', label: 'Zástupce' },
  { key: 'tenant', label: 'Nájemce' },
  { key: 'other', label: 'Ostatní' },
]

function PersonsTab({ party }: { party: any }) {
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState<RoleCategory>('owner')
  const [showActions, setShowActions] = useState<string | null>(null)

  const roleCounts: Record<RoleCategory, number> = { owner: party ? 1 : 0, representative: 0, tenant: 0, other: 0 }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Left — categories */}
      <div style={{ flex: '0 0 220px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {ROLE_CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveRole(cat.key)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
              padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)',
              background: activeRole === cat.key ? 'var(--primary, #6366f1)' : 'var(--surface)',
              color: activeRole === cat.key ? '#fff' : 'var(--text)',
              cursor: 'pointer', fontSize: '.85rem', fontWeight: activeRole === cat.key ? 600 : 400,
            }}
          >
            <span>{cat.label}{cat.required ? ' ★' : ''}</span>
            <span style={{ fontSize: '.72rem', fontWeight: 600, borderRadius: 10, padding: '1px 7px', background: activeRole === cat.key ? 'rgba(255,255,255,0.2)' : 'var(--border)' }}>
              {roleCounts[cat.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Right — persons */}
      <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{ROLE_CATEGORIES.find(c => c.key === activeRole)?.label}</div>
        </div>

        {activeRole === 'owner' && party && (
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--surface-2, var(--surface))', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{party.displayName?.replace(/^SJM\s+/i, 'SJ ')}</div>
                {party.street && <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 2 }}>{[party.street, party.city, party.postalCode].filter(Boolean).join(', ')}</div>}
                {party.email && <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{party.email}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, position: 'relative' }}>
                <Badge variant="muted">ISIR</Badge>
                <button onClick={() => setShowActions(showActions === party.id ? null : party.id)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontSize: '.78rem', cursor: 'pointer', color: 'var(--text)' }}>
                  Akce ▾
                </button>
                {showActions === party.id && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, minWidth: 180, overflow: 'hidden' }}>
                    {[
                      { label: 'Detail osoby', action: () => navigate(`/parties`) },
                      { label: 'Úprava osoby', action: () => {} },
                      { label: 'Historie', action: () => {} },
                    ].map((item, i) => (
                      <button key={i} onClick={() => { item.action(); setShowActions(null) }}
                        style={{ display: 'block', width: '100%', padding: '8px 14px', border: 'none', borderBottom: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: '.82rem', textAlign: 'left' }}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeRole !== 'owner' && (
          <div className="text-muted" style={{ fontSize: '.85rem', padding: 20, textAlign: 'center' }}>
            Žádné osoby v kategorii „{ROLE_CATEGORIES.find(c => c.key === activeRole)?.label}"
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Enhanced Units Tab ─────────────────────────────────────────────

function UnitsTabEnhanced({ principalId }: { principalId: string }) {
  const { data: units = [], isLoading } = usePrincipalUnits(principalId)

  if (isLoading) return <LoadingState text="Načítání jednotek..." />
  if (units.length === 0) return <EmptyState title="Žádné jednotky" description="Tento klient nemá přiřazené žádné jednotky." />

  const usageToType = (u: any): { label: string; color: string } => {
    const usage = (u.cadastralData?.usage ?? u.spaceType ?? '').toLowerCase()
    if (usage.includes('byt') || usage === 'residential') return { label: 'byt', color: '#3b82f6' }
    if (usage.includes('nebyt') || usage === 'non_residential') return { label: 'nebyt', color: '#f59e0b' }
    if (usage.includes('garáž') || usage === 'garage') return { label: 'garáž', color: '#8b5cf6' }
    if (usage.includes('sklep') || usage === 'cellar') return { label: 'sklep', color: '#6b7280' }
    return { label: 'jiný', color: '#6b7280' }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
        <thead>
          <tr>
            {['Typ', 'Platnost od', 'Platnost do', 'Ozn. jednotky', 'Podlaží', 'Plocha'].map(h => (
              <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {units.map((u: any) => {
            const ut = usageToType(u)
            return (
              <tr key={u.id}>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${ut.color}15`, color: ut.color }}>{ut.label}</span>
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  <Badge variant="blue">počátek</Badge>
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  <Badge variant="green">současnost</Badge>
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary, #6366f1)' }}>{u.name}</div>
                  {u.ownDesignation && <div className="text-muted" style={{ fontSize: '.78rem' }}>{u.ownDesignation}</div>}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {u.floor != null ? `${u.floor}. NP` : <span style={{ fontStyle: 'italic' }}>neuvedeno</span>}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>
                  {u.area != null ? `${u.area} m²` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Users Timeline Tab (Uživatelé — časová osa obsazenosti) ────────

function UsersTimelineTab({ principalId }: { principalId: string }) {
  const { data: units = [], isLoading } = usePrincipalUnits(principalId)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())

  if (isLoading) return <LoadingState text="Načítání jednotek..." />
  if (units.length === 0) return <EmptyState title="Žádné jednotky" description="Tento klient nemá přiřazené jednotky." />

  const selected = selectedUnitId ?? units[0]?.id
  const selectedUnit = units.find((u: any) => u.id === selected) ?? units[0]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // TODO: fetch actual occupancy data from GET /units/:id/occupancy?year={year}
  // For now, use placeholder zeros
  const occupancyData: Record<number, number> = {}
  months.forEach(m => { occupancyData[m] = 0 })

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Left — unit selector */}
      <div style={{ flex: '0 0 180px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
        {units.map((u: any) => (
          <button key={u.id} onClick={() => setSelectedUnitId(u.id)}
            style={{
              display: 'block', width: '100%', padding: '8px 14px', border: 'none',
              borderBottom: '1px solid var(--border)', fontSize: '.85rem', cursor: 'pointer', textAlign: 'left',
              background: (selected === u.id) ? 'var(--primary, #6366f1)' : 'var(--surface)',
              color: (selected === u.id) ? '#fff' : 'var(--text)',
              fontWeight: (selected === u.id) ? 600 : 400,
            }}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* Right — timeline */}
      <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>I. Časová osa {selectedUnit?.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setYear(y => y - 1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: 'var(--text)' }}>◄</button>
            <span style={{ fontWeight: 600, fontSize: '.9rem', minWidth: 50, textAlign: 'center' }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: 'var(--text)' }}>►</button>
          </div>
        </div>

        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Měsíc</th>
                {months.map(m => (
                  <th key={m} style={{ padding: '6px 6px', fontWeight: 600, fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'center', borderBottom: '2px solid var(--border)', minWidth: 32 }}>
                    {String(m).padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Počet osob</td>
                {months.map(m => (
                  <td key={m} style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    <span style={{ color: 'var(--primary, #6366f1)', cursor: 'pointer', fontWeight: 500 }}>
                      {occupancyData[m] ?? 0}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
        <thead><tr><th style={thStyle}>Název / Adresa</th><th style={thStyle}>Město</th><th style={{ ...thStyle, textAlign: 'center' }}>Jednotky</th></tr></thead>
        <tbody>
          {properties.map(p => (
            <tr key={p.id} onClick={() => navigate(`/properties/${p.id}`)} style={{ cursor: 'pointer' }}>
              <td style={tdStyle}><div style={{ fontWeight: 600 }}>{p.name}</div><div className="text-muted text-sm">{p.address}</div></td>
              <td style={tdStyle}>{p.city}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{p._count?.units ?? 0}</td>
            </tr>
          ))}
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
        <thead><tr><th style={thStyle}>Jméno</th><th style={thStyle}>Jednotka</th><th style={thStyle}>Nemovitost</th><th style={thStyle}>Stav</th></tr></thead>
        <tbody>
          {tenancies.map(t => (
            <tr key={t.id}>
              <td style={tdStyle}><span style={{ fontWeight: 500 }}>{t.party?.displayName}</span></td>
              <td style={tdStyle}>{t.unit?.name}</td>
              <td style={tdStyle} className="text-muted">{t.unit?.property?.name}</td>
              <td style={tdStyle}><Badge variant={t.isActive ? 'green' : 'muted'}>{t.isActive ? 'Aktivní' : 'Ukončen'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

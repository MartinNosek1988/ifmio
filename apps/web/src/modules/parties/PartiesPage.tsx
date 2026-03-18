import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState, Modal } from '../../shared/components'
import { useParties, useParty, useDeleteParty } from './api/parties.queries'
import type { ApiParty } from './api/parties.api'
import PartyFormModal from './PartyFormModal'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  person: { label: 'Osoba', color: 'blue' },
  company: { label: 'Firma', color: 'yellow' },
  hoa: { label: 'SVJ', color: 'purple' },
  organization_unit: { label: 'Org. jednotka', color: 'muted' },
}

type FilterType = '' | 'person' | 'company' | 'hoa' | 'inactive'

export default function PartiesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('')
  const [showForm, setShowForm] = useState(false)
  const [editParty, setEditParty] = useState<ApiParty | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteParty, setDeleteParty] = useState<ApiParty | null>(null)

  const queryParams: Record<string, unknown> = { search: search || undefined, limit: 100 }
  if (filterType === 'inactive') {
    queryParams.isActive = false
  } else if (filterType) {
    queryParams.type = filterType
  }

  const { data, isLoading } = useParties(queryParams)
  const parties = data?.data ?? []
  const deleteMutation = useDeleteParty()

  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', width: 280 }
  const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)' }

  const filters: { key: FilterType; label: string }[] = [
    { key: '', label: 'Vše' },
    { key: 'person', label: 'Osoby' },
    { key: 'company', label: 'Firmy' },
    { key: 'hoa', label: 'SVJ' },
    { key: 'inactive', label: 'Neaktivní' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Adresář</h1>
          <p className="text-muted text-sm">{data?.total ?? 0} subjektů</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
          Nový subjekt
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Hledat subjekt..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 4 }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: '.8rem', fontWeight: 500, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: filterType === f.key ? 'var(--primary, #6366f1)' : 'var(--surface)',
                color: filterType === f.key ? '#fff' : 'var(--text-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <LoadingState /> : parties.length === 0 ? (
        <EmptyState
          title="Žádné subjekty"
          description={search ? 'Žádné výsledky pro zadaný výraz.' : 'Začněte přidáním prvního subjektu.'}
          action={!search ? { label: 'Nový subjekt', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Jméno / Název</th>
                <th style={thStyle}>Typ</th>
                <th style={thStyle}>IČ</th>
                <th style={thStyle}>E-mail</th>
                <th style={thStyle}>Telefon</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Klient</th>
              </tr>
            </thead>
            <tbody>
              {parties.map(p => {
                const t = TYPE_LABELS[p.type] ?? { label: p.type, color: 'muted' }
                return (
                  <tr
                    key={p.id}
                    onClick={() => setDetailId(p.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{p.displayName}</span>
                      {!p.isActive && <Badge variant="muted">neaktivní</Badge>}
                      {p.datumZaniku && <Badge variant="danger">zaniklý</Badge>}
                    </td>
                    <td style={tdStyle}><Badge variant={t.color as any}>{t.label}</Badge></td>
                    <td style={tdStyle} className="text-muted">{p.ic ?? '—'}</td>
                    <td style={tdStyle} className="text-muted text-sm">{p.email ?? '—'}</td>
                    <td style={tdStyle} className="text-muted text-sm">{p.phone ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {(p._count?.principals ?? 0) > 0
                        ? <Badge variant="green">{p._count!.principals}</Badge>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create form */}
      {showForm && <PartyFormModal onClose={() => setShowForm(false)} />}

      {/* Edit form */}
      {editParty && <PartyFormModal party={editParty} onClose={() => setEditParty(null)} />}

      {/* Detail modal */}
      {detailId && (
        <PartyDetailModal
          partyId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(p) => { setDetailId(null); setEditParty(p) }}
          onDelete={(p) => { setDetailId(null); setDeleteParty(p) }}
          onNavigate={navigate}
        />
      )}

      {/* Delete confirmation */}
      {deleteParty && (
        <Modal
          open
          onClose={() => setDeleteParty(null)}
          title="Deaktivovat subjekt"
          subtitle={deleteParty.displayName}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteParty(null)}>Zrušit</Button>
              <Button variant="danger" onClick={() => {
                deleteMutation.mutate(deleteParty.id, { onSuccess: () => setDeleteParty(null) })
              }} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deaktivuji...' : 'Deaktivovat'}
              </Button>
            </div>
          }
        >
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Opravdu chcete deaktivovat subjekt <strong>{deleteParty.displayName}</strong>?
          </p>
          {deleteMutation.isError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
              {(deleteMutation.error as any)?.response?.data?.message ?? 'Nepodařilo se deaktivovat subjekt.'}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

// ─── Party Detail Modal ─────────────────────────────────────────────

function PartyDetailModal({
  partyId,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
}: {
  partyId: string
  onClose: () => void
  onEdit: (p: ApiParty) => void
  onDelete: (p: ApiParty) => void
  onNavigate: (path: string) => void
}) {
  const { data: party, isLoading } = useParty(partyId)

  if (isLoading || !party) {
    return (
      <Modal open onClose={onClose} title="Načítání...">
        <LoadingState />
      </Modal>
    )
  }

  const t = TYPE_LABELS[party.type] ?? { label: party.type, color: 'muted' }
  const infoStyle: React.CSSProperties = { fontSize: '.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
  const fieldStyle: React.CSSProperties = { padding: '4px 0' }

  return (
    <Modal
      open
      onClose={onClose}
      title={party.displayName}
      subtitle={t.label}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => onDelete(party)} variant="danger">Deaktivovat</Button>
          <Button onClick={() => onEdit(party)} variant="primary">Upravit</Button>
        </div>
      }
    >
      {party.datumZaniku && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger, #ef4444)', borderRadius: 6, padding: '8px 12px', color: 'var(--danger, #ef4444)', fontSize: '.85rem', marginBottom: 12, fontWeight: 600 }}>
          Zaniklý subjekt dle ARES ({party.datumZaniku.slice(0, 10)})
        </div>
      )}
      <div style={infoStyle}>
        <div style={fieldStyle}><span className="text-muted">Typ:</span> <Badge variant={t.color as any}>{t.label}</Badge></div>
        <div style={fieldStyle}><span className="text-muted">Stav:</span> <Badge variant={party.isActive ? 'green' : 'muted'}>{party.isActive ? 'Aktivní' : 'Neaktivní'}</Badge></div>
        {party.ic && <div style={fieldStyle}><span className="text-muted">IČ:</span> {party.ic}</div>}
        {party.dic && <div style={fieldStyle}><span className="text-muted">DIČ:</span> {party.dic}</div>}
        {party.email && <div style={fieldStyle}><span className="text-muted">E-mail:</span> {party.email}</div>}
        {party.phone && <div style={fieldStyle}><span className="text-muted">Telefon:</span> {party.phone}</div>}
        {party.street && <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}><span className="text-muted">Adresa:</span> {[party.street, party.city, party.postalCode].filter(Boolean).join(', ')}</div>}
        {party.bankAccount && <div style={fieldStyle}><span className="text-muted">Účet:</span> {party.bankAccount}{party.bankCode ? `/${party.bankCode}` : ''}</div>}
        {party.dataBoxId && <div style={fieldStyle}><span className="text-muted">Dat. schránka:</span> {party.dataBoxId}</div>}
        {party.pravniForma && <div style={fieldStyle}><span className="text-muted">Právní forma:</span> {party.pravniForma}</div>}
        {party.datumVzniku && <div style={fieldStyle}><span className="text-muted">Datum vzniku:</span> {party.datumVzniku.slice(0, 10)}</div>}
        {party.note && <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}><span className="text-muted">Poznámka:</span> {party.note}</div>}
      </div>

      {/* Linked principals */}
      {party.principals && party.principals.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>Klienti ({party.principals.length})</div>
          {party.principals.map(pr => (
            <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '.83rem' }}>
              <button
                onClick={() => { onClose(); onNavigate(`/principals/${pr.id}`) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontWeight: 500, padding: 0, textDecoration: 'underline dotted', textUnderlineOffset: 2, fontSize: '.83rem' }}
              >
                {pr.displayName}
              </button>
              {(pr._count?.managementContracts ?? 0) > 0 && (
                <span className="text-muted text-sm">{pr._count!.managementContracts} smluv</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState, Modal, LoadingState, ErrorState } from '../../shared/components'
import type { Column, BadgeVariant } from '../../shared/components'
import { useProtocols, useDeleteProtocol } from './api/protocols.queries'
import type { ApiProtocol } from './api/protocols.api'
import ProtocolPanel from './ProtocolPanel'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rozpracovaný', completed: 'Dokončený', confirmed: 'Potvrzený',
}
const STATUS_COLOR: Record<string, BadgeVariant> = {
  draft: 'yellow', completed: 'green', confirmed: 'blue',
}
const SOURCE_TYPE_LABEL: Record<string, string> = {
  helpdesk: 'HelpDesk', revision: 'Revize', work_order: 'Work Order',
}
const PROTOCOL_TYPE_LABEL: Record<string, string> = {
  work_report: 'Pracovní výkaz', handover: 'Předávací protokol',
  revision_report: 'Revizní zpráva', service_protocol: 'Servisní protokol',
}
const SATISFACTION_LABEL: Record<string, string> = {
  satisfied: 'Spokojený', partially_satisfied: 'Částečně', dissatisfied: 'Nespokojený', neutral: 'Neutrální',
}
const SATISFACTION_COLOR: Record<string, BadgeVariant> = {
  satisfied: 'green', partially_satisfied: 'yellow', dissatisfied: 'red', neutral: 'muted',
}

export default function ProtocolsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSourceType, setFilterSourceType] = useState('')
  const [filterProtocolType, setFilterProtocolType] = useState('')
  const [filterSatisfaction, setFilterSatisfaction] = useState('')
  const [selectedProtocol, setSelectedProtocol] = useState<ApiProtocol | null>(null)
  const [deleteProtocol, setDeleteProtocol] = useState<ApiProtocol | null>(null)

  const { data: paginated, isLoading, error } = useProtocols({
    ...(search ? { search } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterSourceType ? { sourceType: filterSourceType } : {}),
    ...(filterProtocolType ? { protocolType: filterProtocolType } : {}),
    ...(filterSatisfaction ? { satisfaction: filterSatisfaction } : {}),
    limit: 100,
  })

  const deleteMutation = useDeleteProtocol()

  const protocols = paginated?.data ?? []
  const total = paginated?.total ?? 0

  const stats = useMemo(() => {
    const draft = protocols.filter(p => p.status === 'draft').length
    const completed = protocols.filter(p => p.status === 'completed').length
    const confirmed = protocols.filter(p => p.status === 'confirmed').length
    return { total, draft, completed, confirmed }
  }, [protocols, total])

  const columns: Column<ApiProtocol>[] = [
    {
      key: 'number', label: '#',
      render: (p) => <span className="text-muted text-sm" style={{ fontFamily: 'monospace' }}>{p.number}</span>,
    },
    {
      key: 'title', label: 'Název',
      render: (p) => (
        <div>
          <span style={{ fontWeight: 600 }}>{p.title ?? (p.description ? p.description.slice(0, 60) + (p.description.length > 60 ? '...' : '') : '—')}</span>
          {p.property?.name && <div className="text-muted text-sm">{p.property.name}</div>}
        </div>
      ),
    },
    {
      key: 'sourceType', label: 'Zdroj',
      render: (p) => <Badge variant="muted">{SOURCE_TYPE_LABEL[p.sourceType] ?? p.sourceType}</Badge>,
    },
    {
      key: 'protocolType', label: 'Typ',
      render: (p) => <span className="text-muted text-sm">{PROTOCOL_TYPE_LABEL[p.protocolType] ?? p.protocolType}</span>,
    },
    {
      key: 'status', label: 'Stav',
      render: (p) => <Badge variant={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status] ?? p.status}</Badge>,
    },
    {
      key: 'satisfaction', label: 'Spokojenost',
      render: (p) => p.satisfaction
        ? <Badge variant={SATISFACTION_COLOR[p.satisfaction]}>{SATISFACTION_LABEL[p.satisfaction] ?? p.satisfaction}</Badge>
        : <span className="text-muted">—</span>,
    },
    {
      key: 'lines', label: 'Řádky',
      render: (p) => <span className="text-muted text-sm">{p._count?.lines ?? p.lines.length}</span>,
    },
    {
      key: 'createdAt', label: 'Vytvořeno',
      render: (p) => <span className="text-muted text-sm">{new Date(p.createdAt).toLocaleDateString('cs-CZ')}</span>,
    },
  ]

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Nepodařilo se načíst protokoly." />

  const handleDeleteConfirm = () => {
    if (!deleteProtocol) return
    deleteMutation.mutate(deleteProtocol.id, {
      onSuccess: () => {
        setDeleteProtocol(null)
        if (selectedProtocol?.id === deleteProtocol.id) setSelectedProtocol(null)
      },
    })
  }

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Protokoly</h1>
          <p className="page-subtitle">{total} protokolů celkem</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats.total)} color="var(--accent-blue)" />
        <KpiCard label="Rozpracovaných" value={String(stats.draft)} color="var(--accent-yellow, #e6a817)" />
        <KpiCard label="Dokončených" value={String(stats.completed)} color="var(--accent-green, #22c55e)" />
        <KpiCard label="Potvrzených" value={String(stats.confirmed)} color="var(--accent-blue)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}><SearchBar placeholder="Hledat protokoly..." onSearch={setSearch} /></div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Všechny stavy</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSourceType} onChange={(e) => setFilterSourceType(e.target.value)} style={selectStyle}>
          <option value="">Všechny zdroje</option>
          {Object.entries(SOURCE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterProtocolType} onChange={(e) => setFilterProtocolType(e.target.value)} style={selectStyle}>
          <option value="">Všechny typy</option>
          {Object.entries(PROTOCOL_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSatisfaction} onChange={(e) => setFilterSatisfaction(e.target.value)} style={selectStyle}>
          <option value="">Spokojenost</option>
          {Object.entries(SATISFACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {protocols.length === 0 ? (
        <EmptyState title="Žádné protokoly" description="Protokoly se vytváří z helpdesku nebo revizí." />
      ) : (
        <Table data={protocols} columns={columns} rowKey={(p) => p.id} onRowClick={(p) => setSelectedProtocol(p)} />
      )}

      {selectedProtocol && (
        <Modal
          open
          onClose={() => setSelectedProtocol(null)}
          wide
          title={selectedProtocol.title ?? selectedProtocol.number}
          subtitle={[SOURCE_TYPE_LABEL[selectedProtocol.sourceType], PROTOCOL_TYPE_LABEL[selectedProtocol.protocolType]].filter(Boolean).join(' · ')}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {selectedProtocol.status === 'draft' && (
                <Button variant="danger" size="sm" onClick={() => { setDeleteProtocol(selectedProtocol); setSelectedProtocol(null) }}>Smazat</Button>
              )}
              <Button onClick={() => setSelectedProtocol(null)}>Zavřít</Button>
            </div>
          }
        >
          <ProtocolPanel sourceType={selectedProtocol.sourceType} sourceId={selectedProtocol.sourceId} />
        </Modal>
      )}

      {deleteProtocol && (
        <Modal
          open
          onClose={() => setDeleteProtocol(null)}
          title="Smazat protokol"
          subtitle={deleteProtocol.number}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteProtocol(null)}>Zrušit</Button>
              <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }
        >
          <p style={{ fontSize: '0.9rem' }}>
            Opravdu chcete smazat protokol <strong>{deleteProtocol.number}</strong>?
          </p>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>Tato akce je nevratná.</p>
        </Modal>
      )}
    </div>
  )
}

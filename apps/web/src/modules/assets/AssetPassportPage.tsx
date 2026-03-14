import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, CheckCircle, AlertTriangle, XCircle,
  ClipboardList, History, FileText, Activity, Wrench,
} from 'lucide-react'
import {
  Badge, Button, LoadingState, ErrorState, KpiCard, Table,
} from '../../shared/components'
import type { BadgeVariant, Column } from '../../shared/components'
import { apiClient } from '../../core/api/client'
import type { Asset } from './AssetListPage'

// ─── Types ─────────────────────────────────────────────────────────

interface PassportResponse {
  asset: Asset & { serviceRecords: ServiceRecord[] }
  complianceSummary: {
    total: number; overdue: number; dueSoon: number; compliant: number; noDate: number
    badge: 'ok' | 'warning' | 'critical' | 'none'
  }
}

interface RevisionHistoryItem {
  id: string
  performedAt: string | null
  scheduledAt: string | null
  resultStatus: string | null
  summary: string | null
  vendorName: string | null
  performedBy: string | null
  revisionPlan: {
    id: string; title: string
    revisionType: { id: string; name: string; code: string }
  }
}

interface AuditEvent {
  id: string
  action: string
  entity: string
  entityId: string | null
  newData: unknown
  oldData: unknown | null
  createdAt: string
  user: { id: string; name: string; email: string } | null
}

interface RevisionPlan {
  id: string
  title: string
  intervalDays: number
  nextDueAt: string | null
  status: string
  complianceStatus?: string
  generatedFromAssetType?: boolean
  isCustomized?: boolean
  revisionType?: { id: string; name: string; code: string }
}

interface ServiceRecord {
  id: string
  date: string
  type: string
  description: string | null
  cost: number | null
  supplier: string | null
}

// ─── Constants ──────────────────────────────────────────────────────

const RESULT_LABEL: Record<string, string> = {
  passed: 'Vyhovující', passed_with_notes: 'S poznámkami',
  failed: 'Nevyhovující', cancelled: 'Zrušeno', planned: 'Plánováno',
}
const RESULT_COLOR: Record<string, BadgeVariant> = {
  passed: 'green', passed_with_notes: 'yellow', failed: 'red',
  cancelled: 'muted', planned: 'blue',
}
const COMPLIANCE_LABEL: Record<string, string> = {
  compliant: 'V pořádku', due_soon: 'Blíží se', overdue: 'Po termínu',
  overdue_critical: 'Kritické', performed_pending_protocol: 'Bez protokolu',
  performed_pending_signature: 'Čeká podpis', performed_unconfirmed: 'Nepotvrzeno',
}
const COMPLIANCE_COLOR: Record<string, BadgeVariant> = {
  compliant: 'green', due_soon: 'yellow', overdue: 'red', overdue_critical: 'red',
  performed_pending_protocol: 'yellow', performed_pending_signature: 'yellow',
  performed_unconfirmed: 'muted',
}
const CATEGORY_LABEL: Record<string, string> = {
  tzb: 'TZB', stroje: 'Stroje', vybaveni: 'Vybavení',
  vozidla: 'Vozidla', it: 'IT', ostatni: 'Ostatní',
}
const STATUS_LABEL: Record<string, string> = {
  aktivni: 'Aktivní', servis: 'V servisu', vyrazeno: 'Vyřazeno', neaktivni: 'Neaktivní',
}
const STATUS_COLOR: Record<string, BadgeVariant> = {
  aktivni: 'green', servis: 'yellow', vyrazeno: 'red', neaktivni: 'muted',
}

const TABS = [
  { id: 'overview', label: 'Přehled', icon: <Activity size={14} /> },
  { id: 'plans', label: 'Revizní plány', icon: <ClipboardList size={14} /> },
  { id: 'history', label: 'Historie revizí', icon: <History size={14} /> },
  { id: 'documents', label: 'Dokumenty', icon: <FileText size={14} /> },
  { id: 'audit', label: 'Audit', icon: <Wrench size={14} /> },
]

// ─── Compliance Badge ────────────────────────────────────────────────

function ComplianceBadge({ badge }: { badge: 'ok' | 'warning' | 'critical' | 'none' }) {
  if (badge === 'ok') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success, #22c55e)', fontWeight: 600 }}>
      <CheckCircle size={18} /> Compliance OK
    </span>
  )
  if (badge === 'warning') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-orange, #f59e0b)', fontWeight: 600 }}>
      <AlertTriangle size={18} /> Blíží se termín
    </span>
  )
  if (badge === 'critical') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger, #ef4444)', fontWeight: 600 }}>
      <XCircle size={18} /> Po termínu!
    </span>
  )
  return <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Žádné plány</span>
}

// ─── Plans Tab ──────────────────────────────────────────────────────

function PlansTab({ assetId }: { assetId: string }) {
  const { data, isLoading, error } = useQuery<{ data: RevisionPlan[]; total: number }>({
    queryKey: ['assets', assetId, 'plans'],
    queryFn: () => apiClient.get(`/revisions/plans`, { params: { assetId, limit: 50 } }).then((r) => r.data),
  })

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState message="Nepodařilo se načíst plány." />
  if (data.data.length === 0) return (
    <p style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Žádné revizní plány k tomuto zařízení.</p>
  )

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'
  const now = Date.now()

  const columns: Column<RevisionPlan>[] = [
    {
      key: 'title', label: 'Plán',
      render: (p) => (
        <span>
          <span style={{ fontWeight: 600 }}>{p.title}</span>
          {p.generatedFromAssetType && (
            <span style={{ marginLeft: 6 }}><Badge variant="blue">Auto</Badge></span>
          )}
          {p.isCustomized && (
            <span style={{ marginLeft: 4 }}><Badge variant="yellow">Upraveno</Badge></span>
          )}
        </span>
      ),
    },
    {
      key: 'revisionType', label: 'Typ',
      render: (p) => p.revisionType ? <Badge variant="muted">{p.revisionType.code}</Badge> : '—',
    },
    {
      key: 'intervalDays', label: 'Interval',
      render: (p) => `${p.intervalDays}d`,
    },
    {
      key: 'nextDueAt', label: 'Termín',
      render: (p) => {
        if (!p.nextDueAt) return <span className="text-muted">—</span>
        const days = Math.ceil((new Date(p.nextDueAt).getTime() - now) / 86_400_000)
        const color = days < 0 ? 'var(--danger)' : days <= 30 ? 'var(--accent-orange)' : 'var(--text-muted)'
        return <span style={{ color, fontSize: '0.85rem' }}>{fmtDate(p.nextDueAt)}</span>
      },
    },
    {
      key: 'complianceStatus', label: 'Stav',
      render: (p) => p.complianceStatus ? (
        <Badge variant={COMPLIANCE_COLOR[p.complianceStatus] ?? 'muted'}>
          {COMPLIANCE_LABEL[p.complianceStatus] ?? p.complianceStatus}
        </Badge>
      ) : '—',
    },
  ]

  return <Table data={data.data} columns={columns} rowKey={(p) => p.id} emptyText="Žádné plány" />
}

// ─── History Tab ────────────────────────────────────────────────────

function HistoryTab({ assetId }: { assetId: string }) {
  const { data, isLoading, error } = useQuery<{ data: RevisionHistoryItem[]; total: number }>({
    queryKey: ['assets', assetId, 'revision-history'],
    queryFn: () => apiClient.get(`/assets/${assetId}/revision-history`).then((r) => r.data),
  })

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState message="Nepodařilo se načíst historii." />
  if (data.data.length === 0) return (
    <p style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Zatím žádné provedené revize.</p>
  )

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'

  const columns: Column<RevisionHistoryItem>[] = [
    {
      key: 'performedAt', label: 'Datum',
      render: (e) => fmtDate(e.performedAt ?? e.scheduledAt),
    },
    {
      key: 'revisionPlan', label: 'Typ revize',
      render: (e) => (
        <span>
          <span style={{ fontWeight: 600 }}>{e.revisionPlan.revisionType.name}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.82rem' }}>
            {e.revisionPlan.revisionType.code}
          </span>
        </span>
      ),
    },
    {
      key: 'resultStatus', label: 'Výsledek',
      render: (e) => e.resultStatus ? (
        <Badge variant={RESULT_COLOR[e.resultStatus] ?? 'muted'}>
          {RESULT_LABEL[e.resultStatus] ?? e.resultStatus}
        </Badge>
      ) : '—',
    },
    {
      key: 'vendorName', label: 'Dodavatel',
      render: (e) => e.vendorName || <span className="text-muted">—</span>,
    },
    {
      key: 'summary', label: 'Poznámka',
      render: (e) => <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{e.summary || '—'}</span>,
    },
  ]

  return <Table data={data.data} columns={columns} rowKey={(e) => e.id} emptyText="Žádná história" />
}

// ─── Documents Tab ──────────────────────────────────────────────────

function DocumentsTab({ assetId }: { assetId: string }) {
  const { data, isLoading, error } = useQuery<{ data: unknown[]; total: number }>({
    queryKey: ['assets', assetId, 'documents'],
    queryFn: () => apiClient.get(`/documents`, { params: { entityType: 'asset', entityId: assetId } }).then((r) => r.data),
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Nepodařilo se načíst dokumenty." />

  const docs = (data as any)?.data ?? (Array.isArray(data) ? data : [])

  if (docs.length === 0) return (
    <p style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Žádné dokumenty k tomuto zařízení.</p>
  )

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {docs.map((doc: any) => (
        <li key={doc.id} style={{
          padding: '10px 14px', border: '1px solid var(--border)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <FileText size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.name ?? doc.originalName ?? doc.id}
            </div>
            {doc.createdAt && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {new Date(doc.createdAt).toLocaleDateString('cs-CZ')}
              </div>
            )}
          </div>
          {doc.url && (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: 'var(--accent-blue)' }}>
              Otevřít
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

// ─── Audit Tab ───────────────────────────────────────────────────────

function AuditTab({ assetId }: { assetId: string }) {
  const { data, isLoading, error } = useQuery<{ data: AuditEvent[]; total: number }>({
    queryKey: ['assets', assetId, 'audit'],
    queryFn: () => apiClient.get(`/assets/${assetId}/audit-events`).then((r) => r.data),
  })

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState message="Nepodařilo se načíst audit." />
  if (data.data.length === 0) return (
    <p style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Žádné audit záznamy.</p>
  )

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.data.map((ev) => (
        <li key={ev.id} style={{
          padding: '10px 14px', borderLeft: '3px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
        }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.action}</span>
            {ev.user && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: 8 }}>
                {ev.user.name}
              </span>
            )}
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
            {new Date(ev.createdAt).toLocaleString('cs-CZ')}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────

function OverviewTab({ passport }: { passport: PassportResponse }) {
  const { asset, complianceSummary: cs } = passport
  const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'
  const fmtMoney = (v: number | null) => v !== null ? `${v.toLocaleString('cs-CZ')} Kč` : '—'
  const rows: [string, string][] = [
    ['Kategorie', CATEGORY_LABEL[asset.category] ?? asset.category],
    ['Stav', STATUS_LABEL[asset.status] ?? asset.status],
    ['Výrobce', asset.manufacturer ?? '—'],
    ['Model', asset.model ?? '—'],
    ['Sériové číslo', asset.serialNumber ?? '—'],
    ['Umístění', asset.location ?? '—'],
    ['Nemovitost', asset.property?.name ?? '—'],
    ['Jednotka', asset.unit?.name ?? '—'],
    ['Datum nákupu', fmtDate(asset.purchaseDate)],
    ['Pořizovací hodnota', fmtMoney(asset.purchaseValue)],
    ['Záruka do', fmtDate(asset.warrantyUntil)],
    ['Interval servisu', asset.serviceInterval ? `${asset.serviceInterval} dní` : '—'],
    ['Poslední servis', fmtDate(asset.lastServiceDate)],
    ['Příští servis', fmtDate(asset.nextServiceDate)],
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
      {/* Left: details */}
      <div>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Technické údaje
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '7px 0', color: 'var(--text-muted)', fontSize: '0.85rem', width: '45%' }}>{label}</td>
                <td style={{ padding: '7px 0', fontSize: '0.9rem', fontWeight: 500 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {asset.notes && (
          <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-alt, var(--surface))', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Poznámky</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{asset.notes}</p>
          </div>
        )}
      </div>

      {/* Right: compliance + recent service */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{
          padding: 16, border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Compliance
          </h3>
          <div style={{ marginBottom: 12 }}>
            <ComplianceBadge badge={cs.badge} />
          </div>
          {cs.total > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              <KpiCard label="V pořádku" value={String(cs.compliant)} color="var(--accent-green, #22c55e)" />
              <KpiCard label="Blíží se" value={String(cs.dueSoon)} color="var(--accent-orange, #f59e0b)" />
              <KpiCard label="Po termínu" value={String(cs.overdue)} color="var(--danger, #ef4444)" />
            </div>
          )}
        </div>

        {asset.serviceRecords && asset.serviceRecords.length > 0 && (
          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 10 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Poslední servisní záznamy
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {asset.serviceRecords.slice(0, 5).map((r) => (
                <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span>{new Date(r.date).toLocaleDateString('cs-CZ')} — {r.type}</span>
                  {r.cost !== null && <span style={{ color: 'var(--text-muted)' }}>{r.cost.toLocaleString('cs-CZ')} Kč</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function AssetPassportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')

  const { data: passport, isLoading, error } = useQuery<PassportResponse>({
    queryKey: ['assets', id, 'passport'],
    queryFn: () => apiClient.get(`/assets/${id}/passport`).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) return <LoadingState />
  if (error || !passport) return <ErrorState message="Aktivum nenalezeno." />

  const { asset } = passport

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button size="sm" onClick={() => navigate('/assets')}><ArrowLeft size={15} /></Button>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>{asset.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant={STATUS_COLOR[asset.status] ?? 'muted'}>{STATUS_LABEL[asset.status] ?? asset.status}</Badge>
              <Badge variant="blue">{CATEGORY_LABEL[asset.category] ?? asset.category}</Badge>
              {asset.assetType && (
                <Badge variant="muted">{asset.assetType.name}</Badge>
              )}
              {asset.serialNumber && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>S/N: {asset.serialNumber}</span>
              )}
            </div>
          </div>
        </div>
        <ComplianceBadge badge={passport.complianceSummary.badge} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview' && <OverviewTab passport={passport} />}
        {tab === 'plans' && <PlansTab assetId={id!} />}
        {tab === 'history' && <HistoryTab assetId={id!} />}
        {tab === 'documents' && <DocumentsTab assetId={id!} />}
        {tab === 'audit' && <AuditTab assetId={id!} />}
      </div>
    </div>
  )
}

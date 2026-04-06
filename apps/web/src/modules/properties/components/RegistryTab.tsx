import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { apiClient } from '../../../core/api/client'
import { Badge, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { cs } from '../../../i18n/locales/cs'
import type { AresFullData, AresStatutarniClen } from '@ifmio/shared-types'

const t = cs.registry

interface RegistryTabProps {
  propertyId: string
  aresData: AresFullData | null
  enrichedAt: string | null
  onRefresh: () => void
}

const FUNKCE_COLORS: Record<string, string> = {
  'předseda výboru': '#0d9488',
  'předseda': '#0d9488',
  'předseda SVJ': '#0d9488',
  'místopředseda výboru': '#3b82f6',
  'místopředseda': '#3b82f6',
}

function getFunkceColor(funkce: string): string {
  const lower = funkce.toLowerCase()
  for (const [key, color] of Object.entries(FUNKCE_COLORS)) {
    if (lower.includes(key)) return color
  }
  return '#6b7280' // gray for "člen" and others
}

export default function RegistryTab({ propertyId, aresData, enrichedAt, onRefresh }: RegistryTabProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const enrichMutation = useMutation({
    mutationFn: () => apiClient.post(`/properties/${propertyId}/enrich`),
    onSuccess: () => {
      toast.success('Data z ARES aktualizována')
      queryClient.invalidateQueries({ queryKey: ['properties', propertyId] })
      onRefresh()
    },
    onError: () => toast.error('Enrichment selhal'),
  })

  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  }
  const headerStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: '.9rem',
    marginBottom: 12,
  }

  // No data loaded yet
  if (!aresData) {
    return (
      <div data-testid="property-registry-tab">
        <div style={{ ...sectionStyle, textAlign: 'center', padding: 32 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 12 }}>{t.noData}</div>
          <Button
            onClick={() => enrichMutation.mutate()}
            disabled={enrichMutation.isPending}
            icon={<RefreshCw size={14} className={enrichMutation.isPending ? 'animate-spin' : ''} />}
          >
            {enrichMutation.isPending ? 'Načítám...' : t.loadBtn}
          </Button>
        </div>
      </div>
    )
  }

  // Sort statutory body members: active first, then historical
  const sortedClenove = aresData.statutarniOrgan?.clenove
    ? [...aresData.statutarniOrgan.clenove].sort((a, b) => {
        const aActive = !a.datumVymazu
        const bActive = !b.datumVymazu
        if (aActive !== bActive) return aActive ? -1 : 1
        return 0
      })
    : []
  const activeClenove = sortedClenove.filter(c => !c.datumVymazu)
  const historicalClenove = sortedClenove.filter(c => !!c.datumVymazu)

  return (
    <div data-testid="property-registry-tab">
      {/* Header: last updated + refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
          {enrichedAt
            ? `${t.lastUpdated}: ${new Date(enrichedAt).toLocaleString('cs-CZ')}`
            : ''}
        </span>
        <Button
          onClick={() => enrichMutation.mutate()}
          disabled={enrichMutation.isPending}
          icon={<RefreshCw size={14} className={enrichMutation.isPending ? 'animate-spin' : ''} />}
        >
          {t.refreshBtn}
        </Button>
      </div>

      {/* Sekce 1: Základní údaje z registru */}
      <div style={sectionStyle}>
        <div style={headerStyle}>{t.basicInfo}</div>
        <table style={{ width: '100%', fontSize: '.85rem', borderCollapse: 'collapse' }}>
          <tbody>
            <InfoRow label="IČO" value={aresData.ico} />
            {aresData.dic && <InfoRow label="DIČ" value={aresData.dic} />}
            <InfoRow label="Právní forma" value={t.legalForms[aresData.pravniForma] ?? aresData.pravniForma} />
            {aresData.datumVzniku && <InfoRow label="Datum vzniku" value={new Date(aresData.datumVzniku).toLocaleDateString('cs-CZ')} />}
            {aresData.datumAktualizace && <InfoRow label="Datum aktualizace v registru" value={new Date(aresData.datumAktualizace).toLocaleDateString('cs-CZ')} />}
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 12px', color: 'var(--text-muted)', width: '40%' }}>Stav</td>
              <td style={{ padding: '6px 12px' }}><StatusBadge status={aresData.stavVr} /></td>
            </tr>
            {aresData.spisovaZnacka && <InfoRow label="Spisová značka" value={aresData.spisovaZnacka} />}
            {aresData.czNace && aresData.czNace.length > 0 && (
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 12px', color: 'var(--text-muted)', width: '40%' }}>NACE kódy</td>
                <td style={{ padding: '6px 12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {aresData.czNace.map((nace, i) => (
                      <span key={i} style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: '.75rem', background: 'var(--gray-100)', color: 'var(--text-secondary)',
                      }}>
                        {nace}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sekce 2: Statutární orgán */}
      {aresData.statutarniOrgan && (
        <div style={sectionStyle}>
          <div style={headerStyle}>{aresData.statutarniOrgan.nazev}</div>

          {/* Active members */}
          {activeClenove.length > 0 && (
            <>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>{t.active}</div>
              <MemberTable members={activeClenove} isActive={true} />
            </>
          )}

          {/* Historical members */}
          {historicalClenove.length > 0 && (
            <>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 16, marginBottom: 6 }}>{t.historical}</div>
              <MemberTable members={historicalClenove} isActive={false} />
            </>
          )}

          {sortedClenove.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Statutární orgán nemá žádné členy.</div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '6px 12px', color: 'var(--text-muted)', width: '40%' }}>{label}</td>
      <td style={{ padding: '6px 12px' }}>{value}</td>
    </tr>
  )
}

function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase()
  if (upper === 'AKTIVNI') return <Badge variant="green">{t.status.AKTIVNI}</Badge>
  if (upper === 'NEEXISTUJICI') return <Badge variant="red">{t.status.NEEXISTUJICI}</Badge>
  return <Badge variant="muted">{t.status.UNKNOWN}</Badge>
}

function FunkceBadge({ funkce }: { funkce: string }) {
  const color = getFunkceColor(funkce)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: '.75rem', fontWeight: 500,
      background: `${color}18`, color,
    }}>
      {funkce}
    </span>
  )
}

function MemberTable({ members, isActive }: { members: AresStatutarniClen[]; isActive: boolean }) {
  return (
    <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.name}</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.funkce}</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.from}</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.to}</th>
        </tr>
      </thead>
      <tbody>
        {members.map((clen, i) => {
          const fullName = [clen.titulPred, clen.jmeno, clen.prijmeni].filter(Boolean).join(' ')
          const dateFrom = clen.vznikFunkce ?? clen.datumZapisu
          const dateTo = clen.zanikFunkce ?? clen.datumVymazu
          const rowStyle: React.CSSProperties = {
            borderBottom: '1px solid var(--border)',
            ...(!isActive ? { color: 'var(--text-muted)' } : {}),
          }
          return (
            <tr key={i} style={rowStyle}>
              <td style={{ padding: '6px 8px', fontWeight: isActive ? 500 : 400 }}>{fullName}</td>
              <td style={{ padding: '6px 8px' }}><FunkceBadge funkce={clen.funkce} /></td>
              <td style={{ padding: '6px 8px' }}>{dateFrom ? new Date(dateFrom).toLocaleDateString('cs-CZ') : '—'}</td>
              <td style={{ padding: '6px 8px', ...(!isActive && dateTo ? { textDecoration: 'line-through' } : {}) }}>
                {dateTo ? new Date(dateTo).toLocaleDateString('cs-CZ') : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

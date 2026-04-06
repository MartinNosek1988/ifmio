import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { apiClient } from '../../../core/api/client'
import { Badge, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { cs } from '../../../i18n/locales/cs'
import type { AresEnrichmentData, JusticeEnrichmentData, JusticeDocument } from '@ifmio/shared-types'

const t = cs.registry

interface RegistryTabProps {
  propertyId: string
  aresData: AresEnrichmentData | null
  justiceData: JusticeEnrichmentData | null
  enrichedAt: string | null
  onRefresh: () => void
}

const DOC_TYPE_COLORS: Record<string, string> = {
  STANOVY: '#0d9488',
  UCETNI_ZAVERKA: '#3b82f6',
  NOTARSKY_ZAPIS: '#9333ea',
  ZAPIS_SHROMAZDENI: '#f97316',
  VYROCNI_ZPRAVA: '#6366f1',
  JINE: '#6b7280',
}

export default function RegistryTab({ propertyId, aresData, justiceData, enrichedAt, onRefresh }: RegistryTabProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [docFilter, setDocFilter] = useState<string>('ALL')

  const enrichMutation = useMutation({
    mutationFn: () => apiClient.post(`/properties/${propertyId}/enrich`),
    onSuccess: () => {
      toast.success('Enrichment spuštěn')
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

  return (
    <div data-testid="property-registry-tab">
      {/* Last updated + Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
          {enrichedAt
            ? `${t.lastUpdated}: ${new Date(enrichedAt).toLocaleString('cs-CZ')}`
            : t.noData}
        </span>
        <Button
          onClick={() => enrichMutation.mutate()}
          disabled={enrichMutation.isPending}
          icon={<RefreshCw size={14} className={enrichMutation.isPending ? 'animate-spin' : ''} />}
        >
          {t.refresh}
        </Button>
      </div>

      {/* Section 1: Basic ARES data */}
      <div style={sectionStyle}>
        <div style={headerStyle}>{t.basicData}</div>
        {aresData ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', fontSize: '.85rem' }}>
            <DataRow label="IČO" value={aresData.ico} />
            <DataRow label="DIČ" value={aresData.dic} />
            <DataRow label="Datová schránka" value={aresData.datovaSChrana} />
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Stav: </span>
              <StatusBadge status={aresData.stavSubjektu} />
            </div>
            <DataRow label="Datum vzniku" value={aresData.datumVzniku ? new Date(aresData.datumVzniku).toLocaleDateString('cs-CZ') : undefined} />
            <DataRow label="Právní forma" value={aresData.pravniForma.nazev} />
            {aresData.spisovaZnacka && <DataRow label="Spisová značka" value={aresData.spisovaZnacka} />}
            {aresData.pocetZamestnancu && <DataRow label="Počet zaměstnanců" value={aresData.pocetZamestnancu} />}
            {aresData.nace && aresData.nace.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted)' }}>NACE: </span>
                {aresData.nace.map(n => `${n.kod}${n.nazev ? ` (${n.nazev})` : ''}`).join(', ')}
              </div>
            )}
          </div>
        ) : (
          <NoDataPlaceholder onLoad={() => enrichMutation.mutate()} loading={enrichMutation.isPending} source="ARES" />
        )}
      </div>

      {/* Section 2: Statutory body */}
      <div style={sectionStyle}>
        <div style={headerStyle}>{t.statutoryBody}</div>
        {aresData?.statutarniOrgan && aresData.statutarniOrgan.length > 0 ? (
          <div>
            {aresData.statutarniOrgan.map((organ, oi) => (
              <div key={oi} style={{ marginBottom: oi < aresData.statutarniOrgan!.length - 1 ? 12 : 0 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {organ.typOrganu}
                </div>
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
                    {organ.clenove.map((clen, ci) => {
                      const isEnded = !!clen.datumZaniku
                      const rowStyle: React.CSSProperties = {
                        borderBottom: '1px solid var(--border)',
                        ...(isEnded ? { color: 'var(--text-muted)', textDecoration: 'line-through' } : {}),
                      }
                      return (
                        <tr key={ci} style={rowStyle}>
                          <td style={{ padding: '6px 8px', fontWeight: isEnded ? 400 : 500 }}>{clen.jmeno} {clen.prijmeni}</td>
                          <td style={{ padding: '6px 8px' }}>{clen.funkce}</td>
                          <td style={{ padding: '6px 8px' }}>{clen.datumVzniku ? new Date(clen.datumVzniku).toLocaleDateString('cs-CZ') : '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{clen.datumZaniku ? new Date(clen.datumZaniku).toLocaleDateString('cs-CZ') : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : aresData ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Statutární orgán nebyl nalezen v ARES.</div>
        ) : (
          <NoDataPlaceholder onLoad={() => enrichMutation.mutate()} loading={enrichMutation.isPending} source="ARES" />
        )}
      </div>

      {/* Section 3: Sbírka listin */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={headerStyle}>{t.documents}</div>
          {justiceData && justiceData.sbirkaListin.length > 0 && (
            <select
              value={docFilter}
              onChange={e => setDocFilter(e.target.value)}
              style={{ fontSize: '.82rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
            >
              <option value="ALL">Vše</option>
              {Object.entries(t.docTypes).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          )}
        </div>
        {justiceData && justiceData.sbirkaListin.length > 0 ? (
          <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.datum}</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.typ}</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.nazev}</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.columns.odkaz}</th>
              </tr>
            </thead>
            <tbody>
              {justiceData.sbirkaListin
                .filter(d => docFilter === 'ALL' || d.typ === docFilter)
                .map((doc, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px' }}>{doc.datumPodani ? new Date(doc.datumPodani).toLocaleDateString('cs-CZ') : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <DocTypeBadge typ={doc.typ} />
                    </td>
                    <td style={{ padding: '6px 8px' }}>{doc.nazev}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          PDF <ExternalLink size={12} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : justiceData ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Sbírka listin je prázdná.</div>
        ) : (
          <NoDataPlaceholder onLoad={() => enrichMutation.mutate()} loading={enrichMutation.isPending} source="Justice.cz" />
        )}
      </div>

      {/* Section 4: History timeline */}
      <div style={sectionStyle}>
        <div style={headerStyle}>{t.history}</div>
        {justiceData && justiceData.historieCas.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: 7, top: 4, bottom: 4, width: 2,
              background: 'var(--gray-200)',
            }} />
            {justiceData.historieCas.map((event, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 14 }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: -20, top: 4, width: 12, height: 12,
                  borderRadius: '50%', background: 'var(--primary)',
                  border: '2px solid var(--color-surface, #fff)',
                }} />
                <div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                    {event.datum ? new Date(event.datum).toLocaleDateString('cs-CZ') : 'Datum neznámé'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Badge variant={event.typZmeny === 'zápis' ? 'green' : event.typZmeny === 'výmaz' ? 'red' : 'muted'}>
                      {event.typZmeny}
                    </Badge>
                  </div>
                  {event.popis && (
                    <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {event.popis.length > 300 ? event.popis.slice(0, 300) + '...' : event.popis}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : justiceData ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Žádná historie změn.</div>
        ) : (
          <NoDataPlaceholder onLoad={() => enrichMutation.mutate()} loading={enrichMutation.isPending} source="Justice.cz" />
        )}
      </div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
      <span>{value || '—'}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isActive = /aktivn/i.test(status)
  return (
    <Badge variant={isActive ? 'green' : 'red'}>
      {isActive ? t.status.AKTIVNI : t.status.ZANIKLY}
    </Badge>
  )
}

function DocTypeBadge({ typ }: { typ: JusticeDocument['typ'] }) {
  const color = DOC_TYPE_COLORS[typ] ?? DOC_TYPE_COLORS.JINE
  const label = t.docTypes[typ] ?? typ
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: '.75rem', fontWeight: 500,
      background: `${color}18`, color,
    }}>
      {label}
    </span>
  )
}

function NoDataPlaceholder({ onLoad, loading, source }: { onLoad: () => void; loading: boolean; source: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 8 }}>
        Data z {source} nejsou dostupná
      </div>
      <Button onClick={onLoad} disabled={loading}>
        {loading ? 'Načítám...' : t.loadData}
      </Button>
    </div>
  )
}

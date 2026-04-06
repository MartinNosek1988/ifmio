import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '../../core/api/client'
import { Badge, LoadingState, ErrorState } from '../../shared/components'
import { ChevronDown, ChevronRight } from 'lucide-react'

const LEGAL_FORMS: Record<string, string> = { '145': 'SVJ', '110': 'BD', '112': 's.r.o.', '121': 'a.s.', '706': 'Spolek', svj: 'SVJ', druzstvo: 'BD', sro: 's.r.o.', as: 'a.s.' }

interface EngagementRow {
  engagementId: string
  funkce: string
  od: string | null
  do: string | null
  aktivni: boolean
  personId?: string
  jmeno?: string
  prijmeni?: string
  titulPred?: string
  rokNarozeni?: number
  partnerIco?: string
  partnerNazev?: string
}

export default function OrganizationProfilePage() {
  const { ico } = useParams()
  const [showHistory, setShowHistory] = useState(false)

  const { data: org, isLoading, error } = useQuery({
    queryKey: ['registry', 'organization', ico],
    queryFn: () => apiClient.get(`/registry/organizations/${ico}`).then(r => r.data),
    enabled: !!ico,
  })

  if (isLoading) return <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}><LoadingState /></div>
  if (error || !org) return <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}><ErrorState message="Organizace nenalezena." /></div>

  const legalLabel = LEGAL_FORMS[org.pravniForma ?? ''] ?? org.pravniForma ?? ''
  const active: EngagementRow[] = org.statutarniOrgan ?? []
  const historical: EngagementRow[] = org.historieCas ?? []

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{org.nazev}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '.85rem', color: '#6b7280', alignItems: 'center' }}>
          <span>IČO: <strong style={{ color: '#111' }}>{org.ico}</strong></span>
          {legalLabel && <Badge variant="blue">{legalLabel}</Badge>}
          {org.datumVzniku && <span>Vznik: {new Date(org.datumVzniku).toLocaleDateString('cs-CZ')}</span>}
          <Badge variant={org.aktivni ? 'green' : 'red'}>{org.aktivni ? 'Aktivní' : 'Zaniklá'}</Badge>
        </div>
        {org.sidlo && <div style={{ fontSize: '.85rem', color: '#6b7280', marginTop: 6 }}>Sídlo: {org.sidlo}</div>}
        {org.spisovaZnacka && <div style={{ fontSize: '.85rem', color: '#6b7280', marginTop: 4 }}>Spisová značka: {org.spisovaZnacka}</div>}
      </div>

      {/* Active statutory body */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>Statutární orgán</h2>
        {active.length > 0 ? (
          <EngagementTable rows={active} />
        ) : (
          <div style={{ color: '#6b7280', fontSize: '.85rem' }}>Žádní aktivní členové.</div>
        )}
      </div>

      {/* Historical (collapsible) */}
      {historical.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.95rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#111', padding: 0 }}
          >
            {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showHistory ? 'Skrýt historii' : 'Zobrazit historii'} ({historical.length} záznamů)
          </button>
          {showHistory && (
            <div style={{ marginTop: 12 }}>
              <EngagementTable rows={historical} muted />
            </div>
          )}
        </div>
      )}

      {/* CTA box */}
      {(org.pravniForma === '145' || org.pravniForma === 'svj' || org.pravniForma === '110' || org.pravniForma === 'druzstvo') && (
        <div style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)', border: '1px solid #99f6e4', borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6 }}>Spravujete toto SVJ?</div>
          <div style={{ fontSize: '.85rem', color: '#6b7280', marginBottom: 12 }}>Zjistěte, jak ifmio zjednodušuje správu SVJ a bytových domů</div>
          <a href="/cs/cenik" style={{ display: 'inline-block', padding: '8px 20px', background: '#0d9488', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: '.85rem', fontWeight: 600 }}>
            Zjistit více
          </a>
        </div>
      )}

      {/* Data source footer */}
      <div style={{ textAlign: 'center', fontSize: '.75rem', color: '#9ca3af', padding: '8px 0' }}>
        Data pochází z veřejného rejstříku dle zákona č. 304/2013 Sb.
      </div>
    </div>
  )
}

function EngagementTable({ rows, muted }: { rows: EngagementRow[]; muted?: boolean }) {
  return (
    <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Jméno</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Funkce</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Ve funkci od</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const name = row.personId
            ? [row.titulPred, row.jmeno, row.prijmeni].filter(Boolean).join(' ')
            : row.partnerNazev ?? '—'
          return (
            <tr key={row.engagementId} style={{ borderBottom: '1px solid #e5e7eb', color: muted ? '#9ca3af' : undefined }}>
              <td style={{ padding: '6px 8px', fontWeight: muted ? 400 : 500 }}>
                {row.personId ? (
                  <Link to={`/registry/persons/${row.personId}`} style={{ color: '#0d9488', textDecoration: 'none' }}>{name}</Link>
                ) : name}
              </td>
              <td style={{ padding: '6px 8px' }}>{row.funkce}</td>
              <td style={{ padding: '6px 8px' }}>{row.od ? new Date(row.od).toLocaleDateString('cs-CZ') : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

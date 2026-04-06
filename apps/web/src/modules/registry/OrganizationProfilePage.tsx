import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '../../core/api/client'
import { Badge, LoadingState, ErrorState } from '../../shared/components'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'

const LEGAL_FORM_LABELS: Record<string, string> = { svj: 'SVJ', '145': 'SVJ', '110': 'BD', '112': 's.r.o.', '121': 'a.s.', '706': 'Spolek', druzstvo: 'BD' }

export default function OrganizationProfilePage() {
  const { ico } = useParams()
  const [showHistory, setShowHistory] = useState(false)

  const { data: org, isLoading, error } = useQuery({
    queryKey: ['registry', 'organization', ico],
    queryFn: () => apiClient.get(`/registry/organizations/${ico}`).then(r => r.data),
    enabled: !!ico,
  })

  if (isLoading) return <LoadingState />
  if (error || !org) return <ErrorState message="Organizace nenalezena." />

  const activeEngagements = (org.engagements ?? []).filter((e: any) => e.aktivni)
  const historicalEngagements = (org.engagements ?? []).filter((e: any) => !e.aktivni)
  const legalLabel = LEGAL_FORM_LABELS[org.legalFormCode ?? ''] ?? org.legalFormName ?? ''

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Link to="/crm/organizations" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 16, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Zpět
      </Link>

      {/* Header */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{org.name}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '.85rem', color: 'var(--text-muted)' }}>
          <span>IČO: <strong style={{ color: 'var(--dark)' }}>{org.ico}</strong></span>
          {legalLabel && <Badge variant="blue">{legalLabel}</Badge>}
          {org.dateEstablished && <span>Vznik: {new Date(org.dateEstablished).toLocaleDateString('cs-CZ')}</span>}
          <Badge variant={org.isActive ? 'green' : 'red'}>{org.isActive ? 'Aktivní' : 'Zaniklý'}</Badge>
        </div>
        {org.street && <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 6 }}>Sídlo: {org.street}</div>}
      </div>

      {/* Active statutory body */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>Statutární orgán</h3>
        {activeEngagements.length > 0 ? (
          <EngagementTable engagements={activeEngagements} showLinks />
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Žádní aktivní členové.</div>
        )}
      </div>

      {/* History (collapsible) */}
      {historicalEngagements.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.95rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark)', padding: 0 }}
          >
            {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Historie ({historicalEngagements.length} záznamů)
          </button>
          {showHistory && (
            <div style={{ marginTop: 12 }}>
              <EngagementTable engagements={historicalEngagements} showLinks />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EngagementTable({ engagements, showLinks }: { engagements: any[]; showLinks?: boolean }) {
  return (
    <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Jméno</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Funkce</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Od</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Do</th>
        </tr>
      </thead>
      <tbody>
        {engagements.map((eng: any) => {
          const person = eng.person
          const name = person
            ? [person.titulPred, person.firstName, person.lastName].filter(Boolean).join(' ')
            : eng.partnerNazev ?? '—'
          const isActive = eng.aktivni
          return (
            <tr key={eng.id} style={{ borderBottom: '1px solid var(--border)', color: isActive ? undefined : 'var(--text-muted)' }}>
              <td style={{ padding: '6px 8px', fontWeight: isActive ? 500 : 400 }}>
                {showLinks && person?.id ? (
                  <Link to={`/crm/registry/persons/${person.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{name}</Link>
                ) : name}
              </td>
              <td style={{ padding: '6px 8px' }}>{eng.funkce}</td>
              <td style={{ padding: '6px 8px' }}>{eng.od ? new Date(eng.od).toLocaleDateString('cs-CZ') : '—'}</td>
              <td style={{ padding: '6px 8px' }}>{eng.do ? new Date(eng.do).toLocaleDateString('cs-CZ') : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

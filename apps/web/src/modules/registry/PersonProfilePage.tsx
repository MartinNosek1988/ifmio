import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Badge, LoadingState, ErrorState } from '../../shared/components'

const LEGAL_FORMS: Record<string, string> = { '145': 'SVJ', '110': 'BD', '112': 's.r.o.', '121': 'a.s.', '706': 'Spolek', svj: 'SVJ', druzstvo: 'BD', sro: 's.r.o.', as: 'a.s.' }
const LEGAL_FORM_COLORS: Record<string, string> = { SVJ: 'green', BD: 'blue', 's.r.o.': 'purple', 'a.s.': 'muted' }

export default function PersonProfilePage() {
  const { id } = useParams()
  const { data: person, isLoading, error } = useQuery({
    queryKey: ['registry', 'person', id],
    queryFn: () => apiClient.get(`/registry/persons/${id}`).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}><LoadingState /></div>
  if (error || !person) return <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}><ErrorState message="Osoba nenalezena." /></div>

  const fullName = [person.titulPred, person.jmeno, person.prijmeni, person.titulZa].filter(Boolean).join(' ')
  const activeEngagements = (person.engagements ?? []).filter((e: any) => e.aktivni)
  const historicalEngagements = (person.engagements ?? []).filter((e: any) => !e.aktivni)

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>{fullName}</h1>
        <div style={{ fontSize: '.85rem', color: '#6b7280' }}>
          Rok narození: {person.rokNarozeni ?? 'neuvedeno'}
        </div>
      </div>

      {/* Active engagements */}
      {activeEngagements.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>Aktivní angažmá</h2>
          <EngagementTable engagements={activeEngagements} />
        </div>
      )}

      {/* Historical engagements */}
      {historicalEngagements.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12, color: '#6b7280' }}>Historické záznamy</h2>
          <EngagementTable engagements={historicalEngagements} muted />
        </div>
      )}

      {activeEngagements.length === 0 && historicalEngagements.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, textAlign: 'center', color: '#6b7280' }}>
          Žádné záznamy v rejstříku.
        </div>
      )}

      {/* Data source */}
      <div style={{ textAlign: 'center', fontSize: '.75rem', color: '#9ca3af', padding: '8px 0' }}>
        Data pochází z veřejného rejstříku dle zákona č. 304/2013 Sb.
      </div>
    </div>
  )
}

function EngagementTable({ engagements, muted }: { engagements: any[]; muted?: boolean }) {
  return (
    <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Název subjektu</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Typ</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Funkce</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Od</th>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>Do</th>
        </tr>
      </thead>
      <tbody>
        {engagements.map((eng: any) => {
          const label = LEGAL_FORMS[eng.pravniForma ?? ''] ?? ''
          const variant = LEGAL_FORM_COLORS[label] ?? 'muted'
          return (
            <tr key={eng.id ?? eng.ico + eng.funkce} style={{ borderBottom: '1px solid #e5e7eb', color: muted ? '#9ca3af' : undefined }}>
              <td style={{ padding: '6px 8px', fontWeight: muted ? 400 : 500 }}>
                <Link to={`/registry/organizations/${eng.ico}`} style={{ color: muted ? '#9ca3af' : '#0d9488', textDecoration: 'none' }}>
                  {eng.nazevFirmy}
                </Link>
              </td>
              <td style={{ padding: '6px 8px' }}>{label && <Badge variant={variant as any}>{label}</Badge>}</td>
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

import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Badge, LoadingState, ErrorState } from '../../shared/components'
import { ArrowLeft } from 'lucide-react'

const LEGAL_FORM_LABELS: Record<string, string> = { svj: 'SVJ', '145': 'SVJ', '110': 'BD', '112': 's.r.o.', '121': 'a.s.', '706': 'Spolek', druzstvo: 'BD' }
const LEGAL_FORM_COLORS: Record<string, string> = { SVJ: 'green', BD: 'blue', 's.r.o.': 'purple', 'a.s.': 'muted' }

export default function PersonProfilePage() {
  const { id } = useParams()
  const { data: person, isLoading, error } = useQuery({
    queryKey: ['registry', 'person', id],
    queryFn: () => apiClient.get(`/registry/persons/${id}`).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <LoadingState />
  if (error || !person) return <ErrorState message="Osoba nenalezena." />

  const fullName = [person.titulPred, person.firstName, person.lastName, person.titulZa].filter(Boolean).join(' ')

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Link to="/crm/organizations" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 16, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Zpět
      </Link>

      {/* Header */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>{fullName}</h2>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
          {person.datumNarozeni && <span>Narozen/a: {new Date(person.datumNarozeni).toLocaleDateString('cs-CZ')}</span>}
          {person.adresa && <span>{person.adresa}</span>}
        </div>
      </div>

      {/* Engagements */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 12 }}>Angažmá</h3>
        {person.engagements?.length > 0 ? (
          <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Název subjektu</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Typ</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Funkce</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Od</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Do</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {person.engagements.map((eng: any) => {
                const orgLabel = LEGAL_FORM_LABELS[eng.organization?.legalFormCode ?? ''] ?? ''
                const badgeVariant = LEGAL_FORM_COLORS[orgLabel] ?? 'muted'
                return (
                  <tr key={eng.id} style={{ borderBottom: '1px solid var(--border)', color: eng.aktivni ? undefined : 'var(--text-muted)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: eng.aktivni ? 500 : 400 }}>
                      <Link to={`/crm/registry/organizations/${eng.ico}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {eng.nazevFirmy}
                      </Link>
                    </td>
                    <td style={{ padding: '6px 8px' }}>{orgLabel && <Badge variant={badgeVariant as any}>{orgLabel}</Badge>}</td>
                    <td style={{ padding: '6px 8px' }}>{eng.funkce}</td>
                    <td style={{ padding: '6px 8px' }}>{eng.od ? new Date(eng.od).toLocaleDateString('cs-CZ') : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{eng.do ? new Date(eng.do).toLocaleDateString('cs-CZ') : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge variant={eng.aktivni ? 'green' : 'muted'}>{eng.aktivni ? 'Aktivní' : 'Historické'}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Žádné záznamy v rejstříku.</div>
        )}
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Phone, Mail, Building2, User, MapPin } from 'lucide-react'
import { apiClient } from '../../core/api/client'
import { LoadingSpinner } from '../../shared/components'

export default function PortalContactsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'contacts'],
    queryFn: () => apiClient.get('/portal/my-contacts').then(r => r.data),
  })

  if (isLoading) return <LoadingSpinner />

  const manager = data?.manager
  const properties = data?.properties ?? []

  return (
    <div data-testid="portal-contacts-page">
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20 }}>Kontakty</h1>

      {/* Property manager company */}
      {manager && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Building2 size={18} style={{ color: 'var(--primary, #6366f1)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Správce nemovitosti</span>
          </div>
          {manager.orgName && <div style={rowStyle}><strong>{manager.orgName}</strong></div>}
          {manager.email && (
            <div style={rowStyle}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              <a href={`mailto:${manager.email}`} style={linkStyle}>{manager.email}</a>
            </div>
          )}
          {manager.phone && (
            <div style={rowStyle}>
              <Phone size={14} style={{ color: 'var(--text-muted)' }} />
              <a href={`tel:${manager.phone}`} style={linkStyle}>{manager.phone}</a>
            </div>
          )}
          {manager.address && (
            <div style={rowStyle}>
              <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{manager.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Properties */}
      {properties.map((prop: any) => (
        <div key={prop.id} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Building2 size={18} style={{ color: 'var(--accent-blue, #3b82f6)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{prop.name}</span>
          </div>
          {prop.address && (
            <div style={rowStyle}>
              <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{prop.address}</span>
            </div>
          )}
          {prop.contactName && (
            <div style={rowStyle}>
              <User size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{prop.contactName}</span>
            </div>
          )}
          {prop.contactEmail && (
            <div style={rowStyle}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              <a href={`mailto:${prop.contactEmail}`} style={linkStyle}>{prop.contactEmail}</a>
            </div>
          )}
          {prop.contactPhone && (
            <div style={rowStyle}>
              <Phone size={14} style={{ color: 'var(--text-muted)' }} />
              <a href={`tel:${prop.contactPhone}`} style={linkStyle}>{prop.contactPhone}</a>
            </div>
          )}
          {!prop.contactName && !prop.contactEmail && !prop.contactPhone && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Kontaktní údaje nejsou vyplněny.</div>
          )}
        </div>
      ))}

      {!manager && properties.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Kontaktní údaje nejsou dostupné.
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '18px 20px', marginBottom: 12,
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem',
}

const linkStyle: React.CSSProperties = {
  color: 'var(--primary, #6366f1)', textDecoration: 'none',
}

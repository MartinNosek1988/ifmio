import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../core/api/client'
import { Landmark, Search } from 'lucide-react'

const ORG_TYPES = ['', 'SVJ', 'BD', 'SRO', 'AS', 'OTHER_ORG']

const card: React.CSSProperties = { background: 'var(--card-bg, #fff)', borderRadius: 12, border: '1px solid var(--border, #e5e7eb)', padding: 20 }
const inputStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #d1d5db)', fontSize: '0.82rem', background: 'var(--input-bg, #fff)' }

export default function CrmOrganizationsPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  const { data: orgs = [], isLoading } = useQuery<any[]>({
    queryKey: ['crm-organizations', search, type],
    queryFn: () => {
      const params: Record<string, string> = { limit: '50' }
      if (search) params.q = search
      if (type) params.type = type
      return apiClient.get('/knowledge-base/organizations', { params }).then(r => r.data)
    },
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Landmark size={22} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Organizace</h1>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{orgs.length} nalezeno</span>
      </div>

      <div style={{ ...card, marginBottom: 16, display: 'flex', gap: 8, padding: '12px 16px', alignItems: 'center' }}>
        <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
          <option value="">Typ: vše</option>
          {ORG_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Hledat název nebo IČO..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setSearch(q)} />
          <button onClick={() => setSearch(q)} style={{ ...inputStyle, cursor: 'pointer' }}><Search size={16} /></button>
        </div>
      </div>

      <div style={card}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Načítám...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Název</th>
                <th style={{ padding: '6px 8px' }}>IČO</th>
                <th style={{ padding: '6px 8px' }}>Typ</th>
                <th style={{ padding: '6px 8px' }}>Město</th>
                <th style={{ padding: '6px 8px' }}>Vznik</th>
                <th style={{ padding: '6px 8px' }}>Stav</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o: any) => (
                <tr key={o.id} onClick={() => navigate(`/crm/organizations/${o.id}`)} style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light, #f9fafb)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '6px 8px', fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{o.ico}</td>
                  <td style={{ padding: '6px 8px' }}>
                    {o.orgType && <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: o.orgType === 'SVJ' ? '#dbeafe' : '#fce7f3', color: o.orgType === 'SVJ' ? '#1d4ed8' : '#be185d' }}>{o.orgType}</span>}
                  </td>
                  <td style={{ padding: '6px 8px' }}>{o.city || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{o.dateEstablished ? new Date(o.dateEstablished).toLocaleDateString('cs-CZ') : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: o.isActive ? '#dcfce7' : '#fee2e2', color: o.isActive ? '#16a34a' : '#dc2626' }}>
                      {o.isActive ? 'Aktivní' : 'Zaniklá'}
                    </span>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Žádné organizace</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

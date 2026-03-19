import { useState } from 'react'
import { apiClient } from '../../core/api/client'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

const PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    bg: '#fff',
    color: '#374151',
    border: '#d1d5db',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    bg: '#fff',
    color: '#374151',
    border: '#d1d5db',
    icon: (
      <svg width="18" height="18" viewBox="0 0 21 21">
        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    bg: '#1877F2',
    color: '#fff',
    border: '#1877F2',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
] as const

interface Props {
  dividerText?: string
  onSuccess?: (data: any) => void
  onError?: (msg: string) => void
  mode?: 'login' | 'register'
  invitationToken?: string
}

export function OAuthButtons({ dividerText = 'nebo pokračujte přes', onSuccess, onError }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  // Use redirect flow: redirect to backend OAuth initiation
  const handleOAuth = (providerId: string) => {
    setLoading(providerId)
    window.location.href = `${API_BASE}/auth/oauth/${providerId}`
  }

  const btnStyle = (p: typeof PROVIDERS[number]): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '10px 16px', borderRadius: 8,
    border: `1px solid ${p.border}`, background: p.bg, color: p.color,
    fontSize: '.9rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading && loading !== p.id ? 0.5 : 1,
    transition: 'opacity 0.15s',
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#2a2d3a' }} />
        <span style={{ color: '#6b7280', fontSize: '12px', whiteSpace: 'nowrap' }}>{dividerText}</span>
        <div style={{ flex: 1, height: 1, background: '#2a2d3a' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PROVIDERS.map(p => (
          <button key={p.id} type="button" onClick={() => handleOAuth(p.id)} disabled={!!loading}
            style={btnStyle(p)}>
            {p.icon}
            {loading === p.id ? 'Přesměrování...' : p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

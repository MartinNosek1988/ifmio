import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import i18n from '../../core/i18n'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const err = searchParams.get('error')

    if (err) {
      setError(err)
      return
    }

    if (accessToken && refreshToken) {
      sessionStorage.setItem('ifmio:access_token', accessToken)
      sessionStorage.setItem('ifmio:refresh_token', refreshToken)
      // Fetch user info
      fetch((import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1') + '/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => r.json())
        .then(user => {
          sessionStorage.setItem('ifmio:user', JSON.stringify(user))
          if (user.language && user.language !== i18n.language) {
            i18n.changeLanguage(user.language)
          }
          navigate('/dashboard', { replace: true })
        })
        .catch(() => navigate('/dashboard', { replace: true }))
    } else {
      setError('Chybí přihlašovací údaje.')
    }
  }, [searchParams, navigate])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
          <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '14px', color: '#ef4444', fontSize: '0.85rem', margin: '24px 0' }}>
            {error}
          </div>
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
            Zpět na přihlášení
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700 }}>ifmio</h1>
        <p style={{ color: '#9ca3af', marginTop: 12 }}>Přihlašování...</p>
      </div>
    </div>
  )
}

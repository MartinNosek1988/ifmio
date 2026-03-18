import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../core/api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.post('/auth/forgot-password', { email })
    } catch {
      // Security: always show success — never reveal if email exists
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
          <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '0.95rem', fontWeight: 600 }}>Obnova hesla</p>
        </div>

        {submitted ? (
          <div>
            <div style={{ background: '#1a2e1a', border: '1px solid #22c55e', borderRadius: '8px', padding: '14px 16px', color: '#22c55e', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Pokud účet s tímto e-mailem existuje, obdržíte odkaz pro obnovu hesla.
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                ← Zpět na přihlášení
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>
              Zadejte svůj e-mail a pošleme vám odkaz pro obnovu hesla.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                style={{ width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? '#4338ca' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Odesílám...' : 'Odeslat odkaz'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login" style={{ color: '#6b7280', fontSize: '0.82rem', textDecoration: 'none' }}>
                ← Zpět na přihlášení
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

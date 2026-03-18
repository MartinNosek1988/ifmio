import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../core/api/client'

interface InvitationInfo {
  name: string
  email: string
  tenantName: string
  role: string
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [info, setInfo] = useState<InvitationInfo | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) { setError('Chybí token pozvánky.'); setLoading(false); return }
    apiClient.get(`/auth/invitation-info/${token}`)
      .then(res => { setInfo(res.data); setName(res.data.name); })
      .catch(() => setError('Pozvánka je neplatná, expirovaná nebo již byla použita.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Heslo musí mít alespoň 8 znaků.'); return }
    if (password !== confirmPassword) { setError('Hesla se neshodují.'); return }

    setSubmitting(true)
    try {
      await apiClient.post('/auth/accept-invitation', { token, password, name })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Nepodařilo se přijmout pozvánku.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
          <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '0.95rem', fontWeight: 600 }}>Přijetí pozvánky</p>
        </div>

        {loading && <p style={{ color: '#6b7280', textAlign: 'center' }}>Načítání...</p>}

        {!loading && error && !info && (
          <div>
            <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '14px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '24px' }}>{error}</div>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>→ Přihlásit se</Link>
            </div>
          </div>
        )}

        {success && (
          <div>
            <div style={{ background: '#1a2e1a', border: '1px solid #22c55e', borderRadius: '8px', padding: '14px', color: '#22c55e', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Účet byl úspěšně vytvořen. Nyní se můžete přihlásit.
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>→ Přihlásit se</Link>
            </div>
          </div>
        )}

        {info && !success && (
          <form onSubmit={handleSubmit}>
            <div style={{ background: '#1e1b4b', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#c4b5fd' }}>
              Pozvánka do <strong>{info.tenantName}</strong>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Jméno</label>
              <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>E-mail</label>
              <input value={info.email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Heslo (min. 8 znaků)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Potvrdit heslo</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} style={inputStyle} />
            </div>
            {error && <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', background: submitting ? '#4338ca' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Vytvářím účet...' : 'Vytvořit účet'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

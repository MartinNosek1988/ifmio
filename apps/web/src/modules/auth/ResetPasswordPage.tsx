import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../core/api/client'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError(t('auth.resetPassword.passwordTooShort')); return }
    if (password !== confirmPassword) { setError(t('auth.resetPassword.passwordMismatch')); return }
    if (!token) { setError(t('auth.resetPassword.errorInvalid')); return }

    setLoading(true)
    try {
      await apiClient.post('/auth/reset-password', { token, password })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('auth.resetPassword.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ifmio</h1>
          <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '0.95rem', fontWeight: 600 }}>{t('auth.resetPassword.title')}</p>
        </div>

        {success ? (
          <div>
            <div style={{ background: '#1a2e1a', border: '1px solid #22c55e', borderRadius: '8px', padding: '14px 16px', color: '#22c55e', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
              {t('auth.resetPassword.success')}
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                {t('auth.resetPassword.goToLogin')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.resetPassword.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoFocus style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.resetPassword.confirmPassword')}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} style={inputStyle} />
            </div>
            {error && (
              <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#4338ca' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login" style={{ color: '#6b7280', fontSize: '0.82rem', textDecoration: 'none' }}>
                {t('auth.resetPassword.backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

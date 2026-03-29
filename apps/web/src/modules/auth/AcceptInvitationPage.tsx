import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../core/api/client'
import { PasswordStrengthIndicator } from '../../shared/components/PasswordStrengthIndicator'
import { OAuthButtons } from '../../shared/components/OAuthButtons'

interface InvitationInfo {
  name: string
  email: string
  tenantName: string
  role: string
}

export default function AcceptInvitationPage() {
  const { t } = useTranslation()
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
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    if (!token) { setError(t('auth.acceptInvitation.errorMissingToken')); setLoading(false); return }
    apiClient.get(`/auth/invitation-info/${token}`)
      .then(res => { setInfo(res.data); setName(res.data.name); })
      .catch(() => setError(t('auth.acceptInvitation.errorInvalid')))
      .finally(() => setLoading(false))
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError(t('auth.acceptInvitation.passwordTooShort')); return }
    if (password !== confirmPassword) { setError(t('auth.acceptInvitation.passwordMismatch')); return }

    setSubmitting(true)
    try {
      await apiClient.post('/auth/accept-invitation', { token, password, name })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('auth.acceptInvitation.errorCreate'))
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
          <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '0.95rem', fontWeight: 600 }}>{t('auth.acceptInvitation.title')}</p>
        </div>

        {loading && <p style={{ color: '#6b7280', textAlign: 'center' }}>{t('auth.acceptInvitation.loading')}</p>}

        {!loading && error && !info && (
          <div>
            <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '14px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '24px' }}>{error}</div>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>{t('auth.acceptInvitation.goToLogin')}</Link>
            </div>
          </div>
        )}

        {success && (
          <div>
            <div style={{ background: '#1a2e1a', border: '1px solid #22c55e', borderRadius: '8px', padding: '14px', color: '#22c55e', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>
              {t('auth.acceptInvitation.success')}
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>{t('auth.acceptInvitation.goToLogin')}</Link>
            </div>
          </div>
        )}

        {info && !success && (
          <form onSubmit={handleSubmit}>
            <div style={{ background: '#1e1b4b', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#c4b5fd' }}>
              {t('auth.acceptInvitation.youWereInvitedTo')} <strong>{info.tenantName}</strong>
            </div>
            <OAuthButtons dividerText="nebo přijměte pozvánku přes" />

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.acceptInvitation.name')}</label>
              <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.acceptInvitation.email')}</label>
              <input value={info.email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.acceptInvitation.password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
              <PasswordStrengthIndicator password={password} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>{t('auth.acceptInvitation.confirmPassword')}</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} style={inputStyle} />
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: '2px' }} />
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                {t('auth.acceptInvitation.consent')}{' '}
                <Link to="/terms" style={{ color: '#6366f1', textDecoration: 'none' }}>{t('auth.acceptInvitation.terms')}</Link>
                {' '}{t('auth.acceptInvitation.and')}{' '}
                <Link to="/privacy" style={{ color: '#6366f1', textDecoration: 'none' }}>{t('auth.acceptInvitation.privacy')}</Link>
              </span>
            </label>
            {error && <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}
            <button type="submit" disabled={submitting || !consent} style={{ width: '100%', padding: '12px', background: submitting || !consent ? '#4338ca' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: submitting || !consent ? 'not-allowed' : 'pointer' }}>
              {submitting ? t('auth.acceptInvitation.submitting') : t('auth.acceptInvitation.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

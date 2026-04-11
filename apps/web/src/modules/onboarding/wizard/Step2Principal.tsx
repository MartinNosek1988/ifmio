import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Check, AlertTriangle, Loader2 } from 'lucide-react'
import { wizardApi, type AresResult } from './wizard.api'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid var(--border, #e5e7eb)', background: 'var(--surface, #fff)',
  fontSize: '0.9rem', color: 'var(--text, #1a1a2e)', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--text, #374151)', marginBottom: 4,
}

export function Step2Principal({ archetype, onComplete, onBack }: {
  archetype: string
  onComplete: () => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [ico, setIco] = useState('')
  const [dic, setDic] = useState('')
  const [legalForm, setLegalForm] = useState('')
  const [ares, setAres] = useState<AresResult | null>(null)
  const [aresLoading, setAresLoading] = useState(false)

  const subtitle = archetype === 'SELF_MANAGED_HOA' ? t('onboarding.step2.subtitleHoa')
    : archetype === 'MANAGEMENT_COMPANY' ? t('onboarding.step2.subtitleCompany')
    : t('onboarding.step2.subtitleOwner')

  // ARES lookup when IČ reaches 8 digits
  useEffect(() => {
    const cleaned = ico.replace(/\s/g, '')
    if (cleaned.length !== 8 || !/^\d{8}$/.test(cleaned)) {
      setAres(null)
      return
    }
    let cancelled = false
    setAresLoading(true)
    wizardApi.aresLookup(cleaned)
      .then(result => {
        if (cancelled) return
        setAres(result)
        if (result.found) {
          if (result.name && !name) setName(result.name)
          if (result.legalForm) setLegalForm(result.legalForm)
        }
      })
      .catch(() => { if (!cancelled) setAres({ ico: cleaned, found: false }) })
      .finally(() => { if (!cancelled) setAresLoading(false) })
    return () => { cancelled = true }
  }, [ico])

  const mutation = useMutation({
    mutationFn: () => wizardApi.step2({
      name, ico: ico.replace(/\s/g, '') || undefined, dic: dic || undefined, legalForm: legalForm || undefined,
    }),
    onSuccess: () => onComplete(),
  })

  const canSubmit = name.trim().length > 0 && !mutation.isPending

  return (
    <div>
      <h2 data-testid="onboarding-step-2-title" style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text, #1a1a2e)' }}>
        {t('onboarding.step2.title')}
      </h2>
      <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.9rem', margin: '0 0 24px' }}>
        {subtitle}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>{t('onboarding.step2.name')} *</label>
          <input data-testid="principal-name" value={name} onChange={e => setName(e.target.value)}
            style={inputStyle} placeholder="SVJ Korunní 42" />
        </div>

        <div>
          <label style={labelStyle}>{t('onboarding.step2.ico')}</label>
          <div style={{ position: 'relative' }}>
            <input data-testid="principal-ico" value={ico} onChange={e => setIco(e.target.value)}
              maxLength={8} style={inputStyle} placeholder="01234567" />
            {aresLoading && (
              <span style={{ position: 'absolute', right: 10, top: 10, color: '#6b7280' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              </span>
            )}
          </div>
          {ares?.found && (
            <div data-testid="ares-verified-badge" style={{
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
              fontSize: '0.78rem', color: '#22c55e', fontWeight: 600,
            }}>
              <Check size={13} /> {t('onboarding.step2.aresVerified')}
            </div>
          )}
          {ares && !ares.found && (
            <div data-testid="ares-not-found-badge" style={{
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
              fontSize: '0.78rem', color: '#f59e0b', fontWeight: 500,
            }}>
              <AlertTriangle size={13} /> {t('onboarding.step2.aresNotFound')}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>{t('onboarding.step2.dic')}</label>
          <input data-testid="principal-dic" value={dic} onChange={e => setDic(e.target.value)}
            style={inputStyle} placeholder="CZ01234567" />
        </div>

        <div>
          <label style={labelStyle}>{t('onboarding.step2.legalForm')}</label>
          <input value={legalForm} onChange={e => setLegalForm(e.target.value)}
            style={inputStyle} placeholder={ares?.legalForm || 'Společenství vlastníků jednotek'} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button data-testid="onboarding-back" onClick={onBack}
          style={{
            flex: 1, padding: '12px', borderRadius: 10,
            border: '1.5px solid var(--border, #e5e7eb)', background: 'var(--surface, #fff)',
            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text, #374151)',
          }}>
          ← {t('onboarding.back')}
        </button>
        <button data-testid="onboarding-next" onClick={() => mutation.mutate()} disabled={!canSubmit}
          style={{
            flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            background: canSubmit ? '#0D9488' : '#d1d5db', color: '#fff',
            fontWeight: 600, fontSize: '0.95rem', cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>
          {mutation.isPending ? '...' : t('onboarding.continue')} →
        </button>
      </div>
    </div>
  )
}

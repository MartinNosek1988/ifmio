import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Package, Users, Landmark, ClipboardList } from 'lucide-react'
import { wizardApi } from './wizard.api'

const ACTIONS = [
  { value: 'import_units', icon: Package, labelKey: 'importUnits', descKey: 'importUnitsDesc' },
  { value: 'add_owners', icon: Users, labelKey: 'addOwners', descKey: 'addOwnersDesc' },
  { value: 'connect_bank', icon: Landmark, labelKey: 'connectBank', descKey: 'connectBankDesc' },
  { value: 'setup_prescriptions', icon: ClipboardList, labelKey: 'setupPrescriptions', descKey: 'setupPrescriptionsDesc' },
] as const

export function Step4Actions({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (value: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: () => wizardApi.step4({ actions: [...selected] }),
    onSuccess: (data) => {
      navigate(data?.redirectTo || '/onboarding', { replace: true })
    },
  })

  const handleSkip = () => {
    mutation.mutate()
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text, #1a1a2e)' }}>
        {t('onboarding.step4.title')}
      </h2>
      <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.9rem', margin: '0 0 24px' }}>
        {t('onboarding.step4.subtitle')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ACTIONS.map(({ value, icon: Icon, labelKey, descKey }) => {
          const isSelected = selected.has(value)
          return (
            <button
              key={value}
              data-testid={`action-${value}`}
              onClick={() => toggle(value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                border: `2px solid ${isSelected ? '#0D9488' : 'var(--border, #e5e7eb)'}`,
                background: isSelected ? 'rgba(13, 148, 136, 0.06)' : 'var(--surface, #fff)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? 'rgba(13, 148, 136, 0.12)' : 'var(--bg-secondary, #f3f4f6)',
                color: isSelected ? '#0D9488' : 'var(--text-muted, #6b7280)',
              }}>
                <Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text, #1a1a2e)' }}>
                  {t(`onboarding.step4.${labelKey}`)}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #6b7280)', marginTop: 1 }}>
                  {t(`onboarding.step4.${descKey}`)}
                </div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? '#0D9488' : '#d1d5db'}`,
                background: isSelected ? '#0D9488' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {isSelected && <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
            </button>
          )
        })}
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
        <button data-testid="onboarding-start" onClick={() => mutation.mutate()} disabled={mutation.isPending}
          style={{
            flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            background: '#0D9488', color: '#fff',
            fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
          }}>
          {mutation.isPending ? '...' : t('onboarding.step4.start')} →
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button data-testid="onboarding-skip" onClick={handleSkip} disabled={mutation.isPending}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted, #6b7280)', fontSize: '0.8rem',
            textDecoration: 'underline',
          }}>
          {t('onboarding.step4.skip')}
        </button>
      </div>
    </div>
  )
}

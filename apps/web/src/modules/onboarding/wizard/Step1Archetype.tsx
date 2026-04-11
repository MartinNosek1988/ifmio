import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Building2, Briefcase, Home } from 'lucide-react'
import { wizardApi } from './wizard.api'

const ARCHETYPES = [
  { value: 'SELF_MANAGED_HOA', icon: Building2, labelKey: 'selfManaged', descKey: 'selfManagedDesc' },
  { value: 'MANAGEMENT_COMPANY', icon: Briefcase, labelKey: 'managementCompany', descKey: 'managementCompanyDesc' },
  { value: 'RENTAL_OWNER', icon: Home, labelKey: 'rentalOwner', descKey: 'rentalOwnerDesc' },
] as const

export function Step1Archetype({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (archetype: string) => wizardApi.step1({ archetype }),
    onSuccess: () => onComplete(),
  })

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text, #1a1a2e)' }}>
        {t('onboarding.step1.title')}
      </h2>
      <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.9rem', margin: '0 0 24px' }}>
        {t('onboarding.step1.subtitle')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ARCHETYPES.map(({ value, icon: Icon, labelKey, descKey }) => {
          const isSelected = selected === value
          return (
            <button
              key={value}
              data-testid={`archetype-${value}`}
              aria-selected={isSelected}
              data-selected={isSelected || undefined}
              onClick={() => setSelected(value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                border: `2px solid ${isSelected ? '#0D9488' : 'var(--border, #e5e7eb)'}`,
                background: isSelected ? 'rgba(13, 148, 136, 0.06)' : 'var(--surface, #fff)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? 'rgba(13, 148, 136, 0.12)' : 'var(--bg-secondary, #f3f4f6)',
                color: isSelected ? '#0D9488' : 'var(--text-muted, #6b7280)',
              }}>
                <Icon size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text, #1a1a2e)' }}>
                  {t(`onboarding.step1.${labelKey}`)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>
                  {t(`onboarding.step1.${descKey}`)}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        data-testid="onboarding-next"
        disabled={!selected || mutation.isPending}
        onClick={() => selected && mutation.mutate(selected)}
        style={{
          width: '100%', marginTop: 24, padding: '12px', borderRadius: 10, border: 'none',
          background: selected ? '#0D9488' : '#d1d5db', color: '#fff',
          fontWeight: 600, fontSize: '0.95rem', cursor: selected ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s',
        }}
      >
        {mutation.isPending ? '...' : t('onboarding.continue')} →
      </button>
    </div>
  )
}

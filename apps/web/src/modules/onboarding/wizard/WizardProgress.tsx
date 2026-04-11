import { useTranslation } from 'react-i18next'
import { Building2, ClipboardList, Home, Rocket, Check } from 'lucide-react'

const STEP_ICONS = [Building2, ClipboardList, Home, Rocket]
const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const

export function WizardProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const { t } = useTranslation()

  return (
    <div data-testid="onboarding-progress" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, width: '100%', maxWidth: 520 }}>
      {STEP_KEYS.map((key, i) => {
        const stepNum = i + 1
        const Icon = STEP_ICONS[i]
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep
        const isFuture = stepNum > currentStep

        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', flex: i < totalSteps - 1 ? 1 : undefined }}>
            {/* Step circle */}
            <div
              data-testid={`onboarding-progress-step-${stepNum}`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#0D9488' : isActive ? '#0D9488' : 'var(--border, #e5e7eb)',
                color: isDone || isActive ? '#fff' : 'var(--text-muted, #9ca3af)',
                transition: 'all 0.3s',
              }}>
                {isDone ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
              </div>
              <span style={{
                fontSize: '0.68rem', fontWeight: isActive ? 700 : 500, textAlign: 'center',
                color: isActive ? '#0D9488' : isFuture ? 'var(--text-muted, #9ca3af)' : 'var(--text, #374151)',
                lineHeight: 1.2,
              }}>
                {t(`onboarding.progress.${key}`)}
              </span>
            </div>

            {/* Connector line */}
            {i < totalSteps - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 4px', marginBottom: 22,
                background: stepNum < currentStep ? '#0D9488' : 'var(--border, #e5e7eb)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

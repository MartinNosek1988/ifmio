import { useTranslation } from 'react-i18next'
import { Building2, ClipboardList, Home, Rocket, Check } from 'lucide-react'

const STEPS = [
  { key: 'step1', icon: Building2 },
  { key: 'step2', icon: ClipboardList },
  { key: 'step3', icon: Home },
  { key: 'step4', icon: Rocket },
] as const

export function WizardProgress({ currentStep }: { currentStep: number }) {
  const { t } = useTranslation()

  return (
    <div data-testid="onboarding-progress" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, width: '100%', maxWidth: 520 }}>
      {STEPS.map(({ key, icon: Icon }, i) => {
        const stepNum = i + 1
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep
        const isFuture = stepNum > currentStep

        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div
              data-testid={`onboarding-progress-step-${stepNum}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64 }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone || isActive ? '#0D9488' : 'var(--border, #e5e7eb)',
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

            {i < STEPS.length - 1 && (
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

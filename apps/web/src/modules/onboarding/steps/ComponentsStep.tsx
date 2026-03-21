import { useNavigate } from 'react-router-dom'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

export function ComponentsStep({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate()
  const d = step.detail

  return (
    <>
      <InfoText>
        Složky předpisu definují co a kolik se platí. Typické: fond oprav, správa, vodné, teplo.
      </InfoText>

      {step.completed && d?.componentCount != null && (
        <DetailLine>{d.componentCount} složek nastaveno</DetailLine>
      )}

      {!step.completed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            onClick={() => navigate('/finance?tab=components')}
            data-testid="onboarding-step-components-action"
          >
            Nastavit složky
          </ActionButton>
          <ActionButton variant="secondary" disabled title="Připravujeme">
            Použít šablonu SVJ
          </ActionButton>
        </div>
      )}
    </>
  )
}

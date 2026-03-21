import { useNavigate } from 'react-router-dom'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

export function UnitsStep({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate()
  const d = step.detail

  return (
    <>
      <InfoText>
        Pokud jste importovali z ČÚZK, jednotky a vlastníci byli vytvořeni automaticky.
      </InfoText>

      {step.completed && d && (
        <DetailLine>
          {d.unitCount} jednotek, {d.ownerCount} vlastníků přiřazeno
        </DetailLine>
      )}

      {!step.completed && step.link && (
        <ActionButton
          onClick={() => navigate(step.link!)}
          data-testid="onboarding-step-units-action"
        >
          Zobrazit jednotky
        </ActionButton>
      )}
    </>
  )
}

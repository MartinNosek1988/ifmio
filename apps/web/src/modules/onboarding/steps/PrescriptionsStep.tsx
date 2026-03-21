import { useNavigate } from 'react-router-dom'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

export function PrescriptionsStep({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate()
  const d = step.detail

  return (
    <>
      <InfoText>
        Předpisy se generují ze složek předpisu. Zkontrolujte náhled a potvrďte.
      </InfoText>

      {step.completed && d?.prescriptionCount != null && (
        <DetailLine>{d.prescriptionCount} předpisů vygenerováno</DetailLine>
      )}

      {!step.completed && (
        <ActionButton
          onClick={() => navigate('/finance?tab=prescriptions')}
          data-testid="onboarding-step-prescriptions-action"
        >
          Generovat předpisy
        </ActionButton>
      )}
    </>
  )
}

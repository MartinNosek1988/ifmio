import { useNavigate } from 'react-router-dom'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

interface Props {
  step: OnboardingStep
  onSkipWithZero: () => void
}

export function OpeningBalancesStep({ step, onSkipWithZero }: Props) {
  const navigate = useNavigate()
  const d = step.detail

  return (
    <>
      <InfoText>
        Zadejte zůstatky kont vlastníků k datu přechodu. Kdo kolik dluží nebo má přeplatek.
      </InfoText>

      {d && d.totalAccounts != null && (
        <DetailLine>
          {d.setCount} z {d.totalAccounts} kont nastaveno
        </DetailLine>
      )}

      {!step.completed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            onClick={() => navigate('/finance?tab=konto')}
            data-testid="onboarding-step-balances-action"
          >
            Zadat počáteční stavy
          </ActionButton>
          <ActionButton variant="secondary" onClick={onSkipWithZero}>
            Všechny zůstatky jsou nulové
          </ActionButton>
        </div>
      )}
    </>
  )
}

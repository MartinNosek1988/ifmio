import { useNavigate } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

export function BankAccountStep({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate()
  const d = step.detail

  return (
    <>
      <InfoText>
        Pro automatický import plateb doporučujeme připojit Fio API.
      </InfoText>

      {step.completed && d?.accountNumber && (
        <DetailLine>{d.accountNumber}</DetailLine>
      )}

      {!step.completed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            icon={<Landmark size={14} />}
            onClick={() => navigate('/finance?tab=bank')}
            data-testid="onboarding-step-bank-action"
          >
            Přidat bankovní účet
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => navigate('/finance?tab=bank')}
          >
            Připojit Fio API
          </ActionButton>
        </div>
      )}
    </>
  )
}

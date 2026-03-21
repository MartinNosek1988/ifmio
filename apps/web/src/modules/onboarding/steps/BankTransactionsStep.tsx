import { useNavigate } from 'react-router-dom'
import { Upload, RefreshCw, ArrowLeftRight } from 'lucide-react'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

export function BankTransactionsStep({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate()
  const d = step.detail

  return (
    <>
      <InfoText>
        Importujte bankovní výpisy za poslední 3–6 měsíců a spárujte je s předpisy.
      </InfoText>

      {step.completed && d?.transactionCount != null && (
        <DetailLine>{d.transactionCount} transakcí importováno</DetailLine>
      )}

      {!step.completed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            icon={<Upload size={14} />}
            onClick={() => navigate('/finance?tab=bank')}
            data-testid="onboarding-step-import-action"
          >
            Importovat výpis
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={<RefreshCw size={14} />}
            onClick={() => navigate('/finance?tab=bank')}
          >
            Stáhnout z Fio API
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={<ArrowLeftRight size={14} />}
            onClick={() => navigate('/finance?tab=parovani')}
          >
            Spárovat platby
          </ActionButton>
        </div>
      )}
    </>
  )
}

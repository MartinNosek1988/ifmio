import { useNavigate } from 'react-router-dom'
import { Building2, Download } from 'lucide-react'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

export function PropertyStep({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate()

  return (
    <>
      <InfoText>
        Přidejte bytový dům, budovu nebo objekt, který spravujete. Můžete importovat data z katastru nemovitostí nebo založit nemovitost ručně.
      </InfoText>

      {step.completed && step.detail?.propertyName && (
        <DetailLine>
          {step.detail.propertyName}
          {step.detail.unitCount ? ` — ${step.detail.unitCount} jednotek` : ''}
        </DetailLine>
      )}

      {!step.completed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            icon={<Download size={14} />}
            onClick={() => navigate('/properties')}
            data-testid="onboarding-step-property-action"
          >
            Importovat z ČÚZK
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={<Building2 size={14} />}
            onClick={() => navigate('/properties')}
          >
            Založit ručně
          </ActionButton>
        </div>
      )}
    </>
  )
}

import { useNavigate } from 'react-router-dom'
import { Upload, Users } from 'lucide-react'
import type { OnboardingStep } from '../onboarding.api'
import { ActionButton, InfoText, DetailLine } from './shared'

export function ContactsStep({ step }: { step: OnboardingStep }) {
  const navigate = useNavigate()
  const d = step.detail

  return (
    <>
      <InfoText>
        Doplňte emailové adresy a telefony vlastníků pro komunikaci a portál.
      </InfoText>

      {d && d.total != null && (
        <DetailLine>
          {d.withEmail} z {d.total} osob má email
        </DetailLine>
      )}

      {!step.completed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionButton
            icon={<Upload size={14} />}
            onClick={() => navigate('/residents')}
            data-testid="onboarding-step-contacts-action"
          >
            Importovat z XLSX
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={<Users size={14} />}
            onClick={() => navigate('/parties')}
          >
            Otevřít adresář osob
          </ActionButton>
        </div>
      )}
    </>
  )
}

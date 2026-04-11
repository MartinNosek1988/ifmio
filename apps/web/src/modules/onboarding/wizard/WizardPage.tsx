import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '../../../shared/components'
import { WizardProgress } from './WizardProgress'
import { Step1Archetype } from './Step1Archetype'
import { Step2Principal } from './Step2Principal'
import { Step3Property } from './Step3Property'
import { Step4Actions } from './Step4Actions'
import { wizardApi } from './wizard.api'

const TOTAL_STEPS = 4

export default function WizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [archetype, setArchetype] = useState('')

  const { data: status, isLoading } = useQuery({
    queryKey: ['onboarding', 'wizard-status'],
    queryFn: () => wizardApi.getStatus(),
    staleTime: 30_000,
  })

  // Resume from last completed step
  useEffect(() => {
    if (!status) return
    if (status.onboardingCompleted) {
      navigate('/onboarding', { replace: true })
      return
    }
    if (status.onboardingStep > 0) {
      setStep(Math.min(status.onboardingStep + 1, TOTAL_STEPS))
    }
    if (status.archetype) {
      setArchetype(status.archetype)
    }
  }, [status, navigate])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
        <LoadingSpinner />
      </div>
    )
  }

  const handleStep1Complete = () => {
    setStep(2)
  }

  const handleStep2Complete = () => {
    setStep(3)
  }

  const handleStep3Complete = () => {
    setStep(4)
  }

  return (
    <div data-testid="onboarding-page" style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 16px 64px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, fontSize: '1.6rem', fontWeight: 800, color: '#0D9488', letterSpacing: -0.5 }}>
        ifmio
      </div>

      {/* Progress */}
      <WizardProgress currentStep={step} totalSteps={TOTAL_STEPS} />

      {/* Step content */}
      <div style={{
        width: '100%', maxWidth: 512, marginTop: 32,
        background: 'var(--surface, #fff)', borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '32px 28px',
      }}>
        {step === 1 && (
          <Step1Archetype onComplete={handleStep1Complete} />
        )}
        {step === 2 && (
          <Step2Principal
            archetype={archetype || status?.archetype || ''}
            onComplete={handleStep2Complete}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3Property
            archetype={archetype || status?.archetype || ''}
            onComplete={handleStep3Complete}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Actions onBack={() => setStep(3)} />
        )}
      </div>
    </div>
  )
}

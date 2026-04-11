import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { LoadingSpinner } from '../../../shared/components'
import { WizardProgress } from './WizardProgress'
import { Step1Archetype } from './Step1Archetype'
import { Step2Principal } from './Step2Principal'
import { Step3Property } from './Step3Property'
import { Step4Actions } from './Step4Actions'
import { wizardApi } from './wizard.api'

export default function WizardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [archetype, setArchetype] = useState('')

  const { data: status, isLoading, isError, refetch } = useQuery({
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
      setStep(Math.min(status.onboardingStep + 1, 4))
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

  if (isError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb', gap: 16 }}>
        <AlertTriangle size={32} color="#ef4444" />
        <p style={{ color: '#374151', fontSize: '0.95rem' }}>Nepodařilo se načíst stav onboardingu.</p>
        <button onClick={() => refetch()} style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: '#0D9488', color: '#fff', fontWeight: 600, cursor: 'pointer',
        }}>
          Zkusit znovu
        </button>
      </div>
    )
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
      <WizardProgress currentStep={step} />

      {/* Step content */}
      <div style={{
        width: '100%', maxWidth: 512, marginTop: 32,
        background: 'var(--surface, #fff)', borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '32px 28px',
      }}>
        {step === 1 && (
          <Step1Archetype onComplete={(selected) => { setArchetype(selected); setStep(2) }} />
        )}
        {step === 2 && (
          <Step2Principal
            archetype={archetype}
            onComplete={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3Property
            archetype={archetype}
            onComplete={() => setStep(4)}
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

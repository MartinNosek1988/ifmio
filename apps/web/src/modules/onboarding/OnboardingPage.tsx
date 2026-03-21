import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { LoadingSpinner } from '../../shared/components'
import { useToast } from '../../shared/components/toast/Toast'
import { useOnboardingStatus, useSkipOnboardingStep, useDismissOnboarding } from './onboarding.queries'
import { OnboardingStep } from './OnboardingStep'
import {
  PropertyStep, UnitsStep, ContactsStep, ComponentsStep,
  BankAccountStep, OpeningBalancesStep, PrescriptionsStep, BankTransactionsStep,
} from './steps'
import type { OnboardingStep as StepData } from './onboarding.api'

const STEP_LABELS: Record<string, string> = {
  property: 'Založení nemovitosti',
  units: 'Jednotky a vlastníci',
  contacts: 'Kontaktní údaje osob',
  components: 'Složky předpisu',
  bank: 'Bankovní účet',
  balances: 'Počáteční stavy kont',
  prescriptions: 'Vygenerovat předpisy',
  import: 'Import bankovních výpisů',
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { success } = useToast()
  const { data, isLoading } = useOnboardingStatus()
  const skipMutation = useSkipOnboardingStep()
  const dismissMutation = useDismissOnboarding()

  // If already completed or dismissed, redirect to dashboard
  useEffect(() => {
    if (data?.completed || data?.dismissed) {
      navigate('/dashboard', { replace: true })
    }
  }, [data, navigate])

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><LoadingSpinner /></div>
  }
  if (!data) return null

  const { steps, progress, percentComplete } = data
  const pct = percentComplete

  const isBlocked = (step: StepData) => {
    if (!step.dependsOn) return false
    const dep = steps.find(s => s.id === step.dependsOn)
    return dep ? !dep.completed && !dep.skipped : false
  }

  const getBlockedByLabel = (step: StepData) => {
    if (!step.dependsOn) return undefined
    return STEP_LABELS[step.dependsOn] ?? step.dependsOn
  }

  const isDone = (s: StepData) => s.completed || s.skipped

  const getSubtitle = (step: StepData): string | undefined => {
    if (!step.completed || !step.detail) return undefined
    const d = step.detail
    switch (step.id) {
      case 'property': return d.propertyName ?? undefined
      case 'units': return `${d.unitCount ?? 0} jednotek, ${d.ownerCount ?? 0} vlastníků`
      case 'contacts': return `${d.withEmail ?? 0} z ${d.total ?? 0} osob má email`
      case 'components': return `${d.componentCount ?? 0} složek`
      case 'bank': return d.accountNumber ?? undefined
      case 'balances': return `${d.setCount ?? 0} z ${d.totalAccounts ?? 0} kont`
      case 'prescriptions': return `${d.prescriptionCount ?? 0} předpisů`
      case 'import': return `${d.transactionCount ?? 0} transakcí`
      default: return undefined
    }
  }

  const handleDismiss = () => {
    dismissMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/dashboard')
      },
    })
  }

  const handleComplete = () => {
    dismissMutation.mutate(undefined, {
      onSuccess: () => {
        success('Nemovitost je připravena!')
        navigate('/dashboard')
      },
    })
  }

  const handleSkip = (stepId: string) => {
    skipMutation.mutate(stepId)
  }

  const renderStepContent = (step: StepData) => {
    switch (step.id) {
      case 'property': return <PropertyStep step={step} />
      case 'units': return <UnitsStep step={step} />
      case 'contacts': return <ContactsStep step={step} />
      case 'components': return <ComponentsStep step={step} />
      case 'bank': return <BankAccountStep step={step} />
      case 'balances': return <OpeningBalancesStep step={step} onSkipWithZero={() => handleSkip('balances')} />
      case 'prescriptions': return <PrescriptionsStep step={step} />
      case 'import': return <BankTransactionsStep step={step} />
      default: return null
    }
  }

  const allDoneOrSkipped = steps.every(isDone)

  return (
    <div data-testid="onboarding-page" style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              Nastavení nemovitosti
            </h1>
            <p style={{ color: 'var(--text-muted, #6b7280)', margin: '6px 0 0', fontSize: 14 }}>
              Projdeme spolu klíčové kroky pro správu nemovitostí. Volitelné kroky můžete přeskočit.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted, #9ca3af)', padding: 4,
            }}
            title="Přeskočit průvodce"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 16 }} data-testid="onboarding-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111)' }}>
              {progress.done}/{progress.total} kroků
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#22c55e' : '#6366f1' }}>
              {pct} %
            </span>
          </div>
          <div style={{
            height: 8, borderRadius: 4,
            background: 'var(--border, #e5e7eb)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: pct === 100 ? '#22c55e' : '#6366f1',
              width: `${pct}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((step, i) => {
          const blocked = isBlocked(step)

          return (
            <OnboardingStep
              key={step.id}
              stepNumber={i + 1}
              stepKey={step.id}
              title={step.label}
              subtitle={getSubtitle(step)}
              done={step.completed}
              skipped={step.skipped}
              blocked={blocked}
              blockedBy={getBlockedByLabel(step)}
              optional={step.optional}
              onSkip={step.optional ? () => handleSkip(step.id) : undefined}
            >
              {renderStepContent(step)}
            </OnboardingStep>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 32, padding: '20px 24px',
        background: 'var(--surface-2, #f9fafb)',
        borderRadius: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>
          Průvodce můžete kdykoli otevřít z nápovědy nebo přeskočit a dokončit kroky později.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDismiss}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--border, #e5e7eb)',
              background: 'var(--surface, #fff)',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
              color: 'var(--text, #374151)',
            }}
          >
            Přeskočit průvodce
          </button>
          {allDoneOrSkipped && (
            <button
              onClick={handleComplete}
              data-testid="onboarding-complete-btn"
              style={{
                padding: '8px 20px', borderRadius: 8,
                border: 'none', background: '#22c55e',
                cursor: 'pointer', fontWeight: 700, fontSize: 13,
                color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              Dokončit nastavení <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

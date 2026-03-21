import { apiClient } from '../../core/api/client'

export interface OnboardingStepDetail {
  propertyName?: string
  propertyId?: string
  unitCount?: number
  ownerCount?: number
  withEmail?: number
  total?: number
  componentCount?: number
  accountNumber?: string | null
  setCount?: number
  totalAccounts?: number
  prescriptionCount?: number
  transactionCount?: number
}

export interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  skipped: boolean
  link: string | null
  count: number
  optional?: boolean
  dependsOn?: string
  detail: OnboardingStepDetail | null
}

export interface OnboardingData {
  completed: boolean
  dismissed: boolean
  progress: { done: number; total: number }
  percentComplete: number
  steps: OnboardingStep[]
}

export const onboardingApi = {
  getStatus: () =>
    apiClient.get<OnboardingData>('/admin/onboarding').then(r => r.data),

  skipStep: (stepId: string) =>
    apiClient.post<{ ok: boolean; skippedSteps: string[] }>(`/admin/onboarding/skip/${stepId}`).then(r => r.data),

  dismiss: () =>
    apiClient.post<{ ok: boolean }>('/admin/onboarding/dismiss').then(r => r.data),
}

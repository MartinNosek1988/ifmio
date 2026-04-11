import { apiClient } from '../../../core/api/client'

export interface WizardStatus {
  archetype: string | null
  onboardingCompleted: boolean
  onboardingStep: number
}

export interface AresResult {
  name?: string
  legalForm?: string
  ico: string
  found: boolean
}

interface AresResponse {
  ico?: string
  obchodniJmeno?: string
  nazev?: string
  pravniForma?: string
}

export const wizardApi = {
  getStatus: () =>
    apiClient.get<WizardStatus>('/onboarding/status').then(r => r.data),

  step1: (data: { archetype: string }) =>
    apiClient.post('/onboarding/step/1', data).then(r => r.data),

  step2: (data: { name: string; ico?: string; dic?: string; legalForm?: string }) =>
    apiClient.post('/onboarding/step/2', data).then(r => r.data),

  step3: (data: { name: string; address: string; city: string; postalCode: string; type: string; ico?: string }) =>
    apiClient.post('/onboarding/step/3', data).then(r => r.data),

  step4: (data: { actions: string[] }) =>
    apiClient.post<{ redirectTo: string }>('/onboarding/step/4', data).then(r => r.data),

  aresLookup: (ico: string): Promise<AresResult> =>
    apiClient.get<AresResponse>('/integrations/ares/ico', { params: { ico } }).then(r => {
      const data = r.data
      return {
        ico,
        found: !!data?.ico,
        name: data?.obchodniJmeno || data?.nazev,
        legalForm: data?.pravniForma,
      }
    }),
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onboardingApi } from './onboarding.api'

const ONBOARDING_KEY = ['admin', 'onboarding'] as const

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ONBOARDING_KEY,
    queryFn: onboardingApi.getStatus,
    staleTime: 30_000,
  })
}

export function useSkipOnboardingStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stepId: string) => onboardingApi.skipStep(stepId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ONBOARDING_KEY })
    },
  })
}

export function useDismissOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: onboardingApi.dismiss,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ONBOARDING_KEY })
    },
  })
}

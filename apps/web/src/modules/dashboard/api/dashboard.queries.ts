import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './dashboard.api'

export function useDashboardOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn:  () => dashboardApi.overview(),
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  })
}

export function useOperationalDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['dashboard', 'operational'],
    queryFn: () => dashboardApi.operational(),
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  })
}

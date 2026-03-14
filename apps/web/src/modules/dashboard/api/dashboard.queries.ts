import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './dashboard.api'

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn:  () => dashboardApi.overview(),
    refetchInterval: 60_000,
  })
}

export function useOperationalDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'operational'],
    queryFn: () => dashboardApi.operational(),
    refetchInterval: 60_000,
  })
}

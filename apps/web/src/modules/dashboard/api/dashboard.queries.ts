import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './dashboard.api'

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn:  () => dashboardApi.overview(),
    refetchInterval: 60_000,
  })
}

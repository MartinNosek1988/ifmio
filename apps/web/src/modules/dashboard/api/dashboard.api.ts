import { apiClient } from '../../../core/api/client'

export const dashboardApi = {
  overview: () =>
    apiClient.get('/dashboard').then((r) => r.data),
}

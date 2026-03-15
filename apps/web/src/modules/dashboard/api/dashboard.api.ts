import { apiClient } from '../../../core/api/client'

export interface OperationalDashboard {
  role: string
  attention: {
    overdueTickets: number
    overdueWo: number
    highPrioTickets: number
    todayWoDeadlines: number
    overdueRevisions: number
    incompleteProtocols: number
    openRecurring: number
    overdueRecurring: number
  }
  workload: {
    openTickets: number
    openWo: number
  }
  period: {
    resolvedTicketsLast30: number
    completedWoLast30: number
  }
  recentTickets: {
    id: string; number: number; title: string; priority: string; status: string;
    createdAt: string; propertyName: string | null; assigneeName: string | null;
  }[]
  recentWorkOrders: {
    id: string; title: string; priority: string; status: string;
    deadline: string | null; createdAt: string;
    propertyName: string | null; assigneeName: string | null; assetName: string | null;
  }[]
}

export const dashboardApi = {
  overview: () =>
    apiClient.get('/dashboard').then((r) => r.data),

  operational: () =>
    apiClient.get<OperationalDashboard>('/dashboard/operational').then((r) => r.data),
}

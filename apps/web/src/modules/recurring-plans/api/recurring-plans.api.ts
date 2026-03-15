import { apiClient } from '../../../core/api/client'

export interface RecurringPlan {
  id: string
  tenantId: string
  propertyId: string | null
  assetId: string | null
  title: string
  description: string | null
  category: string
  scheduleMode: string // 'calendar' | 'from_completion'
  frequencyUnit: string // 'day' | 'week' | 'month' | 'year'
  frequencyInterval: number
  dayOfWeek: number | null
  dayOfMonth: number | null
  monthOfYear: number | null
  leadDays: number
  priority: string
  assigneeUserId: string | null
  isActive: boolean
  lastCompletedAt: string | null
  nextPlannedAt: string | null
  lastGeneratedAt: string | null
  createdAt: string
  updatedAt: string
  property?: { id: string; name: string } | null
  asset?: { id: string; name: string } | null
  assignee?: { id: string; name: string } | null
  _count?: { generatedTickets: number }
}

export interface CreateRecurringPlanDto {
  title: string
  description?: string
  category?: string
  propertyId?: string
  assetId?: string
  scheduleMode?: string
  frequencyUnit?: string
  frequencyInterval?: number
  dayOfWeek?: number
  dayOfMonth?: number
  monthOfYear?: number
  leadDays?: number
  priority?: string
  assigneeUserId?: string
  nextPlannedAt?: string
}

export function formatRecurrence(plan: RecurringPlan): string {
  const interval = plan.frequencyInterval
  const unit = plan.frequencyUnit

  let base = ''
  if (unit === 'day') base = interval === 1 ? 'Každý den' : `Každé ${interval} dny`
  else if (unit === 'week') base = interval === 1 ? 'Každý týden' : `Každé ${interval} týdny`
  else if (unit === 'month') base = interval === 1 ? 'Každý měsíc' : `Každých ${interval} měsíců`
  else if (unit === 'year') base = interval === 1 ? 'Každý rok' : `Každé ${interval} roky`

  if (unit === 'month' && plan.dayOfMonth) base += `, den ${plan.dayOfMonth}`
  if (unit === 'year' && plan.monthOfYear) {
    base += `, ${plan.dayOfMonth ?? 1}. ${plan.monthOfYear}.`
  }

  if (plan.scheduleMode === 'from_completion') base += ' (od provedení)'

  return base
}

export const recurringPlansApi = {
  list: async (params?: { assetId?: string; isActive?: string }) => {
    const { data } = await apiClient.get<RecurringPlan[]>('/recurring-plans', { params })
    return data
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<RecurringPlan>(`/recurring-plans/${id}`)
    return data
  },

  create: async (dto: CreateRecurringPlanDto) => {
    const { data } = await apiClient.post<RecurringPlan>('/recurring-plans', dto)
    return data
  },

  update: async (id: string, dto: Partial<CreateRecurringPlanDto> & { isActive?: boolean }) => {
    const { data } = await apiClient.put<RecurringPlan>(`/recurring-plans/${id}`, dto)
    return data
  },

  remove: async (id: string) => {
    await apiClient.delete(`/recurring-plans/${id}`)
  },
}

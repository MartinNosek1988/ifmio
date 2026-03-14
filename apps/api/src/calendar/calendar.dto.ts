export interface CalendarEventDto {
  id: string
  source: 'custom' | 'workorder' | 'contract' | 'meter' | 'helpdesk'
  sourceId?: string
  title: string
  eventType: string
  date: string
  dateTo?: string | null
  timeFrom?: string | null
  timeTo?: string | null
  propertyId?: string | null
  propertyName?: string | null
  location?: string | null
  description?: string | null
  attendees?: string[]
}

export interface CalendarStatsDto {
  total: number
  thisMonth: number
  upcoming: number
  workorders: number
  contracts: number
  meters: number
  helpdesk: number
}

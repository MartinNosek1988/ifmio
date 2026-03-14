import { apiClient } from '../../../core/api/client';

export type EventSource = 'custom' | 'workorder' | 'contract' | 'meter' | 'helpdesk';

export interface ApiCalendarEvent {
  id: string;
  source: EventSource;
  sourceId?: string;
  title: string;
  eventType: string;
  date: string;
  dateTo?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  location?: string | null;
  description?: string | null;
  attendees?: string[];
}

export interface CalendarStats {
  total: number;
  thisMonth: number;
  upcoming: number;
  workorders: number;
  contracts: number;
  meters: number;
  helpdesk: number;
}

export interface CreateCalendarEventDto {
  title: string;
  eventType?: string;
  date: string;
  dateTo?: string;
  timeFrom?: string;
  timeTo?: string;
  propertyId?: string;
  location?: string;
  description?: string;
  attendees?: string[];
}

export const calendarApi = {
  events: async (params?: { from?: string; to?: string; eventType?: string; search?: string }) => {
    const { data } = await apiClient.get<ApiCalendarEvent[]>('/calendar/events', { params });
    return data;
  },

  stats: async () => {
    const { data } = await apiClient.get<CalendarStats>('/calendar/stats');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiCalendarEvent>(`/calendar/events/${id}`);
    return data;
  },

  create: async (dto: CreateCalendarEventDto) => {
    const { data } = await apiClient.post<ApiCalendarEvent>('/calendar/events', dto);
    return data;
  },

  update: async (id: string, dto: Partial<CreateCalendarEventDto>) => {
    const { data } = await apiClient.put<ApiCalendarEvent>(`/calendar/events/${id}`, dto);
    return data;
  },

  remove: async (id: string) => {
    await apiClient.delete(`/calendar/events/${id}`);
  },
};

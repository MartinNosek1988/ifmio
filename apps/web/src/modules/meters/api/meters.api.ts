import { apiClient } from '../../../core/api/client';

export type MeterType = 'elektrina' | 'voda_studena' | 'voda_tepla' | 'plyn' | 'teplo';

export interface ApiMeterReading {
  id: string;
  meterId: string;
  readingDate: string;
  value: number;
  consumption: number | null;
  source: string;
  readBy: string | null;
  note: string | null;
  createdAt: string;
}

export interface ApiMeter {
  id: string;
  tenantId: string;
  propertyId: string | null;
  unitId: string | null;
  name: string;
  serialNumber: string;
  meterType: MeterType;
  unit: string;
  installDate: string | null;
  calibrationDate: string | null;
  calibrationDue: string | null;
  manufacturer: string | null;
  location: string | null;
  isActive: boolean;
  lastReading: number | null;
  lastReadingDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string; address?: string } | null;
  unitRel?: { id: string; name: string; area?: number; floor?: number } | null;
  readings: ApiMeterReading[];
}

export interface MeterStats {
  total: number;
  elektrina: number;
  vodaStudena: number;
  vodaTepla: number;
  plyn: number;
  teplo: number;
  calibrationDue: number;
}

export interface CreateMeterDto {
  name: string;
  serialNumber: string;
  meterType?: string;
  unit?: string;
  propertyId?: string;
  unitId?: string;
  installDate?: string;
  calibrationDue?: string;
  manufacturer?: string;
  location?: string;
  note?: string;
}

export const metersApi = {
  list: async (params?: { meterType?: string; propertyId?: string; search?: string }) => {
    const { data } = await apiClient.get<ApiMeter[]>('/meters', { params });
    return data;
  },

  stats: async () => {
    const { data } = await apiClient.get<MeterStats>('/meters/stats');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiMeter>(`/meters/${id}`);
    return data;
  },

  create: async (dto: CreateMeterDto) => {
    const { data } = await apiClient.post<ApiMeter>('/meters', dto);
    return data;
  },

  update: async (id: string, dto: Partial<CreateMeterDto> & { isActive?: boolean }) => {
    const { data } = await apiClient.put<ApiMeter>(`/meters/${id}`, dto);
    return data;
  },

  remove: async (id: string) => {
    await apiClient.delete(`/meters/${id}`);
  },

  // Readings
  getReadings: async (meterId: string) => {
    const { data } = await apiClient.get<ApiMeterReading[]>(`/meters/${meterId}/readings`);
    return data;
  },

  addReading: async (meterId: string, dto: { readingDate: string; value: number; note?: string }) => {
    const { data } = await apiClient.post<ApiMeterReading>(`/meters/${meterId}/readings`, dto);
    return data;
  },

  deleteReading: async (meterId: string, readingId: string) => {
    await apiClient.delete(`/meters/${meterId}/readings/${readingId}`);
  },
};

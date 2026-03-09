import { apiClient } from '../../core/api/client';

/** API property shape (backend) */
export interface ApiProperty {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  type: string;
  ownership: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  units: ApiUnit[];
  _count?: { residents: number };
}

export interface ApiUnit {
  id: string;
  propertyId: string;
  name: string;
  floor: number | null;
  area: number | null;
  isOccupied: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyPayload {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  type: string;
  ownership: string;
}

export interface UpdatePropertyPayload extends Partial<CreatePropertyPayload> {}

export interface CreateUnitPayload {
  name: string;
  floor?: number;
  area?: number;
}

export interface UpdateUnitPayload {
  name?: string;
  floor?: number | null;
  area?: number | null;
  isOccupied?: boolean;
}

export const propertiesApi = {
  list: () =>
    apiClient.get<ApiProperty[]>('/properties').then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiProperty>(`/properties/${id}`).then((r) => r.data),

  create: (data: CreatePropertyPayload) =>
    apiClient.post<ApiProperty>('/properties', data).then((r) => r.data),

  update: (id: string, data: UpdatePropertyPayload) =>
    apiClient.patch<ApiProperty>(`/properties/${id}`, data).then((r) => r.data),

  archive: (id: string) =>
    apiClient.delete(`/properties/${id}`),

  // ── Units ──
  createUnit: (propertyId: string, data: CreateUnitPayload) =>
    apiClient.post<ApiUnit>(`/properties/${propertyId}/units`, data).then((r) => r.data),

  updateUnit: (propertyId: string, unitId: string, data: UpdateUnitPayload) =>
    apiClient.put<ApiUnit>(`/properties/${propertyId}/units/${unitId}`, data).then((r) => r.data),

  deleteUnit: (propertyId: string, unitId: string) =>
    apiClient.delete(`/properties/${propertyId}/units/${unitId}`),
};

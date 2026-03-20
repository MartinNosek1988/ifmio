import { apiClient } from '../../core/api/client';

export type PropertyLegalMode = 'SVJ' | 'BD' | 'RENTAL' | 'OWNERSHIP' | 'OTHER';
export type AccountingSystemType = 'POHODA' | 'MONEY_S3' | 'PREMIER' | 'VARIO' | 'NONE';

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
  ico?: string | null;
  dic?: string | null;
  isVatPayer?: boolean;
  legalMode?: PropertyLegalMode;
  managedFrom?: string | null;
  managedTo?: string | null;
  accountingSystem?: AccountingSystemType | null;
  cadastralArea?: string | null;
  landRegistrySheet?: string | null;
  country?: string;
  createdAt: string;
  updatedAt: string;
  units: ApiUnit[];
  _count?: { residents: number };
}

export type SpaceTypeValue = 'RESIDENTIAL' | 'NON_RESIDENTIAL' | 'GARAGE' | 'PARKING' | 'CELLAR' | 'LAND';

export interface ApiUnit {
  id: string;
  propertyId: string;
  name: string;
  floor: number | null;
  area: number | null;
  isOccupied: boolean;
  knDesignation?: string | null;
  ownDesignation?: string | null;
  spaceType?: SpaceTypeValue;
  commonAreaShare?: number | null;
  heatingArea?: number | null;
  tuvArea?: number | null;
  heatingCoefficient?: number | null;
  hotWaterCoefficient?: number | null;
  personCount?: number | null;
  disposition?: string | null;
  hasElevator?: boolean | null;
  heatingMethod?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  extAllocatorRef?: string | null;
  occupancies?: { resident: { firstName: string; lastName: string; companyName?: string | null; isLegalEntity?: boolean } }[];
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
  ico?: string | null;
  dic?: string | null;
  isVatPayer?: boolean;
  legalMode?: PropertyLegalMode;
  managedFrom?: string | null;
  managedTo?: string | null;
  accountingSystem?: AccountingSystemType | null;
  cadastralArea?: string | null;
  landRegistrySheet?: string | null;
}

export interface UpdatePropertyPayload extends Partial<CreatePropertyPayload> {}

export interface CreateUnitPayload {
  name: string;
  floor?: number;
  area?: number;
  knDesignation?: string | null;
  ownDesignation?: string | null;
  spaceType?: SpaceTypeValue;
  commonAreaShare?: number | null;
  heatingArea?: number | null;
  tuvArea?: number | null;
  heatingCoefficient?: number | null;
  hotWaterCoefficient?: number | null;
  personCount?: number | null;
  disposition?: string | null;
  hasElevator?: boolean | null;
  heatingMethod?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  extAllocatorRef?: string | null;
}

export interface UpdateUnitPayload extends Partial<CreateUnitPayload> {
  isOccupied?: boolean;
}

export interface ApiOccupancy {
  id: string;
  unitId: string;
  residentId: string;
  role: string;
  resident?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string | null;
    isLegalEntity?: boolean;
    email?: string | null;
  };
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  ownershipShare: number | null;
  personCount: number | null;
  isPrimaryPayer: boolean;
  variableSymbol: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateOccupancyPayload {
  residentId: string;
  role: 'owner' | 'tenant' | 'member';
  startDate: string;
  endDate?: string | null;
  ownershipShare?: number | null;
  personCount?: number | null;
  isPrimaryPayer?: boolean;
  variableSymbol?: string | null;
  note?: string | null;
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

  // ── Occupancies ──
  getUnit: (propertyId: string, unitId: string) =>
    apiClient.get<ApiUnit & { occupancies: ApiOccupancy[] }>(`/properties/${propertyId}/units/${unitId}`).then((r) => r.data),

  createOccupancy: (propertyId: string, unitId: string, data: CreateOccupancyPayload) =>
    apiClient.post<ApiOccupancy>(`/properties/${propertyId}/units/${unitId}/occupancies`, data).then((r) => r.data),

  endOccupancy: (propertyId: string, unitId: string, occupancyId: string) =>
    apiClient.patch<ApiOccupancy>(`/properties/${propertyId}/units/${unitId}/occupancies/${occupancyId}/end`).then((r) => r.data),
};

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
  cadastralData?: { parcelNumber?: string; buildingNumber?: string; cadastralTerritory?: string } | null;
  country?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  websiteNote?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
  units?: ApiUnit[];
  _count?: { units?: number; residents?: number; prescriptions?: number };
  activePrescriptions?: number;
  monthlyVolume?: number;
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
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  websiteNote?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

// ── Unit sub-resource types ──

export interface ApiRoom {
  id: string; name: string; area: number; coefficient: number; calculatedArea: number | null; roomType: string; includeTuv: boolean
}

export interface ApiQuantity {
  id: string; name: string; value: number; unitLabel: string
}

export interface ApiEquipment {
  id: string; name: string; status: string; note: string | null; quantity: number; serialNumber: string | null
  purchaseDate: string | null; purchasePrice: number | null; installPrice: number | null
  warranty: number | null; lifetime: number | null; rentDuring: number | null; rentAfter: string | null
  useInPrescription: boolean; validFrom: string | null; validTo: string | null; description: string | null
}

export interface ApiFee {
  id: string; amount: number; calculationType: string; validFrom: string; validTo: string | null
}

export interface ApiMeter {
  id: string; name: string; serialNumber: string; meterType: string; unit: string
  installDate: string | null; calibrationDate: string | null; calibrationDue: string | null
  isActive: boolean; lastReading: number | null; lastReadingDate: string | null; note: string | null
  readings?: { id: string; readingDate: string; value: number; consumption: number | null }[]
}

export interface ApiComponentAssignment {
  id: string; unitId: string; overrideAmount: number | null; effectiveFrom: string; effectiveTo: string | null; isActive: boolean; note: string | null
  component: { id: string; name: string; code: string | null; componentType: string; calculationMethod: string; defaultAmount: number; effectiveFrom: string; effectiveTo: string | null; isActive: boolean }
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

  getPropertyNav: (id: string) =>
    apiClient.get<{ total: number; current: number; prevId: string | null; nextId: string | null }>(`/properties/${id}/nav`).then(r => r.data),

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

  // ── Unit detail sub-resources ──
  getUnitNav: (propertyId: string, unitId: string) =>
    apiClient.get<{ total: number; current: number; prevId: string | null; nextId: string | null }>(`/properties/${propertyId}/units/${unitId}/nav`).then(r => r.data),

  // Rooms
  listRooms: (propertyId: string, unitId: string) =>
    apiClient.get<ApiRoom[]>(`/properties/${propertyId}/units/${unitId}/rooms`).then(r => r.data),
  createRoom: (propertyId: string, unitId: string, data: { name: string; area: number; coefficient?: number; roomType?: string; includeTuv?: boolean }) =>
    apiClient.post<ApiRoom>(`/properties/${propertyId}/units/${unitId}/rooms`, data).then(r => r.data),
  updateRoom: (propertyId: string, unitId: string, roomId: string, data: Record<string, unknown>) =>
    apiClient.put<ApiRoom>(`/properties/${propertyId}/units/${unitId}/rooms/${roomId}`, data).then(r => r.data),
  deleteRoom: (propertyId: string, unitId: string, roomId: string) =>
    apiClient.delete(`/properties/${propertyId}/units/${unitId}/rooms/${roomId}`),

  // Quantities
  listQuantities: (propertyId: string, unitId: string) =>
    apiClient.get<ApiQuantity[]>(`/properties/${propertyId}/units/${unitId}/quantities`).then(r => r.data),
  upsertQuantity: (propertyId: string, unitId: string, data: { name: string; value: number; unitLabel?: string }) =>
    apiClient.post<ApiQuantity>(`/properties/${propertyId}/units/${unitId}/quantities`, data).then(r => r.data),
  deleteQuantity: (propertyId: string, unitId: string, quantityId: string) =>
    apiClient.delete(`/properties/${propertyId}/units/${unitId}/quantities/${quantityId}`),

  // Equipment
  listEquipment: (propertyId: string, unitId: string) =>
    apiClient.get<ApiEquipment[]>(`/properties/${propertyId}/units/${unitId}/equipment`).then(r => r.data),
  createEquipment: (propertyId: string, unitId: string, data: Record<string, unknown>) =>
    apiClient.post<ApiEquipment>(`/properties/${propertyId}/units/${unitId}/equipment`, data).then(r => r.data),
  updateEquipment: (propertyId: string, unitId: string, eqId: string, data: Record<string, unknown>) =>
    apiClient.put<ApiEquipment>(`/properties/${propertyId}/units/${unitId}/equipment/${eqId}`, data).then(r => r.data),
  deleteEquipment: (propertyId: string, unitId: string, eqId: string) =>
    apiClient.delete(`/properties/${propertyId}/units/${unitId}/equipment/${eqId}`),

  // Management Fees
  listFees: (propertyId: string, unitId: string) =>
    apiClient.get<ApiFee[]>(`/properties/${propertyId}/units/${unitId}/management-fees`).then(r => r.data),
  createFee: (propertyId: string, unitId: string, data: { amount: number; calculationType?: string; validFrom: string; validTo?: string | null }) =>
    apiClient.post<ApiFee>(`/properties/${propertyId}/units/${unitId}/management-fees`, data).then(r => r.data),
  updateFee: (propertyId: string, unitId: string, feeId: string, data: Record<string, unknown>) =>
    apiClient.put<ApiFee>(`/properties/${propertyId}/units/${unitId}/management-fees/${feeId}`, data).then(r => r.data),
  deleteFee: (propertyId: string, unitId: string, feeId: string) =>
    apiClient.delete(`/properties/${propertyId}/units/${unitId}/management-fees/${feeId}`),

  // Meters (read-only)
  listUnitMeters: (propertyId: string, unitId: string) =>
    apiClient.get<ApiMeter[]>(`/properties/${propertyId}/units/${unitId}/meters`).then(r => r.data),

  // Prescription components (read-only)
  listUnitPrescriptionComponents: (propertyId: string, unitId: string) =>
    apiClient.get<ApiComponentAssignment[]>(`/properties/${propertyId}/units/${unitId}/prescription-components`).then(r => r.data),
};

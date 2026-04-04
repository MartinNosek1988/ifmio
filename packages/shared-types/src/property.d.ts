import type { UUID, ISODate } from './common';
export type PropertyType = 'SVJ' | 'BD' | 'RENTAL_RESIDENTIAL' | 'RENTAL_MUNICIPAL' | 'CONDO_NO_SVJ' | 'MIXED_USE' | 'SINGLE_FAMILY' | 'COMMERCIAL_OFFICE' | 'COMMERCIAL_RETAIL' | 'COMMERCIAL_WAREHOUSE' | 'COMMERCIAL_INDUSTRIAL' | 'PARKING' | 'LAND' | 'OTHER';
export type OwnershipType = 'vlastnictvi' | 'druzstvo' | 'pronajem';
export type PropertyStatus = 'active' | 'inactive' | 'archived';
export interface Property {
    id: UUID;
    tenantId: UUID;
    name: string;
    address: string;
    city: string;
    postalCode: string;
    type: PropertyType;
    ownership: OwnershipType;
    status: PropertyStatus;
    unitsCount: number;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export interface Unit {
    id: UUID;
    propertyId: UUID;
    name: string;
    floor?: number;
    area?: number;
    isOccupied: boolean;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export type OccupancyRole = 'owner' | 'tenant' | 'member';
export interface Occupancy {
    id: UUID;
    tenantId: UUID;
    unitId: UUID;
    residentId: UUID;
    role: OccupancyRole;
    startDate: ISODate;
    endDate?: ISODate;
    isActive: boolean;
    note?: string;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export interface UnitWithOccupancies extends Unit {
    occupancies: (Occupancy & {
        resident: import('./resident').Resident;
    })[];
}
export type CreatePropertyDto = Pick<Property, 'name' | 'address' | 'city' | 'postalCode' | 'type' | 'ownership'>;
export type UpdatePropertyDto = Partial<CreatePropertyDto>;
export type CreateUnitDto = Pick<Unit, 'name' | 'floor' | 'area'>;
export type UpdateUnitDto = Partial<CreateUnitDto>;
export type CreateOccupancyDto = Pick<Occupancy, 'unitId' | 'residentId' | 'role' | 'startDate' | 'endDate' | 'note'>;

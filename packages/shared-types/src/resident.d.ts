import type { UUID, ISODate } from './common';
export type ResidentRole = 'owner' | 'tenant' | 'member' | 'contact';
export interface Resident {
    id: UUID;
    tenantId: UUID;
    propertyId?: UUID;
    unitId?: UUID;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role: ResidentRole;
    isActive: boolean;
    hasDebt: boolean;
    createdAt: ISODate;
    updatedAt: ISODate;
}
export type CreateResidentDto = Pick<Resident, 'firstName' | 'lastName' | 'email' | 'phone' | 'role' | 'propertyId' | 'unitId'>;
export type UpdateResidentDto = Partial<CreateResidentDto>;

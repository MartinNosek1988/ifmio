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
  occupancies: (Occupancy & { resident: import('./resident').Resident })[];
}

export type CreatePropertyDto = Pick<
  Property,
  'name' | 'address' | 'city' | 'postalCode' | 'type' | 'ownership'
>;
export type UpdatePropertyDto = Partial<CreatePropertyDto>;
export type CreateUnitDto = Pick<Unit, 'name' | 'floor' | 'area'>;
export type UpdateUnitDto = Partial<CreateUnitDto>;
export type CreateOccupancyDto = Pick<
  Occupancy, 'unitId' | 'residentId' | 'role' | 'startDate' | 'endDate' | 'note'
>;

// ── ARES Enrichment ──

export interface AresEnrichmentData {
  ico: string;
  nazev: string;
  pravniForma: { kod: string; nazev: string };
  sidlo: { ulice: string; obec: string; psc: string; stat: string };
  dic?: string;
  datovaSChrana?: string;
  stavSubjektu: string;
  datumVzniku?: string;
  datumZaniku?: string;
  nace?: { kod: string; nazev: string }[];
  pocetZamestnancu?: string;
  spisovaZnacka?: string;
  statutarniOrgan?: AresStatutarniOrgan[];
  fetchedAt: string;
}

export interface AresStatutarniOrgan {
  typOrganu: string;
  clenove: AresStatutarniClen[];
}

export interface AresStatutarniClen {
  jmeno: string;
  prijmeni: string;
  funkce: string;
  datumVzniku?: string;
  datumZaniku?: string;
  adresa?: string;
}

// ── Justice.cz Enrichment ──

export interface JusticeEnrichmentData {
  ico: string;
  spisovaZnacka?: string;
  rejstrik: 'SVJ' | 'OR' | 'NEZNAMY';
  sbirkaListin: JusticeDocument[];
  historieCas: JusticeHistoryEvent[];
  fetchedAt: string;
}

export interface JusticeDocument {
  typ: 'STANOVY' | 'NOTARSKY_ZAPIS' | 'UCETNI_ZAVERKA' | 'VYROCNI_ZPRAVA' | 'ZAPIS_SHROMAZDENI' | 'JINE';
  datumPodani: string;
  nazev: string;
  url?: string;
}

export interface JusticeHistoryEvent {
  datum: string;
  typZmeny: string;
  popis: string;
}

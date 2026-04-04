import type { BaseEntity } from './base';

export type PropertyType = 'SVJ' | 'BD' | 'RENTAL_RESIDENTIAL' | 'RENTAL_MUNICIPAL' | 'CONDO_NO_SVJ' | 'MIXED_USE' | 'SINGLE_FAMILY' | 'COMMERCIAL_OFFICE' | 'COMMERCIAL_RETAIL' | 'COMMERCIAL_WAREHOUSE' | 'COMMERCIAL_INDUSTRIAL' | 'PARKING' | 'LAND' | 'OTHER';
export type PropertyEnvironment = 'CZ' | 'SK' | 'INT';

export interface Property extends BaseEntity {
  nazev: string;
  type: PropertyType;

  ico?: string;
  dic?: string;
  vat_payer: boolean;

  ulice: string;
  cislo_popisne?: string;
  mesto: string;
  psc?: string;
  stat: string;
  kat_uzemi?: string;
  list_vlastnictvi?: string;

  mena: 'CZK' | 'EUR';
  prostredi: PropertyEnvironment;
  ve_sprave_od?: string;
  ve_sprave_do?: string;

  splatnost_den: number;
  zaokrouhleni: 'zadne' | 'radky_stare' | 'radky' | 'cely';
  auto_generovani: boolean;
  zahrnout_nulove: boolean;

  majitel_person_id?: string;
  poznamka?: string;
}

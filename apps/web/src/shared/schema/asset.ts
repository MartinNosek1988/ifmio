import type { BaseEntity } from './base';

export interface AssetCategory extends BaseEntity {
  nazev: string;
  popis?: string;
  revision_period_months?: number;
  parent_category_id?: string;
  color?: string;
  icon?: string;
}

export type AssetStatus = 'aktivni' | 'v_oprave' | 'vyrazeno' | 'neaktivni';

export interface Asset extends BaseEntity {
  property_id: string;
  unit_id?: string;
  category_id: string;

  nazev: string;
  vyrobce?: string;
  model?: string;
  serial_number?: string;

  status: AssetStatus;

  datum_porideni?: string;
  datum_zarucni_do?: string;
  datum_pristi_revize?: string;
  posledni_revize?: string;

  umisteni?: string;
  hodnota_kc?: number;

  dokumenty: string[];
  poznamka?: string;
}

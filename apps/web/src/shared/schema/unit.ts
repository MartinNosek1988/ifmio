import type { BaseEntity } from './base';

export type UnitType = 'byt' | 'nebyt' | 'garaz' | 'parkovaci' | 'sklep' | 'pozemek';
export type UnitStatus = 'obsazena' | 'volna' | 'rezervovana' | 'neaktivni';

export interface Unit extends BaseEntity {
  property_id: string;

  cislo: string;
  nazev?: string;
  type: UnitType;
  status: UnitStatus;

  podlahova_plocha: number;
  disposice?: string;
  podlazi?: number;
  cislo_popisne?: string;
  list_vlastnictvi?: string;

  platnost_od?: string;
  platnost_do?: string;

  plochy: UnitRoom[];
  vybaveni: UnitEquipment[];

  skupina?: string;
  poznamka?: string;
}

export interface UnitRoom {
  nazev: string;
  vymera: number;
}

export interface UnitEquipment {
  id: string;
  nazev: string;
  typ?: string;
  hodnota_kc?: number;
  platnost_od?: string;
  platnost_do?: string;
}

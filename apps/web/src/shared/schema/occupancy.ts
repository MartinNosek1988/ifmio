import type { BaseEntity } from './base';

export type OccupancyStatus = 'aktivni' | 'ukoncena' | 'rezervovana';
export type OccupancyRelation = 'vlastnik' | 'najemce' | 'druzstevnik' | 'podnajemce';

export interface Occupancy extends BaseEntity {
  unit_id: string;
  property_id: string;
  person_id: string;
  lease_id?: string;

  relation: OccupancyRelation;
  status: OccupancyStatus;

  datum_od: string;
  datum_do?: string | null;

  variabilni_symbol: string;
  vs_rucne: boolean;

  splatnost_den?: number;
  uplatnit_dph: boolean;
  ucet_pro_platby?: string;
  ucet_pro_preplatky?: string;

  smlouva_od?: string;
  smlouva_do?: string;
  cislo_smlouvy?: string;
  upozornit_dni_pred_koncem?: number;
  kauce?: number;

  osoby: OccupancyPerson[];
  uzivatele: OccupancyUser[];
  pocet_osob: number;

  zahrnout_do_upominek: boolean;
  predpis_odeslan: boolean;

  poznamka?: string;
}

export interface OccupancyPerson {
  person_id: string;
  podil?: number;
  sjm_partner_id?: string;
  je_sjm: boolean;
}

export interface OccupancyUser {
  jmeno: string;
  datum_od?: string;
  datum_do?: string;
}

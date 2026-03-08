import type { BaseEntity } from './base';

export type ComponentType =
  | 'najem' | 'zaloha_voda' | 'zaloha_teplo' | 'zaloha_elektrina'
  | 'zaloha_gas' | 'zaloha_sluzby' | 'spravni' | 'fond_oprav'
  | 'pojisteni' | 'vytah' | 'zahrada' | 'garaz' | 'internet'
  | 'uroky' | 'anuita' | 'jina';

export type CalcMethod = 'konecna_castka' | 'sazba_mj' | 'plocha' | 'osoby' | 'podil' | 'smlouva';
export type Period = 'mesicni' | 'ctvrtletni' | 'pololetni' | 'rocni' | 'jednorazove';
export type AllocMethod = 'plocha' | 'osoby' | 'merici_soustava' | 'rovne_dily' | 'podil';
export type VatMode = 'neni' | 'dle_protistrany' | 'vzdy';

export interface PrescriptionComponent extends BaseEntity {
  property_id: string;

  nazev: string;
  type: ComponentType;
  poradi: number;
  aktivni: boolean;

  calc_method: CalcMethod;
  konecna_castka: number;
  sazba_mj: number;

  period: Period;
  period_mesice: number[];

  vyuctovava: boolean;
  alloc_method: AllocMethod;
  zvyhodneni_procent: number;

  je_fond: boolean;

  vat_mode: VatMode;
  vat_rate: 0 | 12 | 21;

  poznamka?: string;
}

export interface ComponentIndividualSetting extends BaseEntity {
  component_id: string;
  property_id: string;
  unit_id?: string;
  occupancy_id?: string;
  setting_type: 'unit' | 'occupancy';
  calc_method: CalcMethod;
  castka: number;
  zvyhodneni_procent: number;
  casova_osa: ComponentTimeEntry[];
}

export interface ComponentTimeEntry {
  platny_od: string;
  castka: number;
}

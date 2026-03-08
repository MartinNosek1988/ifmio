import type { BaseEntity } from './base';

export interface MeterSystem extends BaseEntity {
  property_id: string;
  nazev: string;
  jednotka: string;
  typ: 'pomerove' | 'patni' | 'hlavni';
}

export interface Meter extends BaseEntity {
  property_id: string;
  unit_id?: string;
  system_id: string;

  vyrobni_cislo?: string;
  typ: string;

  platnost_od: string;
  platnost_do?: string;

  predchudce_id?: string;
  poznamka?: string;
}

export interface MeterReading extends BaseEntity {
  meter_id: string;
  datum: string;
  stav: number;
  spotreba?: number;
  spotreba_od?: string;
  source: 'manual' | 'import' | 'auto';
  read_by_user_id?: string;
  poznamka?: string;
}

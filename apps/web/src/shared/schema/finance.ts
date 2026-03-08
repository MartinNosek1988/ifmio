import type { BaseEntity } from './base';

export type TransactionType = 'prijem' | 'vydaj';
export type AccountType = 'banka' | 'pokladna' | 'interni';
export type TransactionTarget = 'neuvedeno' | 'konto' | 'doklad' | 'slozka' | 'bez_vlivu';
export type PrescriptionStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface FinAccount extends BaseEntity {
  property_id: string;
  nazev: string;
  typ: AccountType;
  cislo_uctu?: string;
  iban?: string;
  banka?: string;
  banka_kod?: string;
  mena: 'CZK' | 'EUR';
  zustatek: number;
  vychozi: boolean;
  aktivni: boolean;
  poznamka?: string;
}

export interface FinTransaction extends BaseEntity {
  property_id: string;
  account_id: string;
  account_type: AccountType;

  typ: TransactionType;
  datum: string;
  castka: number;
  popis: string;

  target: TransactionTarget;
  lessee_person_id?: string;
  doklad_id?: string;
  component_id?: string;

  protiucet?: string;
  protiucet_nazev?: string;
  vs?: string;
  ks?: string;
  ss?: string;

  import_id?: string;
  import_source?: string;

  parovani: PaymentMatch[];
}

export interface PaymentMatch {
  prescription_id: string;
  castka: number;
  datum: string;
  auto: boolean;
  matched_by?: string;
}

export interface FinPrescription extends BaseEntity {
  property_id: string;
  unit_id: string;
  occupancy_id: string;
  lessee_person_id: string;
  lessee_name: string;

  rok: number;
  mesic: number;
  billing_period: string;
  datum_splatnosti: string;

  castka: number;
  zaplaceno: number;
  status: PrescriptionStatus;

  vs: string;
  ks: string;
  ss?: string;
  sada_predpisu: string;

  slozky: PrescriptionLine[];
  parovani: PaymentMatch[];

  rucne_upraveno: boolean;
  zahrnout_do_upominek: boolean;
  predpis_odeslan: boolean;
  datum_upominky?: string;
  rizeni?: string[];

  poznamka?: string;
}

export interface PrescriptionLine {
  component_id: string;
  nazev: string;
  typ: string;
  castka: number;
  castka_bez_dph?: number;
  dph?: number;
  dph_sazba?: number;
  rucne_upraveno: boolean;
  period: string;
}

export interface PaymentOrder extends BaseEntity {
  property_id: string;
  account_id: string;
  cislo: string;
  datum: string;
  splatnost: string;
  polozky: PaymentOrderLine[];
  total_castka: number;
  status: 'draft' | 'sent' | 'executed' | 'cancelled';
  abo_export?: string;
}

export interface PaymentOrderLine {
  id: string;
  nazev: string;
  cislo_uctu: string;
  castka: number;
  vs?: string;
  ks?: string;
  ss?: string;
  zprava?: string;
}

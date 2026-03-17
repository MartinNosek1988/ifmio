// Legacy types — used by existing UI pages that read from localStorage
// For new code, prefer types from '../../shared/schema/finance'

export interface FinTransaction {
  id: string;
  propId: number;
  uctId: string;
  typ: 'prijem' | 'vydej';
  datum: string;
  castka: number;
  vs: string;
  protiUcet: string;
  popis: string;
  cisloDokladu?: string;
  cil: string;
  parovani: string[];
  created: string;

  // P0-4: nájemce/vlastník (replaced tenantId)
  lessee_person_id?: string | null;
  /** @deprecated Use lessee_person_id */
  tenantId?: string | null;

  // P1-1: timestamps
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface FinPrescription {
  id: string;
  propId: number;
  jednotkaId: string;
  castka: number;
  kUhrade: number;
  datum: string;
  splatnost: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  popis: string;
  typ: string;
  vs?: string;
  source?: string | null;
  items?: { id: string; name: string; amount: number; unit?: string; componentId?: string | null }[];

  // P0-4: unified naming
  lessee_person_id?: string;
  lessee_name?: string;
  occupancy_id?: string;
  /** @deprecated Use lessee_person_id */
  tenantId?: string;

  // S4: billing period
  billing_period?: string;

  // P1-1: timestamps
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface FinAccount {
  id: string;
  nazev: string;
  cislo: string;
  typ: 'banka' | 'pokladna';
  zustatek: number;
  propId: string;

  // P1-1: timestamps
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- Legacy types used by finance/lib modules ---

export interface FinComponent {
  id: string;
  propId: number;
  nazev: string;
  castka: number;
  typ: string;
  vypocet: 'pevna' | 'plocha' | 'osoby' | 'nepocitat';
  aktivni: boolean;
  prirazenoVsem?: boolean;
  unitIds?: string[];
}

export interface FinTenant {
  id: string;
  unitNum?: string;
  pocetOsob?: number;
  individualniSlozky?: { slozkaId: string; castka: number }[];
}

export interface OpeningBalance {
  tenantId: string;
  typ: string;
  castka: number;
  uhrazeno?: boolean;
}

export interface TenantDebt {
  predpisDluh: number;
  pocDluh: number;
  celkem: number;
  predpisy: FinPrescription[];
}

export interface FinPaymentOrder {
  id: string;
  datum?: string;
  polozky?: {
    protiUcet?: string;
    castka?: number;
    vs?: string;
    ks?: string;
    ss?: string;
    popis?: string;
  }[];
}

export interface ImportedTransaction {
  id: string;
  fioId: string;
  datum: string;
  banka: string;
  typ: string;
  smer: '+' | '-';
  nazev: string;
  vs: string;
  castka: number;
  mena: string;
  ucet: string;
  zprava: string;
  propId: number;
}

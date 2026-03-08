import type { BaseEntity } from './base';

export type PersonType = 'fyzicka' | 'pravnicka';
export type PersonRole = 'vlastnik' | 'najemce' | 'druzstevnik' | 'kontakt' | 'dodavatel' | 'spravce';

export interface Person extends BaseEntity {
  type: PersonType;
  roles: PersonRole[];

  // Fyzická osoba
  jmeno?: string;
  prijmeni?: string;
  datum_narozeni?: string;

  // Právnická osoba
  nazev_firmy?: string;
  ico?: string;
  dic?: string;

  // Kontakt
  email?: string;
  telefon?: string;
  telefon2?: string;

  // Adresa
  ulice?: string;
  mesto?: string;
  psc?: string;
  stat?: string;

  // Bankovní účet
  cislo_uctu?: string;
  iban?: string;

  display_name: string;
  poznamka?: string;
}

export function getPersonDisplayName(p: Partial<Person>): string {
  if (p.type === 'pravnicka') return p.nazev_firmy || p.ico || 'Firma';
  return [p.jmeno, p.prijmeni].filter(Boolean).join(' ') || p.email || 'Osoba';
}

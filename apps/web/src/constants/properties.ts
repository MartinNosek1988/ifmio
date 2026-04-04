export const PROPERTY_TYPES = [
  { value: 'SVJ', label: 'Bytový dům — SVJ' },
  { value: 'BD', label: 'Bytový dům — Družstevní' },
  { value: 'RENTAL_RESIDENTIAL', label: 'Bytový dům — Nájemní' },
  { value: 'RENTAL_MUNICIPAL', label: 'Bytový dům — Obecní' },
  { value: 'CONDO_NO_SVJ', label: 'Bytový dům — Bez SVJ' },
  { value: 'MIXED_USE', label: 'Bytový dům — Smíšený' },
  { value: 'SINGLE_FAMILY', label: 'Rodinný dům' },
  { value: 'COMMERCIAL_OFFICE', label: 'Kancelářská budova' },
  { value: 'COMMERCIAL_RETAIL', label: 'Obchodní prostory' },
  { value: 'COMMERCIAL_WAREHOUSE', label: 'Sklad / logistika' },
  { value: 'COMMERCIAL_INDUSTRIAL', label: 'Průmyslový objekt' },
  { value: 'PARKING', label: 'Garáže / parkování' },
  { value: 'LAND', label: 'Pozemek' },
  { value: 'OTHER', label: 'Jiné' },
] as const;

export const UNIT_STATUSES = [
  { value: 'obsazeno', label: 'Obsazeno', color: 'green' as const },
  { value: 'volne', label: 'Volne', color: 'blue' as const },
  { value: 'rekonstrukce', label: 'Rekonstrukce', color: 'yellow' as const },
] as const;

export const SUBJEKT_TYPES = [
  { value: 'SVJ', label: 'SVJ' },
  { value: 'BD', label: 'Bytove druzstvo' },
  { value: 'sro', label: 's.r.o.' },
  { value: 'as', label: 'a.s.' },
  { value: 'FO', label: 'Fyzicka osoba' },
] as const;

export const PROPERTY_TYPES = [
  { value: 'bytovy_dum', label: 'Bytovy dum' },
  { value: 'kancelare', label: 'Kancelarske prostory' },
  { value: 'obchodni', label: 'Obchodni prostory' },
  { value: 'prumyslovy', label: 'Prumyslovy objekt' },
  { value: 'rodinny_dum', label: 'Rodinny dum' },
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

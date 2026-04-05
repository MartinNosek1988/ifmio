// PROPERTY_TYPES moved to @ifmio/shared-types/property-type-config (single source of truth)
// Use: import { getPropertyTypeOptions } from '@ifmio/shared-types'

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

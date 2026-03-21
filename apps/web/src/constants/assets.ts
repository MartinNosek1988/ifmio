export const ASSET_STATUSES = [
  { value: 'aktivni', label: 'Aktivní', color: 'green' as const },
  { value: 'servis', label: 'V servisu', color: 'yellow' as const },
  { value: 'vyrazeno', label: 'Vyřazeno', color: 'red' as const },
  { value: 'archiv', label: 'Archiv', color: 'muted' as const },
] as const;

export const REVISION_STATUSES = [
  { value: 'ok', label: 'V pořádku', color: 'green' as const },
  { value: 'blizi_se', label: 'Blíží se', color: 'yellow' as const },
  { value: 'prosla', label: 'Prošla', color: 'red' as const },
] as const;

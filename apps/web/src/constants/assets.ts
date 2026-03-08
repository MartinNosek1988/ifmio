export const ASSET_STATUSES = [
  { value: 'aktivni', label: 'Aktivni', color: 'green' as const },
  { value: 'servis', label: 'V servisu', color: 'yellow' as const },
  { value: 'vyrazeno', label: 'Vyrazeno', color: 'red' as const },
  { value: 'archiv', label: 'Archiv', color: 'muted' as const },
] as const;

export const REVISION_STATUSES = [
  { value: 'ok', label: 'V poradku', color: 'green' as const },
  { value: 'blizi_se', label: 'Blizi se', color: 'yellow' as const },
  { value: 'prosla', label: 'Prosla', color: 'red' as const },
] as const;

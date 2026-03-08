export const FIN_TABS = [
  { key: 'prescriptions', label: 'Predpisy' },
  { key: 'bank', label: 'Banka' },
  { key: 'cash', label: 'Pokladna' },
  { key: 'orders', label: 'Prikazy' },
  { key: 'accounts', label: 'Ucty' },
  { key: 'ledger', label: 'Ucetnictvi' },
  { key: 'debtors', label: 'Dluznici' },
] as const;

export const TX_TYPES = [
  { value: 'prijem', label: 'Prijem', color: 'green' as const },
  { value: 'vydej', label: 'Vydej', color: 'red' as const },
] as const;

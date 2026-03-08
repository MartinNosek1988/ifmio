export const WO_PRIORITIES = [
  { value: 'kriticka', label: 'Kriticka', color: 'red' as const },
  { value: 'vysoka', label: 'Vysoka', color: 'yellow' as const },
  { value: 'normalni', label: 'Normalni', color: 'blue' as const },
  { value: 'nizka', label: 'Nizka', color: 'muted' as const },
] as const;

export const WO_STATUSES = [
  { value: 'nova', label: 'Nova', color: 'blue' as const },
  { value: 'v_reseni', label: 'V reseni', color: 'yellow' as const },
  { value: 'po_terminu', label: 'Po terminu', color: 'red' as const },
  { value: 'vyresena', label: 'Vyresena', color: 'green' as const },
  { value: 'uzavrena', label: 'Uzavrena', color: 'muted' as const },
] as const;

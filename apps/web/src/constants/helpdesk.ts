export const HD_STATUSES = [
  { value: 'nova', label: 'Nova', color: 'blue' as const },
  { value: 'v_reseni', label: 'V reseni', color: 'yellow' as const },
  { value: 'vyresena', label: 'Vyresena', color: 'green' as const },
  { value: 'uzavrena', label: 'Uzavrena', color: 'muted' as const },
] as const;

export const HD_CATEGORIES = [
  'Elektroinstalace',
  'Vodovod a kanalizace',
  'Vytapeni',
  'Stavebni prace',
  'Vzduchotechnika',
  'Bezpecnost',
  'Ostatni',
] as const;

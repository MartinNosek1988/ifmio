export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  SVJ: 'Bytový dům — SVJ',
  BD: 'Bytový dům — Družstevní',
  RENTAL_RESIDENTIAL: 'Bytový dům — Nájemní',
  RENTAL_MUNICIPAL: 'Bytový dům — Obecní',
  CONDO_NO_SVJ: 'Bytový dům — Bez SVJ',
  MIXED_USE: 'Bytový dům — Smíšený',
  SINGLE_FAMILY: 'Rodinný dům',
  COMMERCIAL_OFFICE: 'Kancelářská budova',
  COMMERCIAL_RETAIL: 'Obchodní prostory',
  COMMERCIAL_WAREHOUSE: 'Sklad / logistika',
  COMMERCIAL_INDUSTRIAL: 'Průmyslový objekt',
  PARKING: 'Garáže / parkování',
  LAND: 'Pozemek',
  OTHER: 'Jiné',
};

export const PROPERTY_TYPE_COLORS: Record<string, string> = {
  SVJ: '#0D9B8A',
  BD: '#3B82F6',
  RENTAL_RESIDENTIAL: '#8B5CF6',
  RENTAL_MUNICIPAL: '#22C55E',
  CONDO_NO_SVJ: '#F59E0B',
  MIXED_USE: '#EC4899',
  SINGLE_FAMILY: '#F97316',
  COMMERCIAL_OFFICE: '#6B7280',
  COMMERCIAL_RETAIL: '#6B7280',
  COMMERCIAL_WAREHOUSE: '#6B7280',
  COMMERCIAL_INDUSTRIAL: '#6B7280',
  PARKING: '#6B7280',
  LAND: '#92400E',
  OTHER: '#9CA3AF',
};

export const WO_STATUS_LABELS: Record<string, string> = {
  nova: 'Nová',
  v_reseni: 'V řešení',
  po_terminu: 'Po termínu',
  vyresena: 'Vyřešena',
  uzavrena: 'Uzavřena',
  zrusena: 'Zrušena',
  cekajici: 'Čekající',
};

export const WO_PRIORITY_LABELS: Record<string, string> = {
  nizka: 'Nízká',
  normalni: 'Normální',
  vysoka: 'Vysoká',
  kriticka: 'Kritická',
};

export const HD_STATUS_LABELS: Record<string, string> = {
  nova: 'Nová',
  v_reseni: 'V řešení',
  vyresena: 'Vyřešena',
  uzavrena: 'Uzavřena',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: 'Nový',
  open: 'Otevřený',
  in_progress: 'V řešení',
  resolved: 'Vyřešený',
  closed: 'Uzavřený',
  cancelled: 'Zrušený',
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká',
  medium: 'Normální',
  high: 'Vysoká',
  critical: 'Kritická',
};

export const FIN_STATUS_LABELS: Record<string, string> = {
  pending: 'Čeká',
  paid: 'Zaplaceno',
  partial: 'Částečně',
  overdue: 'Po splatnosti',
};

export const UNIT_STATUS_LABELS: Record<string, string> = {
  obsazena: 'Obsazeno',
  volna: 'Volné',
  rezervovana: 'Rezervováno',
  neaktivni: 'Neaktivní',
  obsazeno: 'Obsazeno',
  volne: 'Volné',
  rekonstrukce: 'Rekonstrukce',
};

export const UNIT_TYPE_LABELS: Record<string, string> = {
  byt: 'Byt',
  nebyt: 'Nebytový prostor',
  garaz: 'Garáž',
  parkovaci: 'Parkování',
  sklep: 'Sklep',
  pozemek: 'Pozemek',
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  aktivni: 'Aktivní',
  servis: 'V servisu',
  vyrazeno: 'Vyřazeno',
  archiv: 'Archiv',
};

export const REVISION_STATUS_LABELS: Record<string, string> = {
  ok: 'V pořádku',
  blizi_se: 'Blíží se',
  prosla: 'Prošla',
};

export const NC_STATUS_LABELS: Record<string, string> = {
  otevrena: 'Otevřená',
  v_reseni: 'V řešení',
  uzavrena: 'Uzavřena',
};

export const NC_SEVERITY_LABELS: Record<string, string> = {
  kriticka: 'Kritická',
  vysoka: 'Vysoká',
  normalni: 'Normální',
  nizka: 'Nízká',
};

export const CA_STATUS_LABELS: Record<string, string> = {
  planovana: 'Plánovaná',
  v_realizaci: 'V realizaci',
  dokoncena: 'Dokončena',
};

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  najemnik: 'Nájemník',
  dodavatel: 'Dodavatel',
  vlastnik: 'Vlastník',
  spravce: 'Správce',
  kontakt: 'Kontakt',
};

export const METER_TYPE_LABELS: Record<string, string> = {
  elektrina: 'Elektřina',
  voda_studena: 'Studená voda',
  voda_tepla: 'Teplá voda',
  plyn: 'Plyn',
  teplo: 'Teplo',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  schuze: 'Schůze',
  revize: 'Revize',
  predani: 'Předání',
  udrzba: 'Údržba',
  prohlidka: 'Prohlídka',
  ostatni: 'Ostatní',
  workorder: 'Work Order',
  contract: 'Smlouva',
  meter: 'Kalibrace',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'Smlouva',
  invoice: 'Faktura',
  protocol: 'Protokol',
  photo: 'Foto',
  plan: 'Plán',
  regulation: 'Nařízení',
  other: 'Ostatní',
};

/** Lookup helper — returns label or raw key if not found */
export function label(map: Record<string, string>, key: string): string {
  return map[key] || key;
}

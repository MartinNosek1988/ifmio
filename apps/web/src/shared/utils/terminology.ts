/**
 * Terminologický slovník — mapování technických model names na české UX pojmy.
 * Viz DESIGN_SYSTEM.md Sekce 11.
 */
export const terminology: Record<string, string> = {
  tenant: 'Organizace',
  party: 'Osoba',
  resident: 'Osoba',
  principal: 'Statutární zástupce',
  ownerAccount: 'Konto vlastníka',
  ownerAccountEntry: 'Pohyb na kontě',
  ledgerEntry: 'Účetní zápis',
  prescription: 'Předpis plateb',
  prescriptionComponent: 'Složka předpisu',
  componentAssignment: 'Přiřazení složky',
  fundRepair: 'Fond oprav',
  tenancy: 'Nájemní vztah',
  occupancy: 'Užívání jednotky',
  billingPeriod: 'Zúčtovací období',
  settlement: 'Vyúčtování',
  slaPolicy: 'Pravidlo SLA',
  slaEscalation: 'Eskalace',
  workOrder: 'Pracovní příkaz',
  asset: 'Zařízení',
  assetServiceRecord: 'Záznam o servisu',
  assetType: 'Typ zařízení',
  meterReading: 'Odečet měřidla',
  meter: 'Měřidlo',
  assembly: 'Shromáždění',
  votingItem: 'Bod hlasování',
  resolution: 'Usnesení',
  perRollamVoting: 'Hlasování per rollam',
  emailInboundConfig: 'Nastavení příchozího emailu',
  auditLog: 'Historie změn',
  cronJobLog: 'Systémový log',
  helpdeskTicket: 'Požadavek',
  invoice: 'Doklad',
  bankAccount: 'Bankovní účet',
  bankTransaction: 'Bankovní transakce',
  document: 'Dokument',
  calendarEvent: 'Událost',
  leaseAgreement: 'Nájemní smlouva',
  protocol: 'Protokol',
  revisionPlan: 'Plán revize',
  notification: 'Notifikace',
  property: 'Nemovitost',
  unit: 'Jednotka',
}

/** Kontextové pojmy — "osoba" se zobrazuje jinak dle kontextu */
export const contextTerms: Record<string, Record<string, string>> = {
  resident: {
    ownerList: 'Vlastník',
    tenantList: 'Nájemník',
    memberList: 'Člen',
    contactList: 'Kontaktní osoba',
    ticketReporter: 'Žadatel',
    ticketAssignee: 'Řešitel',
    workOrderAssignee: 'Technik',
    workOrderRequester: 'Zadavatel',
    protocolSupplier: 'Dodavatel',
    protocolCustomer: 'Objednatel',
  },
}

/**
 * Get Czech UI label for a model or concept.
 * @param modelName - technical model name (camelCase)
 * @param context - optional context for contextual terms
 */
export function getTermLabel(modelName: string, context?: string): string {
  if (context && contextTerms[modelName]?.[context]) {
    return contextTerms[modelName][context]
  }
  return terminology[modelName] || modelName
}

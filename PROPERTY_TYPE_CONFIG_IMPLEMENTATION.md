# Jak dostat doménové modely do ifmio — implementační plán

> Princip: PropertyType řídí CELÝ UX — formuláře, sloupce, workflow, terminologii, validace.
> Jeden konfigurační objekt per typ → celá aplikace se adaptuje.

---

## Architektura: PropertyTypeConfig

Jeden TypeScript soubor, který je ZDROJEM PRAVDY pro celou aplikaci.
Všechny komponenty čtou z tohoto configu — žádné hardcoded if/else.

### Soubor: `packages/shared/src/property-type-config.ts`

```typescript
// ============================================================
// PROPERTY TYPE CONFIGURATION — Single Source of Truth
// ============================================================
// Veškeré doménové know-how z dokumentů (SVJ, BD, Rental, Commercial,
// Mixed-Use) je zakódováno ZDE. UI komponenty ČTOU tento config
// a adaptují se automaticky.
// ============================================================

export enum PropertyType {
  SVJ = 'SVJ',
  BD = 'BD',
  RENTAL_RESIDENTIAL = 'RENTAL_RESIDENTIAL',
  RENTAL_MUNICIPAL = 'RENTAL_MUNICIPAL',
  CONDO_NO_SVJ = 'CONDO_NO_SVJ',
  MIXED_USE = 'MIXED_USE',
  SINGLE_FAMILY = 'SINGLE_FAMILY',
  COMMERCIAL_OFFICE = 'COMMERCIAL_OFFICE',
  COMMERCIAL_RETAIL = 'COMMERCIAL_RETAIL',
  COMMERCIAL_WAREHOUSE = 'COMMERCIAL_WAREHOUSE',
  COMMERCIAL_INDUSTRIAL = 'COMMERCIAL_INDUSTRIAL',
  PARKING = 'PARKING',
  LAND = 'LAND',
  OTHER = 'OTHER',
}

// ---- Kategorie (pro filtrování v UI) ----

export type PropertyCategory = 'RESIDENTIAL' | 'COMMERCIAL' | 'SPECIAL'

// ---- Terminologie per typ ----

export interface PropertyTerminology {
  /** Jak nazýváme "vlastníka" jednotky */
  unitOwnerLabel: string
  /** Jak nazýváme "nájemníka" */
  tenantLabel: string
  /** Jak nazýváme "předpis platby" */
  prescriptionLabel: string
  /** Jak nazýváme "fond oprav" */
  fundLabel: string
  /** Jak nazýváme "shromáždění" */
  assemblyLabel: string
  /** Jak nazýváme "výbor / statutární orgán" */
  boardLabel: string
  /** Jak nazýváme nájemní smlouvu */
  leaseLabel: string
}

// ---- Feature flags per typ ----

export interface PropertyFeatures {
  /** Má fond oprav / příspěvky na správu */
  hasFundRepair: boolean
  /** Má předpisy plateb (měsíční zálohy) */
  hasPrescriptions: boolean
  /** Má vyúčtování služeb (roční) */
  hasSettlement: boolean
  /** Má shromáždění / hlasování */
  hasAssembly: boolean
  /** Má per rollam hlasování */
  hasPerRollam: boolean
  /** Má statutární orgán (výbor/představenstvo) */
  hasBoard: boolean
  /** Má nájemní smlouvy (rezidenční, chráněný nájem) */
  hasResidentialLeases: boolean
  /** Má komerční nájemní smlouvy (NOZ §2302) */
  hasCommercialLeases: boolean
  /** Má service charges (komerční provozní náklady) */
  hasServiceCharges: boolean
  /** Má indexaci nájemného */
  hasRentIndexation: boolean
  /** Má lease events tracking (break, option, expiry) */
  hasLeaseEvents: boolean
  /** Má DPH režim (plátce/neplátce/krácený odpočet) */
  hasVatTracking: boolean
  /** Má kauce / bankovní záruky */
  hasDeposits: boolean
  /** Má družstevní podíly */
  hasCooperativeShares: boolean
  /** Má vlastnické podíly na společných částech */
  hasOwnershipShares: boolean
  /** Má helpdesk / hlášení závad */
  hasHelpdesk: boolean
  /** Má work orders */
  hasWorkOrders: boolean
  /** Má revize a údržbu */
  hasRevisions: boolean
  /** Má měřidla (voda, teplo) */
  hasMeters: boolean
  /** Má portál pro vlastníky/nájemníky */
  hasPortal: boolean
  /** Má tenant fit-out workflow */
  hasFitOut: boolean
  /** Má obsazenost tracking */
  hasOccupancyTracking: boolean
  /** Má CAPEX plánování */
  hasCapexPlanning: boolean
  /** Má certifikace (BREEAM/LEED) */
  hasCertifications: boolean
  /** Má KPI dashboard (NOI, Cap Rate, WAULT) */
  hasInvestmentKpis: boolean
}

// ---- Validační pravidla ----

export interface PropertyValidation {
  /** Povinné IČO (SVJ, BD ano; RD ne) */
  requiresIco: boolean
  /** Povinný katastr */
  requiresCadastre: boolean
  /** Povinné stanovy */
  requiresBylaws: boolean
  /** Max kauce v násobcích měsíčního nájemného */
  maxDepositMultiplier: number | null
  /** Zákonná výpovědní lhůta (měsíce) */
  minNoticePeriodMonths: number | null
}

// ---- UI konfigurace ----

export interface PropertyUiConfig {
  /** Barva badge */
  badgeColor: string
  /** Tailwind třídy pro badge */
  badgeClasses: string
  /** Ikona (lucide-react name) */
  icon: string
  /** Zkratka pro tabulky */
  shortLabel: string
  /** Český název */
  label: string
  /** Popis pro tooltip */
  description: string
  /** Které taby zobrazit na Property Detail */
  detailTabs: PropertyDetailTab[]
  /** Které sloupce zobrazit v Unit tabulce */
  unitColumns: UnitColumnId[]
  /** Které sloupce zobrazit v Resident/Member tabulce */
  personColumns: PersonColumnId[]
}

export type PropertyDetailTab =
  | 'overview'        // Přehled (vždy)
  | 'units'           // Jednotky (vždy)
  | 'residents'       // Vlastníci / Členové / Nájemníci
  | 'finance'         // Finance (předpisy, konto, dlužníci)
  | 'fund'            // Fond oprav
  | 'leases'          // Nájemní smlouvy (komerční lease management)
  | 'service-charges' // Service charges (komerční)
  | 'settlement'      // Vyúčtování služeb
  | 'helpdesk'        // HelpDesk
  | 'work-orders'     // Work Orders
  | 'assets'          // TZB / Assets
  | 'revisions'       // Revize
  | 'meters'          // Měřidla
  | 'documents'       // Dokumenty
  | 'assembly'        // Shromáždění / Hlasování
  | 'board'           // Výbor / Představenstvo
  | 'insurance'       // Pojištění
  | 'building-info'   // O budově (KB enrichment)
  | 'kpi'             // KPI dashboard (komerční)
  | 'occupancy'       // Obsazenost

export type UnitColumnId =
  | 'name' | 'floor' | 'area' | 'type' | 'disposition'
  | 'ownershipShare' | 'cooperativeShare'
  | 'owner' | 'member' | 'tenant' | 'commercialTenant'
  | 'rent' | 'prescription' | 'leaseExpiry' | 'occupancy'

export type PersonColumnId =
  | 'name' | 'unit' | 'role' | 'ownershipShare' | 'cooperativeShare'
  | 'email' | 'phone' | 'debt' | 'leaseStart' | 'leaseEnd'

// ---- Právní reference ----

export interface PropertyLegalReference {
  /** Hlavní zákon */
  primaryLaw: string
  /** Paragraf */
  paragraphs: string
  /** Popis */
  description: string
}

// ============================================================
// KOMPLETNÍ KONFIGURACE PER TYP
// ============================================================

export interface PropertyTypeDefinition {
  type: PropertyType
  category: PropertyCategory
  terminology: PropertyTerminology
  features: PropertyFeatures
  validation: PropertyValidation
  ui: PropertyUiConfig
  legalReferences: PropertyLegalReference[]
}

// ---- KONFIGURACE ----

export const PROPERTY_TYPE_CONFIG: Record<PropertyType, PropertyTypeDefinition> = {

  // ==================== SVJ ====================
  [PropertyType.SVJ]: {
    type: PropertyType.SVJ,
    category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník',
      tenantLabel: 'Nájemník',
      prescriptionLabel: 'Předpis platby',
      fundLabel: 'Fond oprav',
      assemblyLabel: 'Shromáždění vlastníků',
      boardLabel: 'Výbor SVJ',
      leaseLabel: 'Nájemní smlouva',
    },
    features: {
      hasFundRepair: true,
      hasPrescriptions: true,
      hasSettlement: true,
      hasAssembly: true,
      hasPerRollam: true,
      hasBoard: true,
      hasResidentialLeases: true,  // vlastník může pronajímat
      hasCommercialLeases: false,
      hasServiceCharges: false,
      hasRentIndexation: false,
      hasLeaseEvents: false,
      hasVatTracking: false,       // většina SVJ neplátce
      hasDeposits: true,           // kauce u pronájmů
      hasCooperativeShares: false,
      hasOwnershipShares: true,    // podíly na SČ
      hasHelpdesk: true,
      hasWorkOrders: true,
      hasRevisions: true,
      hasMeters: true,
      hasPortal: true,
      hasFitOut: false,
      hasOccupancyTracking: false,
      hasCapexPlanning: false,
      hasCertifications: false,
      hasInvestmentKpis: false,
    },
    validation: {
      requiresIco: true,
      requiresCadastre: true,
      requiresBylaws: true,
      maxDepositMultiplier: 3,     // NOZ: max 3× měsíční nájemné
      minNoticePeriodMonths: 3,    // zákonná
    },
    ui: {
      badgeColor: '#0D9B8A',
      badgeClasses: 'bg-teal-100 text-teal-800',
      icon: 'Building2',
      shortLabel: 'SVJ',
      label: 'SVJ (Společenství vlastníků)',
      description: 'Bytový dům s vlastníky jednotek, fond oprav, shromáždění.',
      detailTabs: [
        'overview', 'units', 'residents', 'finance', 'fund', 'settlement',
        'helpdesk', 'work-orders', 'assets', 'revisions', 'meters',
        'documents', 'assembly', 'board', 'insurance', 'building-info',
      ],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'ownershipShare', 'owner', 'tenant', 'prescription'],
      personColumns: ['name', 'unit', 'role', 'ownershipShare', 'email', 'phone', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§1158-§1222', description: 'Bytové spoluvlastnictví, SVJ' },
      { primaryLaw: 'NOZ', paragraphs: '§1200', description: 'Stanovy SVJ' },
      { primaryLaw: 'NOZ', paragraphs: '§1212', description: 'Per rollam hlasování' },
      { primaryLaw: 'Zákon 67/2013', paragraphs: '', description: 'Služby spojené s bydlením' },
      { primaryLaw: 'Vyhláška 269/2015', paragraphs: '', description: 'Rozúčtování tepla a vody' },
    ],
  },

  // ==================== BD ====================
  [PropertyType.BD]: {
    type: PropertyType.BD,
    category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Člen družstva',
      tenantLabel: 'Podnájemník',
      prescriptionLabel: 'Předpis nájemného',
      fundLabel: 'Fond oprav',
      assemblyLabel: 'Členská schůze',
      boardLabel: 'Představenstvo',
      leaseLabel: 'Podnájemní smlouva',
    },
    features: {
      hasFundRepair: true,
      hasPrescriptions: true,
      hasSettlement: true,
      hasAssembly: true,
      hasPerRollam: true,
      hasBoard: true,
      hasResidentialLeases: false,
      hasCommercialLeases: true,   // BD často má komerční prostory
      hasServiceCharges: false,
      hasRentIndexation: false,
      hasLeaseEvents: false,
      hasVatTracking: true,        // BD často plátce DPH
      hasDeposits: false,
      hasCooperativeShares: true,
      hasOwnershipShares: false,
      hasHelpdesk: true,
      hasWorkOrders: true,
      hasRevisions: true,
      hasMeters: true,
      hasPortal: true,
      hasFitOut: false,
      hasOccupancyTracking: false,
      hasCapexPlanning: false,
      hasCertifications: false,
      hasInvestmentKpis: false,
    },
    validation: {
      requiresIco: true,
      requiresCadastre: true,
      requiresBylaws: true,
      maxDepositMultiplier: null,   // u podnájmu žádný zákonný limit
      minNoticePeriodMonths: null,
    },
    ui: {
      badgeColor: '#3B82F6',
      badgeClasses: 'bg-blue-100 text-blue-800',
      icon: 'Building2',
      shortLabel: 'BD',
      label: 'Bytové družstvo',
      description: 'Družstvo vlastní dům, členové mají právo užívání.',
      detailTabs: [
        'overview', 'units', 'residents', 'finance', 'fund', 'settlement',
        'helpdesk', 'work-orders', 'assets', 'revisions', 'meters',
        'documents', 'assembly', 'board', 'insurance', 'building-info',
      ],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'cooperativeShare', 'member', 'tenant', 'prescription'],
      personColumns: ['name', 'unit', 'role', 'cooperativeShare', 'email', 'phone', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'ZOK', paragraphs: '§727-§757', description: 'Bytová družstva' },
      { primaryLaw: 'ZOK', paragraphs: '§552-§726', description: 'Obecná družstva' },
      { primaryLaw: 'NOZ', paragraphs: '§2235-§2301', description: 'Nájem bytu (členové BD)' },
    ],
  },

  // ==================== RENTAL_RESIDENTIAL ====================
  [PropertyType.RENTAL_RESIDENTIAL]: {
    type: PropertyType.RENTAL_RESIDENTIAL,
    category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník domu',
      tenantLabel: 'Nájemník',
      prescriptionLabel: 'Nájemné',
      fundLabel: 'Fond údržby',
      assemblyLabel: '-',
      boardLabel: '-',
      leaseLabel: 'Nájemní smlouva',
    },
    features: {
      hasFundRepair: false,
      hasPrescriptions: true,
      hasSettlement: true,
      hasAssembly: false,
      hasPerRollam: false,
      hasBoard: false,
      hasResidentialLeases: true,
      hasCommercialLeases: false,
      hasServiceCharges: false,
      hasRentIndexation: false,
      hasLeaseEvents: false,
      hasVatTracking: false,
      hasDeposits: true,
      hasCooperativeShares: false,
      hasOwnershipShares: false,
      hasHelpdesk: true,
      hasWorkOrders: true,
      hasRevisions: true,
      hasMeters: true,
      hasPortal: true,
      hasFitOut: false,
      hasOccupancyTracking: true,
      hasCapexPlanning: false,
      hasCertifications: false,
      hasInvestmentKpis: false,
    },
    validation: {
      requiresIco: false,
      requiresCadastre: false,
      requiresBylaws: false,
      maxDepositMultiplier: 3,
      minNoticePeriodMonths: 3,
    },
    ui: {
      badgeColor: '#A855F7',
      badgeClasses: 'bg-purple-100 text-purple-800',
      icon: 'Home',
      shortLabel: 'NÁJ',
      label: 'Nájemní bytový dům',
      description: 'Soukromý vlastník pronajímá byty nájemníkům.',
      detailTabs: [
        'overview', 'units', 'residents', 'finance', 'settlement',
        'helpdesk', 'work-orders', 'assets', 'revisions', 'meters',
        'documents', 'insurance', 'building-info', 'occupancy',
      ],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'tenant', 'rent', 'leaseExpiry', 'occupancy'],
      personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§2235-§2301', description: 'Nájem bytu (chráněný)' },
      { primaryLaw: 'Zákon 67/2013', paragraphs: '', description: 'Služby spojené s bydlením' },
    ],
  },

  // ==================== MIXED_USE ====================
  [PropertyType.MIXED_USE]: {
    type: PropertyType.MIXED_USE,
    category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník',
      tenantLabel: 'Nájemník',
      prescriptionLabel: 'Předpis platby',
      fundLabel: 'Fond oprav',
      assemblyLabel: 'Shromáždění vlastníků',
      boardLabel: 'Výbor SVJ',
      leaseLabel: 'Nájemní smlouva',
    },
    features: {
      hasFundRepair: true,
      hasPrescriptions: true,
      hasSettlement: true,
      hasAssembly: true,
      hasPerRollam: true,
      hasBoard: true,
      hasResidentialLeases: true,
      hasCommercialLeases: true,  // komerční prostory v přízemí
      hasServiceCharges: true,    // SC pro komerční nájemce
      hasRentIndexation: true,    // indexace komerčního nájmu
      hasLeaseEvents: true,
      hasVatTracking: true,       // DPH krácený odpočet
      hasDeposits: true,
      hasCooperativeShares: false,
      hasOwnershipShares: true,
      hasHelpdesk: true,
      hasWorkOrders: true,
      hasRevisions: true,
      hasMeters: true,
      hasPortal: true,
      hasFitOut: true,
      hasOccupancyTracking: true,
      hasCapexPlanning: false,
      hasCertifications: false,
      hasInvestmentKpis: false,
    },
    validation: {
      requiresIco: true,
      requiresCadastre: true,
      requiresBylaws: true,
      maxDepositMultiplier: 3,
      minNoticePeriodMonths: 3,
    },
    ui: {
      badgeColor: '#F59E0B',
      badgeClasses: 'bg-amber-100 text-amber-800',
      icon: 'Building',
      shortLabel: 'MIX',
      label: 'Smíšený dům',
      description: 'Byty + komerční prostory pod jednou střechou.',
      detailTabs: [
        'overview', 'units', 'residents', 'finance', 'fund', 'leases',
        'service-charges', 'settlement', 'helpdesk', 'work-orders',
        'assets', 'revisions', 'meters', 'documents', 'assembly',
        'board', 'insurance', 'building-info', 'occupancy',
      ],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'ownershipShare', 'owner', 'tenant', 'commercialTenant', 'prescription'],
      personColumns: ['name', 'unit', 'role', 'ownershipShare', 'email', 'phone', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§1158-§1222', description: 'SVJ + bytové spoluvlastnictví' },
      { primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' },
      { primaryLaw: 'NOZ', paragraphs: '§1180', description: 'Vyšší příspěvek pro nebytové jednotky' },
      { primaryLaw: 'Zákon 235/2004', paragraphs: '', description: 'DPH — krácený odpočet' },
    ],
  },

  // ==================== COMMERCIAL_OFFICE ====================
  [PropertyType.COMMERCIAL_OFFICE]: {
    type: PropertyType.COMMERCIAL_OFFICE,
    category: 'COMMERCIAL',
    terminology: {
      unitOwnerLabel: 'Investor',
      tenantLabel: 'Nájemce',
      prescriptionLabel: 'Faktura',
      fundLabel: '-',
      assemblyLabel: '-',
      boardLabel: '-',
      leaseLabel: 'Lease Agreement',
    },
    features: {
      hasFundRepair: false,
      hasPrescriptions: false,
      hasSettlement: false,
      hasAssembly: false,
      hasPerRollam: false,
      hasBoard: false,
      hasResidentialLeases: false,
      hasCommercialLeases: true,
      hasServiceCharges: true,
      hasRentIndexation: true,
      hasLeaseEvents: true,
      hasVatTracking: true,
      hasDeposits: true,
      hasCooperativeShares: false,
      hasOwnershipShares: false,
      hasHelpdesk: true,
      hasWorkOrders: true,
      hasRevisions: true,
      hasMeters: true,
      hasPortal: true,
      hasFitOut: true,
      hasOccupancyTracking: true,
      hasCapexPlanning: true,
      hasCertifications: true,
      hasInvestmentKpis: true,
    },
    validation: {
      requiresIco: false,
      requiresCadastre: false,
      requiresBylaws: false,
      maxDepositMultiplier: null,  // smluvní volnost
      minNoticePeriodMonths: null, // dle smlouvy
    },
    ui: {
      badgeColor: '#64748B',
      badgeClasses: 'bg-slate-100 text-slate-800',
      icon: 'Landmark',
      shortLabel: 'KAN',
      label: 'Kancelářská budova',
      description: 'Komerční pronájem kancelářských prostor, lease management.',
      detailTabs: [
        'overview', 'units', 'leases', 'service-charges', 'finance',
        'helpdesk', 'work-orders', 'assets', 'revisions', 'meters',
        'documents', 'building-info', 'kpi', 'occupancy',
      ],
      unitColumns: ['name', 'floor', 'area', 'type', 'commercialTenant', 'rent', 'leaseExpiry', 'occupancy'],
      personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd'],
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' },
      { primaryLaw: 'Zákon 235/2004', paragraphs: '', description: 'DPH — komerční nájem zdanitelný' },
    ],
  },

  // ---- Zbylé typy (zkráceno — stejný pattern) ----

  [PropertyType.COMMERCIAL_RETAIL]: {
    type: PropertyType.COMMERCIAL_RETAIL, category: 'COMMERCIAL',
    terminology: { unitOwnerLabel: 'Investor', tenantLabel: 'Nájemce', prescriptionLabel: 'Faktura', fundLabel: '-', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Lease Agreement' },
    features: { hasFundRepair: false, hasPrescriptions: false, hasSettlement: false, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: false, hasCommercialLeases: true, hasServiceCharges: true, hasRentIndexation: true, hasLeaseEvents: true, hasVatTracking: true, hasDeposits: true, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true, hasRevisions: true, hasMeters: true, hasPortal: true, hasFitOut: true, hasOccupancyTracking: true, hasCapexPlanning: true, hasCertifications: true, hasInvestmentKpis: true },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: { badgeColor: '#F43F5E', badgeClasses: 'bg-rose-100 text-rose-800', icon: 'Store', shortLabel: 'OBC', label: 'Obchodní prostory', description: 'Retail, obchodní centrum, high-street.', detailTabs: ['overview', 'units', 'leases', 'service-charges', 'finance', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'building-info', 'kpi', 'occupancy'], unitColumns: ['name', 'floor', 'area', 'type', 'commercialTenant', 'rent', 'leaseExpiry', 'occupancy'], personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd'] },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' }],
  },

  [PropertyType.COMMERCIAL_WAREHOUSE]: {
    type: PropertyType.COMMERCIAL_WAREHOUSE, category: 'COMMERCIAL',
    terminology: { unitOwnerLabel: 'Investor', tenantLabel: 'Nájemce', prescriptionLabel: 'Faktura', fundLabel: '-', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Lease Agreement' },
    features: { hasFundRepair: false, hasPrescriptions: false, hasSettlement: false, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: false, hasCommercialLeases: true, hasServiceCharges: true, hasRentIndexation: true, hasLeaseEvents: true, hasVatTracking: true, hasDeposits: true, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true, hasRevisions: true, hasMeters: true, hasPortal: false, hasFitOut: false, hasOccupancyTracking: true, hasCapexPlanning: true, hasCertifications: false, hasInvestmentKpis: true },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: { badgeColor: '#71717A', badgeClasses: 'bg-zinc-100 text-zinc-800', icon: 'Warehouse', shortLabel: 'SKL', label: 'Sklad / logistika', description: 'Skladové a logistické prostory.', detailTabs: ['overview', 'units', 'leases', 'service-charges', 'finance', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'building-info', 'kpi', 'occupancy'], unitColumns: ['name', 'floor', 'area', 'type', 'commercialTenant', 'rent', 'leaseExpiry', 'occupancy'], personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd'] },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' }],
  },

  [PropertyType.COMMERCIAL_INDUSTRIAL]: {
    type: PropertyType.COMMERCIAL_INDUSTRIAL, category: 'COMMERCIAL',
    terminology: { unitOwnerLabel: 'Investor', tenantLabel: 'Nájemce', prescriptionLabel: 'Faktura', fundLabel: '-', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Lease Agreement' },
    features: { hasFundRepair: false, hasPrescriptions: false, hasSettlement: false, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: false, hasCommercialLeases: true, hasServiceCharges: true, hasRentIndexation: true, hasLeaseEvents: true, hasVatTracking: true, hasDeposits: true, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true, hasRevisions: true, hasMeters: true, hasPortal: false, hasFitOut: false, hasOccupancyTracking: true, hasCapexPlanning: true, hasCertifications: false, hasInvestmentKpis: true },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: { badgeColor: '#78716C', badgeClasses: 'bg-stone-100 text-stone-800', icon: 'Factory', shortLabel: 'PRŮ', label: 'Průmyslový objekt', description: 'Výrobní a průmyslové nemovitosti.', detailTabs: ['overview', 'units', 'leases', 'service-charges', 'finance', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'building-info', 'kpi', 'occupancy'], unitColumns: ['name', 'floor', 'area', 'type', 'commercialTenant', 'rent', 'leaseExpiry', 'occupancy'], personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd'] },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' }],
  },

  [PropertyType.RENTAL_MUNICIPAL]: {
    type: PropertyType.RENTAL_MUNICIPAL, category: 'RESIDENTIAL',
    terminology: { unitOwnerLabel: 'Obec', tenantLabel: 'Nájemník', prescriptionLabel: 'Nájemné', fundLabel: 'Fond údržby', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Nájemní smlouva' },
    features: { hasFundRepair: false, hasPrescriptions: true, hasSettlement: true, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: true, hasCommercialLeases: false, hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false, hasVatTracking: false, hasDeposits: true, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true, hasRevisions: true, hasMeters: true, hasPortal: true, hasFitOut: false, hasOccupancyTracking: true, hasCapexPlanning: false, hasCertifications: false, hasInvestmentKpis: false },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: { badgeColor: '#22C55E', badgeClasses: 'bg-green-100 text-green-800', icon: 'Landmark', shortLabel: 'OBC', label: 'Obecní bytový dům', description: 'Obec/město pronajímá byty, sociální nájmy.', detailTabs: ['overview', 'units', 'residents', 'finance', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'insurance', 'building-info', 'occupancy'], unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'tenant', 'rent', 'leaseExpiry', 'occupancy'], personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd', 'debt'] },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2235-§2301', description: 'Nájem bytu' }, { primaryLaw: 'Zákon 128/2000', paragraphs: '', description: 'Zákon o obcích' }],
  },

  [PropertyType.CONDO_NO_SVJ]: {
    type: PropertyType.CONDO_NO_SVJ, category: 'RESIDENTIAL',
    terminology: { unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník', prescriptionLabel: 'Příspěvek', fundLabel: 'Fond údržby', assemblyLabel: 'Schůzka vlastníků', boardLabel: '-', leaseLabel: 'Nájemní smlouva' },
    features: { hasFundRepair: true, hasPrescriptions: true, hasSettlement: true, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: true, hasCommercialLeases: false, hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false, hasVatTracking: false, hasDeposits: true, hasCooperativeShares: false, hasOwnershipShares: true, hasHelpdesk: true, hasWorkOrders: true, hasRevisions: true, hasMeters: true, hasPortal: true, hasFitOut: false, hasOccupancyTracking: false, hasCapexPlanning: false, hasCertifications: false, hasInvestmentKpis: false },
    validation: { requiresIco: false, requiresCadastre: true, requiresBylaws: false, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: { badgeColor: '#6366F1', badgeClasses: 'bg-indigo-100 text-indigo-800', icon: 'Building2', shortLabel: 'BEZ', label: 'Bytový dům bez SVJ', description: 'Vlastníci jednotek bez založeného SVJ.', detailTabs: ['overview', 'units', 'residents', 'finance', 'fund', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'building-info'], unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'ownershipShare', 'owner', 'tenant', 'prescription'], personColumns: ['name', 'unit', 'role', 'ownershipShare', 'email', 'phone', 'debt'] },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§1158-§1193', description: 'Bytové spoluvlastnictví (bez SVJ)' }],
  },

  [PropertyType.SINGLE_FAMILY]: {
    type: PropertyType.SINGLE_FAMILY, category: 'RESIDENTIAL',
    terminology: { unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník', prescriptionLabel: 'Nájemné', fundLabel: '-', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Nájemní smlouva' },
    features: { hasFundRepair: false, hasPrescriptions: false, hasSettlement: false, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: true, hasCommercialLeases: false, hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false, hasVatTracking: false, hasDeposits: true, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true, hasRevisions: true, hasMeters: true, hasPortal: false, hasFitOut: false, hasOccupancyTracking: false, hasCapexPlanning: false, hasCertifications: false, hasInvestmentKpis: false },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: { badgeColor: '#F97316', badgeClasses: 'bg-orange-100 text-orange-800', icon: 'Home', shortLabel: 'RD', label: 'Rodinný dům', description: 'Rodinný dům, případně pronajímaný.', detailTabs: ['overview', 'units', 'residents', 'finance', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'building-info'], unitColumns: ['name', 'area', 'type', 'tenant', 'rent'], personColumns: ['name', 'role', 'email', 'phone'] },
    legalReferences: [],
  },

  [PropertyType.PARKING]: {
    type: PropertyType.PARKING, category: 'SPECIAL',
    terminology: { unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemce', prescriptionLabel: 'Nájemné', fundLabel: '-', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Smlouva o parkování' },
    features: { hasFundRepair: false, hasPrescriptions: false, hasSettlement: false, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: false, hasCommercialLeases: true, hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false, hasVatTracking: true, hasDeposits: false, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: false, hasWorkOrders: true, hasRevisions: true, hasMeters: false, hasPortal: false, hasFitOut: false, hasOccupancyTracking: true, hasCapexPlanning: false, hasCertifications: false, hasInvestmentKpis: false },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: { badgeColor: '#06B6D4', badgeClasses: 'bg-cyan-100 text-cyan-800', icon: 'Car', shortLabel: 'GAR', label: 'Garáže / parking', description: 'Parkovací dům nebo garážová stání.', detailTabs: ['overview', 'units', 'finance', 'work-orders', 'revisions', 'documents', 'occupancy'], unitColumns: ['name', 'area', 'type', 'commercialTenant', 'rent', 'occupancy'], personColumns: ['name', 'unit', 'email', 'phone'] },
    legalReferences: [],
  },

  [PropertyType.LAND]: {
    type: PropertyType.LAND, category: 'SPECIAL',
    terminology: { unitOwnerLabel: 'Vlastník', tenantLabel: 'Pachtýř', prescriptionLabel: 'Pachtovné', fundLabel: '-', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Pachtovní smlouva' },
    features: { hasFundRepair: false, hasPrescriptions: false, hasSettlement: false, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: false, hasCommercialLeases: false, hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false, hasVatTracking: false, hasDeposits: false, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: false, hasWorkOrders: false, hasRevisions: false, hasMeters: false, hasPortal: false, hasFitOut: false, hasOccupancyTracking: false, hasCapexPlanning: false, hasCertifications: false, hasInvestmentKpis: false },
    validation: { requiresIco: false, requiresCadastre: true, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: { badgeColor: '#84CC16', badgeClasses: 'bg-lime-100 text-lime-800', icon: 'Map', shortLabel: 'POZ', label: 'Pozemek', description: 'Pozemek bez stavby.', detailTabs: ['overview', 'documents', 'building-info'], unitColumns: ['name', 'area'], personColumns: ['name', 'email', 'phone'] },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2332-§2357', description: 'Pacht' }],
  },

  [PropertyType.OTHER]: {
    type: PropertyType.OTHER, category: 'SPECIAL',
    terminology: { unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník', prescriptionLabel: 'Platba', fundLabel: '-', assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Smlouva' },
    features: { hasFundRepair: false, hasPrescriptions: true, hasSettlement: false, hasAssembly: false, hasPerRollam: false, hasBoard: false, hasResidentialLeases: false, hasCommercialLeases: false, hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false, hasVatTracking: false, hasDeposits: false, hasCooperativeShares: false, hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true, hasRevisions: true, hasMeters: true, hasPortal: false, hasFitOut: false, hasOccupancyTracking: false, hasCapexPlanning: false, hasCertifications: false, hasInvestmentKpis: false },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: { badgeColor: '#9CA3AF', badgeClasses: 'bg-gray-100 text-gray-800', icon: 'HelpCircle', shortLabel: 'JIN', label: 'Jiné', description: 'Ostatní typy nemovitostí.', detailTabs: ['overview', 'units', 'finance', 'helpdesk', 'work-orders', 'documents'], unitColumns: ['name', 'floor', 'area', 'type'], personColumns: ['name', 'email', 'phone'] },
    legalReferences: [],
  },
}

// ============================================================
// HELPER FUNKCE
// ============================================================

/** Získej konfiguraci pro daný typ */
export function getPropertyTypeConfig(type: PropertyType): PropertyTypeDefinition {
  return PROPERTY_TYPE_CONFIG[type] ?? PROPERTY_TYPE_CONFIG[PropertyType.OTHER]
}

/** Získej label pro typ */
export function getPropertyTypeLabel(type: PropertyType): string {
  return getPropertyTypeConfig(type).ui.label
}

/** Získej terminologii pro kontext */
export function getTerminology(type: PropertyType): PropertyTerminology {
  return getPropertyTypeConfig(type).terminology
}

/** Zjisti jestli typ má danou feature */
export function hasFeature(type: PropertyType, feature: keyof PropertyFeatures): boolean {
  return getPropertyTypeConfig(type).features[feature]
}

/** Filtruj typy podle kategorie */
export function getTypesByCategory(category: PropertyCategory): PropertyType[] {
  return Object.values(PROPERTY_TYPE_CONFIG)
    .filter(c => c.category === category)
    .map(c => c.type)
}

/** Všechny typy jako options pro select */
export function getPropertyTypeOptions(): Array<{ value: PropertyType; label: string; category: PropertyCategory }> {
  return Object.values(PROPERTY_TYPE_CONFIG).map(c => ({
    value: c.type,
    label: c.ui.label,
    category: c.category,
  }))
}
```

---

## Jak to UI komponenty konzumují

### PropertyDetailPage.tsx — dynamické taby

```tsx
import { getPropertyTypeConfig, hasFeature } from '@shared/property-type-config'

function PropertyDetailPage({ property }) {
  const config = getPropertyTypeConfig(property.type)

  return (
    <Tabs>
      {config.ui.detailTabs.map(tab => (
        <TabPanel key={tab} label={TAB_LABELS[tab]}>
          <TabContent tab={tab} property={property} />
        </TabPanel>
      ))}
    </Tabs>
  )
}
```

### ResidentsPage.tsx — dynamická terminologie

```tsx
import { getTerminology } from '@shared/property-type-config'

function ResidentsPage({ property }) {
  const terms = getTerminology(property.type)

  return (
    <PageHeader
      title={terms.unitOwnerLabel + 'é'}  // "Vlastníci" / "Členové družstva"
      addButtonLabel={'Přidat ' + terms.unitOwnerLabel.toLowerCase()}
    />
  )
}
```

### PropertyForm.tsx — dynamická validace

```tsx
import { getPropertyTypeConfig } from '@shared/property-type-config'

function PropertyForm({ type }) {
  const config = getPropertyTypeConfig(type)

  return (
    <Form>
      <Input name="name" required />
      {config.validation.requiresIco && (
        <Input name="ico" label="IČO" required />
      )}
      {config.validation.requiresBylaws && (
        <FileUpload name="bylaws" label="Stanovy" />
      )}
    </Form>
  )
}
```

### Sidebar / Navigation — dynamické menu

```tsx
function PropertySidebar({ property }) {
  const config = getPropertyTypeConfig(property.type)
  const { features } = config

  return (
    <nav>
      <MenuItem to="overview" label="Přehled" />
      <MenuItem to="units" label="Jednotky" />
      {features.hasFundRepair && <MenuItem to="fund" label={config.terminology.fundLabel} />}
      {features.hasAssembly && <MenuItem to="assembly" label={config.terminology.assemblyLabel} />}
      {features.hasCommercialLeases && <MenuItem to="leases" label="Nájemní smlouvy" />}
      {features.hasServiceCharges && <MenuItem to="service-charges" label="Service Charges" />}
      {features.hasInvestmentKpis && <MenuItem to="kpi" label="KPI Dashboard" />}
    </nav>
  )
}
```

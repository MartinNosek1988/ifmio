// ============================================================
// PROPERTY TYPE CONFIGURATION — Single Source of Truth
// ============================================================
// All domain knowledge (SVJ, BD, Rental, Commercial, Mixed-Use)
// is encoded HERE. UI components READ this config and adapt.
// ============================================================

// ── Enum ───────────────────────────────────────────────

export const PropertyType = {
  SVJ: 'SVJ',
  BD: 'BD',
  RENTAL_RESIDENTIAL: 'RENTAL_RESIDENTIAL',
  RENTAL_MUNICIPAL: 'RENTAL_MUNICIPAL',
  CONDO_NO_SVJ: 'CONDO_NO_SVJ',
  MIXED_USE: 'MIXED_USE',
  SINGLE_FAMILY: 'SINGLE_FAMILY',
  COMMERCIAL_OFFICE: 'COMMERCIAL_OFFICE',
  COMMERCIAL_RETAIL: 'COMMERCIAL_RETAIL',
  COMMERCIAL_WAREHOUSE: 'COMMERCIAL_WAREHOUSE',
  COMMERCIAL_INDUSTRIAL: 'COMMERCIAL_INDUSTRIAL',
  PARKING: 'PARKING',
  LAND: 'LAND',
  OTHER: 'OTHER',
} as const

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType]

// ── Types ──────────────────────────────────────────────

export type PropertyCategory = 'RESIDENTIAL' | 'COMMERCIAL' | 'SPECIAL'

export interface PropertyTerminology {
  unitOwnerLabel: string
  tenantLabel: string
  prescriptionLabel: string
  fundLabel: string
  assemblyLabel: string
  boardLabel: string
  leaseLabel: string
}

export interface PropertyFeatures {
  hasFundRepair: boolean
  hasPrescriptions: boolean
  hasSettlement: boolean
  hasAssembly: boolean
  hasPerRollam: boolean
  hasBoard: boolean
  hasResidentialLeases: boolean
  hasCommercialLeases: boolean
  hasServiceCharges: boolean
  hasRentIndexation: boolean
  hasLeaseEvents: boolean
  hasVatTracking: boolean
  hasDeposits: boolean
  hasCooperativeShares: boolean
  hasOwnershipShares: boolean
  hasHelpdesk: boolean
  hasWorkOrders: boolean
  hasRevisions: boolean
  hasMeters: boolean
  hasPortal: boolean
  hasFitOut: boolean
  hasOccupancyTracking: boolean
  hasCapexPlanning: boolean
  hasCertifications: boolean
  hasInvestmentKpis: boolean
}

export interface PropertyValidation {
  requiresIco: boolean
  requiresCadastre: boolean
  requiresBylaws: boolean
  maxDepositMultiplier: number | null
  minNoticePeriodMonths: number | null
}

export type PropertyDetailTab =
  | 'overview' | 'units' | 'residents' | 'finance' | 'fund'
  | 'leases' | 'service-charges' | 'settlement' | 'helpdesk'
  | 'work-orders' | 'assets' | 'revisions' | 'meters' | 'documents'
  | 'assembly' | 'board' | 'insurance' | 'building-info' | 'kpi' | 'occupancy'

export type UnitColumnId =
  | 'name' | 'floor' | 'area' | 'type' | 'disposition'
  | 'ownershipShare' | 'cooperativeShare'
  | 'owner' | 'member' | 'tenant' | 'commercialTenant'
  | 'rent' | 'prescription' | 'leaseExpiry' | 'occupancy'

export type PersonColumnId =
  | 'name' | 'unit' | 'role' | 'ownershipShare' | 'cooperativeShare'
  | 'email' | 'phone' | 'debt' | 'leaseStart' | 'leaseEnd'

export interface PropertyUiConfig {
  badgeColor: string
  icon: string
  shortLabel: string
  label: string
  description: string
  detailTabs: PropertyDetailTab[]
  unitColumns: UnitColumnId[]
  personColumns: PersonColumnId[]
}

export interface PropertyLegalReference {
  primaryLaw: string
  paragraphs: string
  description: string
}

export interface PropertyTypeDefinition {
  type: PropertyType
  category: PropertyCategory
  terminology: PropertyTerminology
  features: PropertyFeatures
  validation: PropertyValidation
  ui: PropertyUiConfig
  legalReferences: PropertyLegalReference[]
}

// ── Defaults ───────────────────────────────────────────

const RESIDENTIAL_FEATURES: PropertyFeatures = {
  hasFundRepair: false, hasPrescriptions: true, hasSettlement: true,
  hasAssembly: false, hasPerRollam: false, hasBoard: false,
  hasResidentialLeases: true, hasCommercialLeases: false,
  hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false,
  hasVatTracking: false, hasDeposits: true, hasCooperativeShares: false,
  hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true,
  hasRevisions: true, hasMeters: true, hasPortal: true, hasFitOut: false,
  hasOccupancyTracking: false, hasCapexPlanning: false,
  hasCertifications: false, hasInvestmentKpis: false,
}

const COMMERCIAL_FEATURES: PropertyFeatures = {
  hasFundRepair: false, hasPrescriptions: false, hasSettlement: false,
  hasAssembly: false, hasPerRollam: false, hasBoard: false,
  hasResidentialLeases: false, hasCommercialLeases: true,
  hasServiceCharges: true, hasRentIndexation: true, hasLeaseEvents: true,
  hasVatTracking: true, hasDeposits: true, hasCooperativeShares: false,
  hasOwnershipShares: false, hasHelpdesk: true, hasWorkOrders: true,
  hasRevisions: true, hasMeters: true, hasPortal: true, hasFitOut: true,
  hasOccupancyTracking: true, hasCapexPlanning: true,
  hasCertifications: true, hasInvestmentKpis: true,
}

const COMMERCIAL_TERMINOLOGY: PropertyTerminology = {
  unitOwnerLabel: 'Investor', tenantLabel: 'Nájemce',
  prescriptionLabel: 'Faktura', fundLabel: '-',
  assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Lease Agreement',
}

const COMMERCIAL_TABS: PropertyDetailTab[] = [
  'overview', 'units', 'leases', 'service-charges', 'finance',
  'helpdesk', 'work-orders', 'assets', 'revisions', 'meters',
  'documents', 'building-info', 'kpi', 'occupancy',
]

const COMMERCIAL_UNIT_COLS: UnitColumnId[] = ['name', 'floor', 'area', 'type', 'commercialTenant', 'rent', 'leaseExpiry', 'occupancy']
const COMMERCIAL_PERSON_COLS: PersonColumnId[] = ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd']

const COMMERCIAL_VALIDATION: PropertyValidation = {
  requiresIco: false, requiresCadastre: false, requiresBylaws: false,
  maxDepositMultiplier: null, minNoticePeriodMonths: null,
}

// ── Configuration ──────────────────────────────────────

export const PROPERTY_TYPE_CONFIG: Record<PropertyType, PropertyTypeDefinition> = {

  [PropertyType.SVJ]: {
    type: PropertyType.SVJ, category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník',
      prescriptionLabel: 'Předpis platby', fundLabel: 'Fond oprav',
      assemblyLabel: 'Shromáždění vlastníků', boardLabel: 'Výbor SVJ',
      leaseLabel: 'Nájemní smlouva',
    },
    features: {
      ...RESIDENTIAL_FEATURES,
      hasFundRepair: true, hasAssembly: true, hasPerRollam: true,
      hasBoard: true, hasOwnershipShares: true, hasResidentialLeases: true,
    },
    validation: { requiresIco: true, requiresCadastre: true, requiresBylaws: true, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: {
      badgeColor: '#0D9B8A', icon: 'Building2', shortLabel: 'SVJ',
      label: 'SVJ (Společenství vlastníků)', description: 'Bytový dům s vlastníky jednotek, fond oprav, shromáždění.',
      detailTabs: ['overview', 'units', 'residents', 'finance', 'fund', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'assembly', 'board', 'insurance', 'building-info'],
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

  [PropertyType.BD]: {
    type: PropertyType.BD, category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Člen družstva', tenantLabel: 'Podnájemník',
      prescriptionLabel: 'Předpis nájemného', fundLabel: 'Fond oprav',
      assemblyLabel: 'Členská schůze', boardLabel: 'Představenstvo',
      leaseLabel: 'Podnájemní smlouva',
    },
    features: {
      ...RESIDENTIAL_FEATURES,
      hasFundRepair: true, hasAssembly: true, hasPerRollam: true,
      hasBoard: true, hasResidentialLeases: false, hasCommercialLeases: true,
      hasVatTracking: true, hasCooperativeShares: true,
    },
    validation: { requiresIco: true, requiresCadastre: true, requiresBylaws: true, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: {
      badgeColor: '#3B82F6', icon: 'Building2', shortLabel: 'BD',
      label: 'Bytové družstvo', description: 'Družstvo vlastní dům, členové mají právo užívání.',
      detailTabs: ['overview', 'units', 'residents', 'finance', 'fund', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'assembly', 'board', 'insurance', 'building-info'],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'cooperativeShare', 'member', 'tenant', 'prescription'],
      personColumns: ['name', 'unit', 'role', 'cooperativeShare', 'email', 'phone', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'ZOK', paragraphs: '§727-§757', description: 'Bytová družstva' },
      { primaryLaw: 'NOZ', paragraphs: '§2235-§2301', description: 'Nájem bytu (členové BD)' },
    ],
  },

  [PropertyType.RENTAL_RESIDENTIAL]: {
    type: PropertyType.RENTAL_RESIDENTIAL, category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník domu', tenantLabel: 'Nájemník',
      prescriptionLabel: 'Nájemné', fundLabel: 'Fond údržby',
      assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Nájemní smlouva',
    },
    features: { ...RESIDENTIAL_FEATURES, hasOccupancyTracking: true },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: {
      badgeColor: '#A855F7', icon: 'Home', shortLabel: 'NÁJ',
      label: 'Nájemní bytový dům', description: 'Soukromý vlastník pronajímá byty nájemníkům.',
      detailTabs: ['overview', 'units', 'residents', 'finance', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'insurance', 'building-info', 'occupancy'],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'tenant', 'rent', 'leaseExpiry', 'occupancy'],
      personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§2235-§2301', description: 'Nájem bytu (chráněný)' },
      { primaryLaw: 'Zákon 67/2013', paragraphs: '', description: 'Služby spojené s bydlením' },
    ],
  },

  [PropertyType.RENTAL_MUNICIPAL]: {
    type: PropertyType.RENTAL_MUNICIPAL, category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Obec', tenantLabel: 'Nájemník',
      prescriptionLabel: 'Nájemné', fundLabel: 'Fond údržby',
      assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Nájemní smlouva',
    },
    features: { ...RESIDENTIAL_FEATURES, hasOccupancyTracking: true },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: {
      badgeColor: '#22C55E', icon: 'Landmark', shortLabel: 'OBC',
      label: 'Obecní bytový dům', description: 'Obec/město pronajímá byty, sociální nájmy.',
      detailTabs: ['overview', 'units', 'residents', 'finance', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'insurance', 'building-info', 'occupancy'],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'tenant', 'rent', 'leaseExpiry', 'occupancy'],
      personColumns: ['name', 'unit', 'role', 'email', 'phone', 'leaseStart', 'leaseEnd', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§2235-§2301', description: 'Nájem bytu' },
      { primaryLaw: 'Zákon 128/2000', paragraphs: '', description: 'Zákon o obcích' },
    ],
  },

  [PropertyType.CONDO_NO_SVJ]: {
    type: PropertyType.CONDO_NO_SVJ, category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník',
      prescriptionLabel: 'Příspěvek', fundLabel: 'Fond údržby',
      assemblyLabel: 'Schůzka vlastníků', boardLabel: '-', leaseLabel: 'Nájemní smlouva',
    },
    features: { ...RESIDENTIAL_FEATURES, hasFundRepair: true, hasOwnershipShares: true },
    validation: { requiresIco: false, requiresCadastre: true, requiresBylaws: false, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: {
      badgeColor: '#6366F1', icon: 'Building2', shortLabel: 'BEZ',
      label: 'Bytový dům bez SVJ', description: 'Vlastníci jednotek bez založeného SVJ.',
      detailTabs: ['overview', 'units', 'residents', 'finance', 'fund', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'building-info'],
      unitColumns: ['name', 'floor', 'area', 'type', 'disposition', 'ownershipShare', 'owner', 'tenant', 'prescription'],
      personColumns: ['name', 'unit', 'role', 'ownershipShare', 'email', 'phone', 'debt'],
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§1158-§1193', description: 'Bytové spoluvlastnictví (bez SVJ)' },
    ],
  },

  [PropertyType.MIXED_USE]: {
    type: PropertyType.MIXED_USE, category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník',
      prescriptionLabel: 'Předpis platby', fundLabel: 'Fond oprav',
      assemblyLabel: 'Shromáždění vlastníků', boardLabel: 'Výbor SVJ',
      leaseLabel: 'Nájemní smlouva',
    },
    features: {
      ...RESIDENTIAL_FEATURES,
      hasFundRepair: true, hasAssembly: true, hasPerRollam: true,
      hasBoard: true, hasOwnershipShares: true, hasCommercialLeases: true,
      hasServiceCharges: true, hasRentIndexation: true, hasLeaseEvents: true,
      hasVatTracking: true, hasFitOut: true, hasOccupancyTracking: true,
    },
    validation: { requiresIco: true, requiresCadastre: true, requiresBylaws: true, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: {
      badgeColor: '#F59E0B', icon: 'Building', shortLabel: 'MIX',
      label: 'Smíšený dům', description: 'Byty + komerční prostory pod jednou střechou.',
      detailTabs: ['overview', 'units', 'residents', 'finance', 'fund', 'leases', 'service-charges', 'settlement', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'assembly', 'board', 'insurance', 'building-info', 'occupancy'],
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

  [PropertyType.SINGLE_FAMILY]: {
    type: PropertyType.SINGLE_FAMILY, category: 'RESIDENTIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník',
      prescriptionLabel: 'Nájemné', fundLabel: '-',
      assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Nájemní smlouva',
    },
    features: { ...RESIDENTIAL_FEATURES, hasPrescriptions: false, hasSettlement: false },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: 3, minNoticePeriodMonths: 3 },
    ui: {
      badgeColor: '#F97316', icon: 'Home', shortLabel: 'RD',
      label: 'Rodinný dům', description: 'Rodinný dům, případně pronajímaný.',
      detailTabs: ['overview', 'units', 'residents', 'finance', 'helpdesk', 'work-orders', 'assets', 'revisions', 'meters', 'documents', 'building-info'],
      unitColumns: ['name', 'area', 'type', 'tenant', 'rent'],
      personColumns: ['name', 'role', 'email', 'phone'],
    },
    legalReferences: [],
  },

  [PropertyType.COMMERCIAL_OFFICE]: {
    type: PropertyType.COMMERCIAL_OFFICE, category: 'COMMERCIAL',
    terminology: COMMERCIAL_TERMINOLOGY,
    features: COMMERCIAL_FEATURES,
    validation: COMMERCIAL_VALIDATION,
    ui: {
      badgeColor: '#64748B', icon: 'Landmark', shortLabel: 'KAN',
      label: 'Kancelářská budova', description: 'Komerční pronájem kancelářských prostor, lease management.',
      detailTabs: COMMERCIAL_TABS, unitColumns: COMMERCIAL_UNIT_COLS, personColumns: COMMERCIAL_PERSON_COLS,
    },
    legalReferences: [
      { primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' },
      { primaryLaw: 'Zákon 235/2004', paragraphs: '', description: 'DPH — komerční nájem zdanitelný' },
    ],
  },

  [PropertyType.COMMERCIAL_RETAIL]: {
    type: PropertyType.COMMERCIAL_RETAIL, category: 'COMMERCIAL',
    terminology: COMMERCIAL_TERMINOLOGY,
    features: COMMERCIAL_FEATURES,
    validation: COMMERCIAL_VALIDATION,
    ui: {
      badgeColor: '#F43F5E', icon: 'Store', shortLabel: 'OBC',
      label: 'Obchodní prostory', description: 'Retail, obchodní centrum, high-street.',
      detailTabs: COMMERCIAL_TABS, unitColumns: COMMERCIAL_UNIT_COLS, personColumns: COMMERCIAL_PERSON_COLS,
    },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' }],
  },

  [PropertyType.COMMERCIAL_WAREHOUSE]: {
    type: PropertyType.COMMERCIAL_WAREHOUSE, category: 'COMMERCIAL',
    terminology: COMMERCIAL_TERMINOLOGY,
    features: { ...COMMERCIAL_FEATURES, hasPortal: false, hasFitOut: false },
    validation: COMMERCIAL_VALIDATION,
    ui: {
      badgeColor: '#71717A', icon: 'Warehouse', shortLabel: 'SKL',
      label: 'Sklad / logistika', description: 'Skladové a logistické prostory.',
      detailTabs: COMMERCIAL_TABS, unitColumns: COMMERCIAL_UNIT_COLS, personColumns: COMMERCIAL_PERSON_COLS,
    },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' }],
  },

  [PropertyType.COMMERCIAL_INDUSTRIAL]: {
    type: PropertyType.COMMERCIAL_INDUSTRIAL, category: 'COMMERCIAL',
    terminology: COMMERCIAL_TERMINOLOGY,
    features: { ...COMMERCIAL_FEATURES, hasPortal: false, hasFitOut: false },
    validation: COMMERCIAL_VALIDATION,
    ui: {
      badgeColor: '#78716C', icon: 'Factory', shortLabel: 'PRŮ',
      label: 'Průmyslový objekt', description: 'Výrobní a průmyslové nemovitosti.',
      detailTabs: COMMERCIAL_TABS, unitColumns: COMMERCIAL_UNIT_COLS, personColumns: COMMERCIAL_PERSON_COLS,
    },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2302-§2315', description: 'Nájem prostoru k podnikání' }],
  },

  [PropertyType.PARKING]: {
    type: PropertyType.PARKING, category: 'SPECIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemce',
      prescriptionLabel: 'Nájemné', fundLabel: '-',
      assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Smlouva o parkování',
    },
    features: {
      ...COMMERCIAL_FEATURES,
      hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false,
      hasPortal: false, hasFitOut: false, hasCapexPlanning: false,
      hasCertifications: false, hasInvestmentKpis: false, hasHelpdesk: false,
    },
    validation: COMMERCIAL_VALIDATION,
    ui: {
      badgeColor: '#06B6D4', icon: 'Car', shortLabel: 'GAR',
      label: 'Garáže / parking', description: 'Parkovací dům nebo garážová stání.',
      detailTabs: ['overview', 'units', 'finance', 'work-orders', 'revisions', 'documents', 'occupancy'],
      unitColumns: ['name', 'area', 'type', 'commercialTenant', 'rent', 'occupancy'],
      personColumns: ['name', 'unit', 'email', 'phone'],
    },
    legalReferences: [],
  },

  [PropertyType.LAND]: {
    type: PropertyType.LAND, category: 'SPECIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník', tenantLabel: 'Pachtýř',
      prescriptionLabel: 'Pachtovné', fundLabel: '-',
      assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Pachtovní smlouva',
    },
    features: {
      hasFundRepair: false, hasPrescriptions: false, hasSettlement: false,
      hasAssembly: false, hasPerRollam: false, hasBoard: false,
      hasResidentialLeases: false, hasCommercialLeases: false,
      hasServiceCharges: false, hasRentIndexation: false, hasLeaseEvents: false,
      hasVatTracking: false, hasDeposits: false, hasCooperativeShares: false,
      hasOwnershipShares: false, hasHelpdesk: false, hasWorkOrders: false,
      hasRevisions: false, hasMeters: false, hasPortal: false, hasFitOut: false,
      hasOccupancyTracking: false, hasCapexPlanning: false,
      hasCertifications: false, hasInvestmentKpis: false,
    },
    validation: { requiresIco: false, requiresCadastre: true, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: {
      badgeColor: '#84CC16', icon: 'Map', shortLabel: 'POZ',
      label: 'Pozemek', description: 'Pozemek bez stavby.',
      detailTabs: ['overview', 'documents', 'building-info'],
      unitColumns: ['name', 'area'],
      personColumns: ['name', 'email', 'phone'],
    },
    legalReferences: [{ primaryLaw: 'NOZ', paragraphs: '§2332-§2357', description: 'Pacht' }],
  },

  [PropertyType.OTHER]: {
    type: PropertyType.OTHER, category: 'SPECIAL',
    terminology: {
      unitOwnerLabel: 'Vlastník', tenantLabel: 'Nájemník',
      prescriptionLabel: 'Platba', fundLabel: '-',
      assemblyLabel: '-', boardLabel: '-', leaseLabel: 'Smlouva',
    },
    features: {
      ...RESIDENTIAL_FEATURES,
      hasPrescriptions: true, hasSettlement: false,
      hasResidentialLeases: false, hasDeposits: false,
    },
    validation: { requiresIco: false, requiresCadastre: false, requiresBylaws: false, maxDepositMultiplier: null, minNoticePeriodMonths: null },
    ui: {
      badgeColor: '#9CA3AF', icon: 'HelpCircle', shortLabel: 'JIN',
      label: 'Jiné', description: 'Ostatní typy nemovitostí.',
      detailTabs: ['overview', 'units', 'finance', 'helpdesk', 'work-orders', 'documents'],
      unitColumns: ['name', 'floor', 'area', 'type'],
      personColumns: ['name', 'email', 'phone'],
    },
    legalReferences: [],
  },
}

// ── Helpers ────────────────────────────────────────────

export function getPropertyTypeConfig(type: string): PropertyTypeDefinition {
  return PROPERTY_TYPE_CONFIG[type as PropertyType] ?? PROPERTY_TYPE_CONFIG[PropertyType.OTHER]
}

export function getPropertyTypeLabel(type: string): string {
  return getPropertyTypeConfig(type).ui.label
}

export function getTerminology(type: string): PropertyTerminology {
  return getPropertyTypeConfig(type).terminology
}

export function hasFeature(type: string, feature: keyof PropertyFeatures): boolean {
  return getPropertyTypeConfig(type).features[feature]
}

export function getTypesByCategory(category: PropertyCategory): PropertyType[] {
  return Object.values(PROPERTY_TYPE_CONFIG)
    .filter(c => c.category === category)
    .map(c => c.type)
}

export function getPropertyTypeOptions(): Array<{ value: PropertyType; label: string; category: PropertyCategory }> {
  return Object.values(PROPERTY_TYPE_CONFIG).map(c => ({
    value: c.type,
    label: c.ui.label,
    category: c.category,
  }))
}

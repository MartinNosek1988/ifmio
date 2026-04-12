export type SubjectType =
  | 'svj_bd'
  | 'spravce'
  | 'vlastnik_domu'
  | 'vlastnik_jednotky'
  | 'najemnik'
  | 'dodavatel';

export interface SubjectTypeOption {
  value: SubjectType;
  label: string;
  description: string;
  icon: string;
}

export const SUBJECT_TYPE_OPTIONS: SubjectTypeOption[] = [
  { value: 'svj_bd', label: 'register.subjectType.svjBd', description: 'register.subjectType.svjBdDesc', icon: 'LayoutGrid' },
  { value: 'spravce', label: 'register.subjectType.spravce', description: 'register.subjectType.spravceDesc', icon: 'Building2' },
  { value: 'vlastnik_domu', label: 'register.subjectType.vlastnikDomu', description: 'register.subjectType.vlastnikDomuDesc', icon: 'Home' },
  { value: 'vlastnik_jednotky', label: 'register.subjectType.vlastnikJednotky', description: 'register.subjectType.vlastnikJednotkyDesc', icon: 'KeyRound' },
  { value: 'najemnik', label: 'register.subjectType.najemnik', description: 'register.subjectType.najemnikDesc', icon: 'User' },
  { value: 'dodavatel', label: 'register.subjectType.dodavatel', description: 'register.subjectType.dodavatelDesc', icon: 'Wrench' },
];

export const SUPPLIER_CATEGORY_OPTIONS = [
  { value: 'instalater', label: 'register.supplier.cat.instalater' },
  { value: 'elektrikar', label: 'register.supplier.cat.elektrikar' },
  { value: 'zamecnik', label: 'register.supplier.cat.zamecnik' },
  { value: 'malir_naterac', label: 'register.supplier.cat.malirNaterac' },
  { value: 'revizni_technik', label: 'register.supplier.cat.revizniTechnik' },
  { value: 'ucetni', label: 'register.supplier.cat.ucetni' },
  { value: 'pravnik', label: 'register.supplier.cat.pravnik' },
  { value: 'uklid', label: 'register.supplier.cat.uklid' },
  { value: 'vytahy', label: 'register.supplier.cat.vytahy' },
  { value: 'pozarni_ochrana', label: 'register.supplier.cat.pozarniOchrana' },
  { value: 'zahradnik', label: 'register.supplier.cat.zahradnik' },
  { value: 'podlahar', label: 'register.supplier.cat.podlahar' },
  { value: 'zednicke_prace', label: 'register.supplier.cat.zednickePrace' },
  { value: 'pokryvac', label: 'register.supplier.cat.pokryvac' },
  { value: 'pest_control', label: 'register.supplier.cat.pestControl' },
  { value: 'projekce', label: 'register.supplier.cat.projekce' },
  { value: 'vymahani', label: 'register.supplier.cat.vymahani' },
  { value: 'zatepleni', label: 'register.supplier.cat.zatepleni' },
  { value: 'sprava_nemovitosti', label: 'register.supplier.cat.spravaNemovitosti' },
  { value: 'jine', label: 'register.supplier.cat.jine' },
] as const;

export const CZECH_REGIONS = [
  'Praha',
  'Středočeský kraj',
  'Jihočeský kraj',
  'Plzeňský kraj',
  'Karlovarský kraj',
  'Ústecký kraj',
  'Liberecký kraj',
  'Královéhradecký kraj',
  'Pardubický kraj',
  'Vysočina',
  'Jihomoravský kraj',
  'Olomoucký kraj',
  'Zlínský kraj',
  'Moravskoslezský kraj',
] as const;

export interface WizardStepConfig {
  id: string;
  label: string;
  icon: string;
}

export function getWizardSteps(subjectType: SubjectType | null): WizardStepConfig[] {
  const step1: WizardStepConfig = { id: 'subject-type', label: 'register.step.subjectType', icon: 'LayoutGrid' };
  if (!subjectType) return [step1];
  const stepDone: WizardStepConfig = { id: 'done', label: 'register.step.done', icon: 'Check' };
  switch (subjectType) {
    case 'svj_bd':
    case 'spravce':
      return [step1, { id: 'organization', label: 'register.step.organization', icon: 'FileText' }, { id: 'property', label: 'register.step.property', icon: 'Home' }, stepDone];
    case 'vlastnik_domu':
      return [step1, { id: 'personal', label: 'register.step.personal', icon: 'FileText' }, { id: 'property', label: 'register.step.property', icon: 'Home' }, stepDone];
    case 'vlastnik_jednotky':
      return [step1, { id: 'personal', label: 'register.step.personal', icon: 'FileText' }, { id: 'unit', label: 'register.step.unit', icon: 'Home' }, stepDone];
    case 'najemnik':
      return [step1, { id: 'personal', label: 'register.step.personal', icon: 'FileText' }, { id: 'address', label: 'register.step.address', icon: 'Home' }, stepDone];
    case 'dodavatel':
      return [step1, { id: 'supplier', label: 'register.step.supplier', icon: 'FileText' }, { id: 'region', label: 'register.step.region', icon: 'MapPin' }, stepDone];
  }
}

export interface RegisterWizardState {
  subjectType: SubjectType | null;
  name: string;
  email: string;
  password: string;
  phone: string;
  tenantName: string;
  ico: string;
  dic: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyPostalCode: string;
  propertyType: string;
  unitAddress: string;
  unitNumber: string;
  unitDisposition: string;
  joinCode: string;
  residenceAddress: string;
  residenceCity: string;
  residencePostalCode: string;
  tenantJoinCode: string;
  supplierCompanyName: string;
  supplierIsOsvc: boolean;
  supplierCategories: string[];
  supplierDescription: string;
  supplierRegionCity: string;
  supplierRegionRadius: number;
  supplierRegionDistricts: string[];
  consentAccepted: boolean;
}

export const INITIAL_WIZARD_STATE: RegisterWizardState = {
  subjectType: null,
  name: '',
  email: '',
  password: '',
  phone: '',
  tenantName: '',
  ico: '',
  dic: '',
  propertyName: '',
  propertyAddress: '',
  propertyCity: '',
  propertyPostalCode: '',
  propertyType: '',
  unitAddress: '',
  unitNumber: '',
  unitDisposition: '',
  joinCode: '',
  residenceAddress: '',
  residenceCity: '',
  residencePostalCode: '',
  tenantJoinCode: '',
  supplierCompanyName: '',
  supplierIsOsvc: false,
  supplierCategories: [],
  supplierDescription: '',
  supplierRegionCity: '',
  supplierRegionRadius: 50,
  supplierRegionDistricts: [],
  consentAccepted: false,
};

export type StepSetter = <K extends keyof RegisterWizardState>(key: K, value: RegisterWizardState[K]) => void;

export interface StepProps {
  form: RegisterWizardState;
  set: StepSetter;
  errors: Record<string, string>;
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1.5px solid #E5E7EB',
  background: '#fff',
  color: '#1A1A2E',
  fontSize: '.95rem',
  fontFamily: "'DM Sans', sans-serif",
  boxSizing: 'border-box',
  outline: 'none',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.85rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
};

export const errorStyle: React.CSSProperties = {
  color: '#DC2626',
  fontSize: '.78rem',
  marginTop: 4,
};

export function getRedirectPath(subjectType: SubjectType): string {
  switch (subjectType) {
    case 'svj_bd':
    case 'spravce':
    case 'vlastnik_domu':
      return '/dashboard';
    case 'vlastnik_jednotky':
    case 'najemnik':
      return '/portal';
    case 'dodavatel':
      return '/dashboard';
  }
}

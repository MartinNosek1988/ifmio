export const META = {
  title: 'ifmio | AI-native platforma pro správu nemovitostí',
  description: 'Automatizujte správu nemovitostí s AI asistentem Mio. Evidence, předpisy, revize, komunikace a finance — vše v jedné platformě.',
  brandName: 'ifmio',
  legalEntity: 'Grand Facility s.r.o.',
} as const;

export const COLORS = {
  primary: '#0D9488',
  accent: '#14B8A6',
  tealLight: '#5EEAD4',
  teal50: '#E6FFFA',
  dark: '#0C1222',
  darkSurface: '#1A2332',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
} as const;

export const NAV = {
  logoText: 'ifmio',
  links: [
    { label: 'Platforma', href: '#platforma' },
    { label: 'Funkce', href: '#funkce' },
    { label: 'Ceník', href: '#cenik' },
    { label: 'Reference', href: '#reference' },
    { label: 'Kontakt', href: '#kontakt' },
  ],
  ctaPrimary: 'Vyzkoušet demo',
  ctaSecondary: 'Přihlásit se',
} as const;

export const HERO = {
  badges: ['⚡ AI-native platforma', '✅ ISO 41001 ready'],
  h1: 'Správa nemovitostí bez papírování díky AI',
  subhead: 'Automatizujte rutinní úkony, získejte okamžitý přehled nad každou jednotkou a nechte Mio řešit opakující se úkoly — méně času na administrativu, více času na rozhodování.',
  ctaPrimary: {
    text: 'Vyzkoušet demo zdarma — 15 min',
    microcopy: 'Demo proběhne online; ukážeme konkrétní scénáře pro vaši správu.',
  },
  ctaSecondary: 'Kontaktovat obchod',
  trustLine: '200+ správců a SVJ v ČR důvěřuje ifmio',
  aboveFoldLogos: [
    { name: 'SVJ Sokolská 1883', placeholder: true },
    { name: 'BD Vinohrady', placeholder: true },
    { name: 'CPI Residential', placeholder: true },
  ],
} as const;

export const TRUST_BAR = {
  label: 'Důvěřuje nám více než 200 správců po celé ČR',
  logos: [
    'SVJ Sokolská 1883', 'BD Vinohrady', 'Residomo', 'RPG Byty',
    'CPI Property Group', 'Heimstaden', 'M&M Reality správa',
  ],
  scrollDurationSeconds: 30,
} as const;

export const FEATURES = [
  {
    id: 'mio-ai',
    icon: '🤖',
    title: 'Mio AI Asistent',
    benefit: 'Odpovídá nájemníkům 24/7 a snižuje zátěž podpory.',
    details: 'Chatbot v přirozeném jazyce, automatické šablony odpovědí, generování dokumentů a předpisů.',
    kpi: 'Typicky −50 % dotazů na podporu',
    ctaText: 'Prozkoumat Mio AI →',
  },
  {
    id: 'predpisy',
    icon: '📊',
    title: 'Automatické předpisy',
    benefit: 'Ušetří čas při fakturaci a předpisech bez ručního počítání.',
    details: 'Generování měsíčních předpisů podle evidence, měření a smluvních podmínek; export do ISDOC.',
    kpi: 'Až 80 % méně manuálních výpočtů',
    ctaText: 'Jak to funguje →',
  },
  {
    id: 'work-orders',
    icon: '🔧',
    title: 'Chytré pracovní příkazy',
    benefit: 'Rychlejší vyřízení závad a lepší koordinace techniků.',
    details: 'Automatické přiřazení techniků, foto dokumentace, stavové notifikace a fakturace opravy.',
    kpi: 'Typicky 3× rychlejší vyřízení',
    ctaText: 'Prozkoumat Work Orders →',
  },
  {
    id: 'komunikace',
    icon: '📧',
    title: 'Komunikační centrum',
    benefit: 'Všechny kanály na jednom místě, méně ztracených požadavků.',
    details: 'E-maily, SMS, datové schránky a nástěnka pro obyvatele; hromadné odesílání a šablony.',
    kpi: null,
    ctaText: 'Prozkoumat komunikaci →',
  },
  {
    id: 'compliance',
    icon: '⚖️',
    title: 'Revize a compliance (ISO 41001)',
    benefit: 'Minimalizujte riziko zmeškaných revizí a auditních nedostatků.',
    details: 'Automatické připomínky revizí, kontrolní listy, auditní stopy a reporty.',
    kpi: '0 zmeškaných revizních termínů',
    ctaText: 'Prozkoumat compliance →',
  },
  {
    id: 'finance',
    icon: '💰',
    title: 'Finance a reporting',
    benefit: 'Přehled cash flow a rychlé uzávěrky bez Excelu.',
    details: 'Faktury, bankovní transakce, DPH, reporting per nemovitost; exporty a integrace účetnictví.',
    kpi: '100 % přehled v reálném čase',
    ctaText: 'Prozkoumat finance →',
  },
] as const;

export const MID_CTA = {
  headline: 'Připraveni převést správu do digitální éry?',
  subhead: 'Podívejte se, jak Mio AI může změnit každodenní chod vaší správy nemovitostí.',
  cta: 'Podívat se na Mio v akci →',
} as const;

export const STATS = [
  { value: 80, suffix: ' %', label: 'méně času na administrativu' },
  { value: 3, suffix: '×', label: 'rychlejší vyřízení požadavků' },
  { value: 100, suffix: ' %', label: 'přehled nad nemovitostmi' },
  { value: 0, suffix: '', label: 'zmeškaných revizních termínů' },
] as const;

export const PLATFORM = {
  sectionLabel: 'PLATFORMA',
  headline: 'Vše, co potřebujete, na jednom místě',
  bullets: [
    { icon: '🏠', title: 'Evidence nemovitostí', desc: 'Domy, jednotky, katastrální data včetně vlastnických vztahů a omezení.' },
    { icon: '💰', title: 'Finance & doklady', desc: 'Faktury, předpisy, bankovní transakce, DPH, ISDOC import. Cash flow v reálném čase.' },
    { icon: '📅', title: 'Revize & údržba', desc: 'Automatické připomínky revizí TZB, plánovaná údržba. Nikdy nezmeškejte zákonný termín.' },
    { icon: '📱', title: 'Mobilní aplikace', desc: 'Pracovní příkazy, foto, QR sken měřičů, push notifikace. iOS i Android.' },
  ],
  ctaPrimary: 'Vyzkoušet demo →',
  ctaSecondary: 'Prozkoumat všechny moduly',
} as const;

export const CASE_STUDIES = [
  {
    client: 'SVJ Sokolská 1883',
    resultHeadline: '−20 hodin/týden administrativy',
    quote: 'Od nasazení ifmio nám odpadlo minimálně 20 hodin týdně ručního účtování. Předpisy se generují samy a nájemníci mají odpovědi dřív, než stihnu otevřít e-mail.',
    name: 'Jana Nováková',
    role: 'Předsedkyně SVJ',
    logoPlaceholder: true,
  },
  {
    client: 'BD Vinohrady',
    resultHeadline: '100 % přehled nad financemi',
    quote: 'Konečně máme jednu platformu místo pěti Excelů. Revize nám neunikají, technici ví co dělat a já vím, kde jsou peníze.',
    name: 'Martin Dvořák',
    role: 'Ředitel správy',
    logoPlaceholder: true,
  },
  {
    client: 'CPI Residential',
    resultHeadline: '50 % snížení dotazů na podpoře',
    quote: 'Mio AI nám ušetřil jednoho člověka na podpoře. Nájemníci se ptají chatbota a ten jim odpoví lépe než my přes telefon.',
    name: 'Petr Šimáček',
    role: 'Facility Manager',
    logoPlaceholder: true,
  },
] as const;

export const PRICING = {
  headline: 'Transparentní ceny bez skrytých poplatků',
  modelSummary: 'Platba za jednotku, ne za uživatele. Od 15 Kč/jednotka/měsíc včetně všech modulů a Mio AI.',
  tiers: [
    { name: 'Start', range: 'do 50 jednotek', price: 'Zdarma' },
    { name: 'Professional', range: '50–500 jednotek', price: '15 Kč/j./měs.' },
    { name: 'Enterprise', range: '500+ jednotek', price: 'Individuálně' },
  ],
  ctaPrimary: 'Zobrazit kompletní ceník →',
  ctaSecondary: 'Objednat demo',
} as const;

export const DEMO_FORM = {
  headline: 'Vyzkoušejte ifmio na vlastní kůži',
  subhead: 'Ukážeme vám, jak ifmio zjednoduší vaši správu. Demo trvá 15 minut a je zcela nezávazné.',
  submitButton: 'Objednat demo zdarma →',
  submitLoading: 'Odesílám…',
  successMessage: 'Děkujeme! Ozveme se vám do 24 hodin.',
  errorMessage: 'Něco se nepovedlo. Zkuste to prosím znovu, nebo nám napište na info@ifmio.com.',
  gdprCheckbox: 'Souhlasím se zpracováním osobních údajů dle Zásad ochrany soukromí.',
  reassurance: 'Bez závazků · Odpovíme do 24 hodin',
  benefitSidebar: [
    '15minutová ukázka přizpůsobená vašim potřebám',
    'Odpovědi na vaše otázky od produktového specialisty',
    'Ukázka AI asistenta Mio na reálných datech',
    'Cenová nabídka na míru',
  ],
  unitOptions: ['do 50', '50–200', '200–500', '500+', 'Nevím'],
} as const;

export const FINAL_CTA = {
  headline: 'Když vám na správě záleží',
  cta: 'Začít s ifmio zdarma →',
} as const;

export const FOOTER = {
  columns: [
    { title: 'Platforma', items: ['Evidence nemovitostí', 'Finance & doklady', 'Pracovní příkazy', 'Komunikace', 'Mio AI'] },
    { title: 'Funkce', items: ['Revize & TZB', 'Měření & odečty', 'Předpisy', 'Dokumenty', 'Reporting'] },
    { title: 'Společnost', items: ['O nás', 'Blog', 'Ceník', 'Kontakt', 'Kariéra'] },
  ],
  contact: {
    email: 'info@ifmio.com',
    phone: '+420 XXX XXX XXX',
    address: 'Praha, Česká republika',
  },
  copyright: '© 2026 Grand Facility s.r.o. Všechna práva vyhrazena.',
  socialLinks: ['LinkedIn', 'X (Twitter)'],
} as const;

export const CHAT_WIDGET = {
  greeting: 'Ahoj! Jsem Mio, váš AI asistent pro správu nemovitostí.',
  quickReplies: ['Chci demo', 'Kolik to stojí?', 'Jaké moduly máte?'],
  escalation: 'Chci mluvit s člověkem',
} as const;

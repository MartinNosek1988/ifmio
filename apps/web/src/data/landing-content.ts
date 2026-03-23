export const META = {
  title: 'ifmio | AI-native platforma pro správu nemovitostí',
  description: 'Automatizujte správu nemovitostí s AI asistentem Mio. Evidence, předpisy, revize, komunikace a finance — vše v jedné platformě.',
  brandName: 'ifmio',
  legalEntity: 'IFMIO Ltd.',
} as const

export const NAV = {
  logoText: 'ifmio',
  links: [
    { label: 'Ceník', href: '/cenik' },
    { label: 'Kontakt', href: '#kontakt' },
  ],
  ctaPrimary: 'Vyzkoušet demo',
  ctaSecondary: 'Přihlásit se',
  platformMenu: {
    title: 'Platforma',
    columns: [
      {
        title: 'SPRÁVA NEMOVITOSTÍ',
        items: [
          { icon: '🏠', title: 'Evidence nemovitostí', desc: 'Domy, jednotky, vlastníci' },
          { icon: '💰', title: 'Finance & doklady', desc: 'Faktury, banka, DPH' },
          { icon: '📊', title: 'Předpisy plateb', desc: 'Složky, generátor, SIPO' },
          { icon: '📒', title: 'Konto vlastníků', desc: 'Dluhy, přeplatky, upomínky' },
          { icon: '📧', title: 'Komunikace', desc: 'E-maily, SMS, nástěnka' },
        ],
      },
      {
        title: 'TECHNICKÁ SPRÁVA',
        items: [
          { icon: '🔧', title: 'Pracovní příkazy', desc: 'Helpdesk, technici, SLA' },
          { icon: '⚖️', title: 'Revize & TZB', desc: 'Připomínky, kontrolní listy' },
          { icon: '🔢', title: 'Měřidla & odečty', desc: 'Evidence, výměny, odečty' },
          { icon: '📄', title: 'Dokumenty', desc: 'Úložiště, kategorie, sdílení' },
          { icon: '📅', title: 'Vyúčtování', desc: 'Roční zúčtování, vyhláška 269' },
        ],
      },
      {
        title: 'AI A AUTOMATIZACE',
        items: [
          { icon: '🤖', title: 'Mio AI Asistent', desc: 'Chatbot, dokumenty, analýzy' },
          { icon: '🌐', title: 'Portál vlastníků', desc: 'Self-service, konto, hlášení' },
          { icon: '📈', title: 'Reporting', desc: 'Dashboardy, grafy, export' },
          { icon: '🗳️', title: 'Shromáždění SVJ', desc: 'Hlasování, per rollam, zápisy' },
          { icon: '📱', title: 'Mobilní aplikace', desc: 'iOS a Android pro techniky' },
        ],
      },
    ],
  },
  solutionsMenu: {
    title: 'Řešení',
    items: [
      { icon: '🏢', title: 'Pro SVJ', desc: 'Předpisy, konto vlastníků, shromáždění, fond oprav' },
      { icon: '🔑', title: 'Pro správce', desc: 'Správa portfolia nemovitostí, hromadné operace, reporting' },
      { icon: '⚙️', title: 'Pro facility management', desc: 'Helpdesk, pracovní příkazy, revize, SLA monitoring' },
      { icon: '🔧', title: 'Pro údržbu', desc: 'Mobilní appka pro techniky, QR kódy, foto dokumentace' },
      { icon: '📈', title: 'Pro investory', desc: 'Cash flow přehled, výnosnost, obsazenost, výkonnostní KPI' },
    ],
    sidebar: {
      label: 'Případová studie',
      quote: '„Od nasazení ifmio nám odpadlo 20 hodin týdně administrativy."',
      author: 'Jana Nováková, SVJ Sokolská',
    },
  },
  partnersMenu: {
    title: 'Partneři',
    columns: [
      {
        title: 'HLEDÁM SPRÁVCE',
        items: [
          { icon: '🏢', title: 'Najít správce nemovitostí', desc: 'Ověření profesionální správci' },
          { icon: '🔑', title: 'Najít facility managera', desc: 'Specialisté na FM' },
        ],
      },
      {
        title: 'HLEDÁM ŘEMESLNÍKA',
        items: [
          { icon: '🔧', title: 'Databáze řemeslníků', desc: 'Elektrikáři, instalatéři, zámečníci' },
          { icon: '⚡', title: 'Revizní technici', desc: 'Certifikovaní pro elektro, plyn, komíny' },
        ],
      },
    ],
    cta: { label: 'Staňte se partnerem ifmio', link: 'Registrovat se →' },
  },
} as const

export const HERO = {
  badges: ['⚡ AI-native platforma', '✅ ISO 41001 ready'],
  h1Before: 'Správa nemovitostí bez papírování ',
  h1Em: 'díky AI',
  subhead: 'Automatizujte rutinní úkony, získejte okamžitý přehled nad každou jednotkou a nechte Mio AI řešit opakující se úkoly — méně času na administrativu, více na rozhodování.',
  ctaPrimary: 'Vyzkoušet demo zdarma',
  ctaSecondary: 'Kontaktovat obchod',
} as const

export const TRUST_LINE = {
  text: 'Důvěřuje nám více než 5 600 vlastníků a nájemníků',
} as const

export const FEATURES = [
  { id: 'mio-ai', tag: '🤖 Mio AI Asistent', title: 'Váš virtuální správce, který nikdy nespí', desc: 'Odpovídá nájemníkům 24/7, generuje dokumenty, připravuje předpisy a analyzuje spotřebu — vše v přirozeném jazyce.', large: true },
  { id: 'predpisy', tag: '📊 Automatické předpisy', title: 'Předpisy bez ručního počítání', desc: 'Generuje měsíční předpisy z evidence, měření a smluvních podmínek. Export do ISDOC a hromadné odesílání.' },
  { id: 'work-orders', tag: '🔧 Pracovní příkazy', title: 'Od nahlášení po fakturaci', desc: 'Automatické přiřazení techniků, foto dokumentace, stavové notifikace. Kompletní lifecycle opravy.' },
  { id: 'komunikace', tag: '📧 Komunikační centrum', title: 'Všechny kanály na jednom místě', desc: 'E-maily, SMS, datové schránky a nástěnka. Hromadné odesílání a šablony.' },
  { id: 'compliance', tag: '⚖️ Revize & compliance', title: 'ISO 41001 vestavěný do platformy', desc: 'Automatické připomínky revizí, kontrolní listy a auditní stopy. 0 zmeškaných termínů.' },
  { id: 'finance', tag: '💰 Finance a reporting', title: 'Přehled cash flow a rychlé uzávěrky bez Excelu', desc: 'Faktury, bankovní transakce, DPH, konto vlastníků, dlužníci, vyúčtování. Pohoda XML export.', wide: true },
] as const

export const BENTO_STAT = { value: '80%', label: 'administrativy vyřízeno automaticky' } as const
export const BENTO_QUOTE = {
  text: '„Od nasazení ifmio nám odpadlo minimálně 20 hodin týdně ručního účtování."',
  name: 'Jana Nováková',
  initials: 'JN',
} as const

export const STATS = [
  { value: 80, suffix: ' %', label: 'méně času na administrativu' },
  { value: 3, suffix: '×', label: 'rychlejší vyřízení požadavků' },
  { value: 100, suffix: ' %', label: 'přehled nad nemovitostmi' },
  { value: 0, suffix: '', label: 'zmeškaných revizních termínů' },
] as const

export const PLATFORM = {
  sectionLabel: 'PLATFORMA',
  headline: 'Vše, co potřebujete, na jednom místě',
  tabs: ['Vše', 'Pro SVJ', 'Pro majitele', 'Pro správce', 'Pro nájemníky', 'Pro řemeslníky'],
  tabKeys: ['vse', 'svj', 'majitele', 'spravce', 'najemniky', 'remeslniky'],
  features: [
    { icon: '🏠', title: 'Evidence nemovitostí', desc: 'Domy, jednotky, katastrální data.', audiences: ['svj', 'majitele', 'spravce'] },
    { icon: '💰', title: 'Finance & doklady', desc: 'Faktury, předpisy, transakce, DPH, ISDOC, cash flow.', audiences: ['svj', 'majitele', 'spravce'] },
    { icon: '📊', title: 'Předpisy plateb', desc: 'Složky předpisu, automatický generátor, SIPO export.', audiences: ['svj', 'majitele', 'spravce'] },
    { icon: '📒', title: 'Konto vlastníků', desc: 'Pohyby, zůstatky, dlužníci, upomínky, zápočet přeplatků.', audiences: ['svj', 'spravce'] },
    { icon: '⚖️', title: 'Revize & TZB', desc: 'Automatické připomínky, kontrolní listy, auditní stopy.', audiences: ['svj', 'majitele', 'spravce', 'remeslniky'] },
    { icon: '🔧', title: 'Pracovní příkazy', desc: 'Helpdesk, přiřazení techniků, SLA, foto dokumentace.', audiences: ['svj', 'majitele', 'spravce', 'remeslniky'] },
    { icon: '📧', title: 'Komunikace', desc: 'E-maily, SMS, datové schránky, nástěnka, hromadné odesílání.', audiences: ['svj', 'majitele', 'spravce', 'najemniky'] },
    { icon: '🔢', title: 'Měřidla & odečty', desc: 'Evidence měřidel, výměny, odečty, hromadný import.', audiences: ['svj', 'spravce', 'najemniky'] },
    { icon: '📅', title: 'Vyúčtování', desc: 'Roční zúčtování záloh dle vyhlášky 269/2015.', audiences: ['svj', 'spravce'] },
    { icon: '🤖', title: 'Mio AI Asistent', desc: 'Chatbot 24/7, generování dokumentů, analýzy, odpovědi.', audiences: ['svj', 'majitele', 'spravce', 'najemniky'] },
    { icon: '🌐', title: 'Portál vlastníků', desc: 'Self-service konto, hlášení závad, dokumenty, hlasování.', audiences: ['svj', 'najemniky'] },
    { icon: '📈', title: 'Reporting', desc: 'Dashboardy, grafy, export CSV/PDF, KPI přehledy.', audiences: ['svj', 'majitele', 'spravce'] },
    { icon: '🗳️', title: 'Shromáždění SVJ', desc: 'Pozvánky, program, hlasování, per rollam, zápisy.', audiences: ['svj'] },
    { icon: '📱', title: 'Mobilní aplikace', desc: 'Pracovní příkazy, foto, QR sken, push notifikace.', audiences: ['spravce', 'remeslniky'] },
    { icon: '🏦', title: 'Bankovní napojení', desc: 'Fio API auto-sync, ABO/CSV import, párování dle VS.', audiences: ['svj', 'majitele', 'spravce'] },
    { icon: '📄', title: 'Dokumenty', desc: 'Úložiště dokumentů, kategorie, sdílení, vazba na nemovitosti.', audiences: ['svj', 'majitele', 'spravce', 'najemniky'] },
    { icon: '🔔', title: 'Hlášení závad', desc: 'Nahlášení problému, sledování stavu, notifikace.', audiences: ['najemniky'] },
    { icon: '📋', title: 'Přehled plateb', desc: 'Historie předpisů, plateb a nedoplatků.', audiences: ['najemniky'] },
    { icon: '⭐', title: 'Profil řemeslníka', desc: 'Databáze ověřených řemeslníků, hodnocení, certifikace.', audiences: ['remeslniky'] },
    { icon: '📆', title: 'Kalendář zakázek', desc: 'Plánování práce, příjem příkazů, fakturace.', audiences: ['remeslniky'] },
  ],
} as const

export const CASE_STUDIES = [
  { client: 'SVJ Sokolská', stat: '−20 hodin administrativy týdně', quote: '„Od nasazení ifmio nám odpadlo minimálně 20 hodin týdně ručního účtování. Předpisy se generují samy a Mio AI odpovídá nájemníkům dřív, než stihnu otevřít e-mail. Vyúčtování, které dříve trvalo 3 týdny, máme hotové za 2 dny."', name: 'Jana Nováková', role: 'Předsedkyně SVJ', initials: 'JN' },
  { client: 'BD Vinohrady', stat: '100% přehled nad 12 domy', quote: '„Konečně máme jednu platformu místo pěti Excelů a tří e-mailových schránek. Revize nám neunikají díky automatickým připomínkám, technici dostávají příkazy rovnou do mobilu a já vidím cash flow všech domů na jednom dashboardu."', name: 'Martin Dvořák', role: 'Ředitel správy', initials: 'MD' },
  { client: 'CPI Residential', stat: '50% méně dotazů na podpoře', quote: '„Mio AI nám ušetřil kapacitu jednoho plného úvazku na podpoře. Nájemníci se ptají chatbota na stav oprav, předpisy i pravidla domu — a dostávají odpovědi okamžitě. Bez složitých zásahů běží Mio AI samostatně a odlehčuje týmu."', name: 'Petr Šimáček', role: 'Facility Manager', initials: 'PŠ' },
  { client: 'Správa Letná', stat: '3× rychlejší vyřízení oprav', quote: '„Dříve jsme závady řešili přes telefon a papír — technik často nevěděl, kam jede a co ho čeká. S ifmio dostane příkaz s fotkou, lokací a historií. Průměrná doba vyřízení klesla ze 7 na 2 dny a reklamace se snížily o 40 %."', name: 'Lucie Králová', role: 'Provozní manažerka', initials: 'LK' },
] as const

export const FINAL_CTA = {
  headline: 'Když vám na správě záleží',
  cta: 'Vyzkoušet ifmio zdarma →',
} as const

export const FOOTER = {
  desc: 'AI-native platforma pro správu nemovitostí.',
  columns: [
    { title: 'Platforma', items: ['Mio AI', 'Evidence', 'Finance', 'Pracovní příkazy', 'Komunikace', 'Portál'] },
    { title: 'Funkce', items: ['Předpisy', 'Konto', 'Revize', 'Měření', 'Vyúčtování', 'Reporting'] },
    { title: 'Společnost', items: ['O nás', 'Blog', 'Kariéra', 'Partneři', 'Kontakt', 'Právní dokumenty'] },
  ],
  contact: { email: 'info@ifmio.com', phone: '+420 XXX XXX XXX', city: 'Praha' },
  copyright: '© 2026 IFMIO Ltd. Všechna práva vyhrazena.',
  socialLinks: ['in', '𝕏', 'f'],
} as const

export const CHAT_WIDGET = {
  greeting: 'Ahoj! Jsem Mio AI, váš asistent pro správu nemovitostí. Jak vám mohu pomoci?',
  quickReplies: ['Chci demo', 'Kolik to stojí?', 'Jaké moduly máte?', 'Mluvit s člověkem'],
  powered: 'powered by Mio AI',
} as const

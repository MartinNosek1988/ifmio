export interface PricingTier {
  name: string
  range: string
  price: string
  priceSuffix?: string
  note: string
  cta: string
  ctaStyle: 'primary' | 'ghost'
  featured?: boolean
  features: string[]
}

export interface AudiencePricing {
  key: string
  label: string
  description: string
  tiers: PricingTier[]
}

export const PRICING_HEADER = {
  title: 'Ceník ifmio',
  subtitle: 'Platba za jednotku, ne za uživatele. Všechny moduly v ceně. Bez skrytých poplatků.',
} as const

export const AUDIENCES: AudiencePricing[] = [
  {
    key: 'svj', label: 'Pro SVJ', description: 'Kompletní řešení pro společenství vlastníků jednotek',
    tiers: [
      { name: 'Start', range: 'do 50 jednotek', price: 'Zdarma', note: 'navždy, bez kreditky', cta: 'Začít zdarma', ctaStyle: 'ghost', features: ['Evidence domu a jednotek', 'Předpisy plateb (ruční)', 'Konto vlastníků (základní)', 'Shromáždění SVJ', 'Komunikace (e-mail)', 'Mio AI asistent (5 dotazů/den)', 'Portál vlastníků (read-only)', 'Dokumenty (1 GB)'] },
      { name: 'Professional', range: '50–500 jednotek', price: '15 Kč', priceSuffix: '/j./měs.', note: 'vše ze Start + rozšířené', cta: 'Vyzkoušet zdarma', ctaStyle: 'primary', featured: true, features: ['Vše ze Start', 'Automatický generátor předpisů', 'Složky předpisu (neomezené)', 'Dlužníci & automatické upomínky', 'Vyúčtování dle vyhlášky 269/2015', 'SIPO export pro Českou poštu', 'Fond oprav & počáteční stavy', 'Bankovní napojení (Fio API)', 'Párování plateb dle VS', 'Portál vlastníků (plný)', 'Pohoda XML export', 'Mio AI asistent (neomezený)', 'Hromadná komunikace (e-mail + SMS)', 'Reporting & dashboardy', 'Dokumenty (10 GB)'] },
      { name: 'Enterprise', range: '500+ jednotek', price: 'Individuálně', note: 'dedikovaná podpora + SLA', cta: 'Kontaktovat obchod', ctaStyle: 'ghost', features: ['Vše z Professional', 'Neomezený počet jednotek', 'Dedikovaný account manager', 'SLA garance 99.9%', 'API přístup & webhooks', 'Onboarding & migrace dat', 'Prioritní podpora (do 4h)', 'White-label portál', 'Dokumenty (neomezené)', 'Školení pro výbor SVJ'] },
    ],
  },
  {
    key: 'majitele', label: 'Pro majitele nemovitostí', description: 'Pro vlastníky bytů, domů a portfolií pronajímaných nemovitostí',
    tiers: [
      { name: 'Start', range: 'do 50 jednotek', price: 'Zdarma', note: 'navždy, bez kreditky', cta: 'Začít zdarma', ctaStyle: 'ghost', features: ['Evidence nemovitostí & bytů', 'Nájemní smlouvy', 'Předpisy nájemného (ruční)', 'Finance & doklady', 'Komunikace s nájemníky', 'Mio AI asistent (5 dotazů/den)', 'Dokumenty (1 GB)'] },
      { name: 'Professional', range: '50–500 jednotek', price: '15 Kč', priceSuffix: '/j./měs.', note: 'vše ze Start + rozšířené', cta: 'Vyzkoušet zdarma', ctaStyle: 'primary', featured: true, features: ['Vše ze Start', 'Automatické předpisy nájemného', 'Cash flow přehled v reálném čase', 'Dlužníci & automatické upomínky', 'Bankovní párování (Fio API)', 'Pohoda XML export', 'Portál nájemníků', 'Revize & plánovaná údržba', 'Pracovní příkazy', 'Měřidla & odečty', 'Mio AI asistent (neomezený)', 'Reporting & KPI dashboardy', 'Dokumenty (10 GB)'] },
      { name: 'Enterprise', range: '500+ jednotek', price: 'Individuálně', note: 'dedikovaná podpora', cta: 'Kontaktovat obchod', ctaStyle: 'ghost', features: ['Vše z Professional', 'Portfolio reporting', 'Výnosnost & obsazenost KPI', 'Multi-property dashboard', 'API přístup & webhooks', 'Dedikovaný account manager', 'Prioritní podpora', 'Dokumenty (neomezené)'] },
    ],
  },
  {
    key: 'spravce', label: 'Pro správce', description: 'Pro správcovské firmy a profesionální facility management',
    tiers: [
      { name: 'Start', range: 'do 50 jednotek', price: 'Zdarma', note: 'navždy, bez kreditky', cta: 'Začít zdarma', ctaStyle: 'ghost', features: ['Evidence nemovitostí & klientů', 'Předpisy & konto (základní)', 'Pracovní příkazy', 'Komunikace', 'Dokumenty (1 GB)', 'Mio AI asistent (5 dotazů/den)'] },
      { name: 'Professional', range: '50–500 jednotek', price: '15 Kč', priceSuffix: '/j./měs.', note: 'vše ze Start + rozšířené', cta: 'Vyzkoušet zdarma', ctaStyle: 'primary', featured: true, features: ['Vše ze Start', 'Multi-property správa', 'Hromadné operace', 'Automatický generátor předpisů', 'Vyúčtování & rozúčtování', 'SIPO & bankovní API', 'Portál vlastníků (plný)', 'Reporting & dashboardy', 'Pohoda & Money S3 export', 'Revize & TZB komplet', 'Měřidla & odečty', 'Mio AI asistent (neomezený)', 'Hromadná komunikace', 'Dokumenty (50 GB)'] },
      { name: 'Enterprise', range: '500+ jednotek', price: 'Individuálně', note: 'dedikovaná podpora + SLA', cta: 'Kontaktovat obchod', ctaStyle: 'ghost', features: ['Vše z Professional', 'Neomezené nemovitosti', 'White-label portál', 'API & webhooks', 'Dedikovaný account manager', 'SLA garance 99.9%', 'Migrace z Domsys/jiných systémů', 'Prioritní podpora (do 4h)', 'Školení pro tým', 'Dokumenty (neomezené)'] },
    ],
  },
  {
    key: 'najemnici', label: 'Pro nájemníky', description: 'Portál pro vlastníky bytů a nájemníky — zdarma v rámci plánu správce',
    tiers: [
      { name: 'Zdarma', range: 'v rámci správce Start', price: 'Zdarma', note: 'základní přístup', cta: '', ctaStyle: 'ghost', features: ['Přehled plateb & předpisů', 'Hlášení závad', 'Nástěnka & dokumenty', 'Komunikace se správcem', 'Odečty měřidel'] },
      { name: 'Plný přístup', range: 'v rámci správce Professional', price: 'Zdarma', note: 'rozšířený přístup', cta: '', ctaStyle: 'ghost', features: ['Vše ze základního', 'Online přehled konta', 'Historie plateb & nedoplatků', 'Push notifikace', 'Chat s Mio AI', 'Hlasování (per rollam)', 'Dokumenty ke stažení'] },
      { name: 'Jak to funguje?', range: '', price: '', note: 'Portál nájemníků je součástí plánu vašeho správce', cta: '', ctaStyle: 'ghost', features: ['Váš správce vám pošle pozvánku', 'Přihlásíte se přes e-mail nebo telefon', 'Vše je zdarma — platí váš správce', 'Funguje na počítači i mobilu'] },
    ],
  },
  {
    key: 'remeslnici', label: 'Pro řemeslníky', description: 'Pro řemeslníky, revizní techniky a servisní firmy',
    tiers: [
      { name: 'Základní', range: 'jednotlivec', price: 'Zdarma', note: 'základní profil', cta: 'Registrovat se', ctaStyle: 'ghost', features: ['Profil v databázi řemeslníků', 'Příjem pracovních příkazů', 'Foto dokumentace', 'Mobilní aplikace', 'Kalendář zakázek'] },
      { name: 'Profesionál', range: 'aktivní partner', price: '299 Kč', priceSuffix: '/měs.', note: 'rozšířené funkce', cta: 'Vyzkoušet zdarma', ctaStyle: 'primary', featured: true, features: ['Vše ze Základní', 'Přímé napojení na správce', 'Fakturace přes ifmio', 'Hodnocení & recenze (ověřené)', 'Push notifikace prioritní', 'Přednostní zobrazení v databázi', 'Statistiky & reporting zakázek'] },
      { name: 'Firma', range: '3+ technici', price: '199 Kč', priceSuffix: '/technik/měs.', note: 'multi-technik správa', cta: 'Kontaktovat obchod', ctaStyle: 'ghost', features: ['Vše z Profesionál', 'Multi-technik správa', 'Dispečink & přiřazování', 'Firemní profil & certifikace', 'API napojení na vlastní systém', 'Dedikovaná podpora'] },
    ],
  },
]

export const FAQ = [
  { q: 'Je ifmio opravdu zdarma do 50 jednotek?', a: 'Ano, plán Start je zdarma navždy pro správu do 50 jednotek. Nepotřebujete kreditní kartu a nemáme žádné skryté poplatky.' },
  { q: 'Co se počítá jako "jednotka"?', a: 'Jednotka je byt, nebytový prostor, garáž nebo sklep vedený v evidenci. Společné prostory se nepočítají.' },
  { q: 'Můžu přejít z jednoho plánu na druhý?', a: 'Ano, kdykoli. Upgrade je okamžitý, downgrade proběhne na konci fakturačního období.' },
  { q: 'Jak funguje platba?', a: 'Fakturujeme měsíčně na základě počtu aktivních jednotek. Platba převodem nebo kartou.' },
  { q: 'Je možná migrace dat z jiného systému?', a: 'Ano, v plánu Enterprise zajistíme kompletní migraci dat včetně historie. U plánu Professional pomůžeme s importem.' },
  { q: 'Jaká je dostupnost platformy?', a: 'Garantujeme 99.9% dostupnost v plánu Enterprise. Data jsou hostována v EU (Frankfurt).' },
] as const

export const BOTTOM_CTA = {
  headline: 'Nejste si jistí, který plán je pro vás?',
  subhead: 'Ukážeme vám ifmio na míru — demo trvá 15 minut a je zcela nezávazné.',
  cta: 'Objednat demo zdarma',
} as const

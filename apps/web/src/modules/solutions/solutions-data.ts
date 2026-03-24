export interface SolutionData {
  slug: string
  icon: string
  title: string
  subtitle: string
  benefits: Array<{ title: string; desc: string }>
  features: string[]
}

export const SOLUTIONS: SolutionData[] = [
  {
    slug: 'svj',
    icon: '🏢',
    title: 'ifmio pro společenství vlastníků',
    subtitle: 'Kompletní správa SVJ — od předpisů a vyúčtování po shromáždění a portál vlastníků.',
    benefits: [
      { title: 'Automatické předpisy', desc: 'Generátor měsíčních předpisů ze složek. SIPO export pro Českou poštu.' },
      { title: 'Konto vlastníků', desc: 'Přehled plateb, dluhů a přeplatků. Automatické upomínky.' },
      { title: 'Shromáždění SVJ', desc: 'Pozvánky, program, hlasování, per rollam. Vše online.' },
      { title: 'Mio AI Asistent', desc: 'Odpovídá vlastníkům 24/7 na dotazy o předpisech, revizích, pravidlech domu.' },
    ],
    features: ['Evidence domu a jednotek', 'Předpisy plateb s SIPO', 'Konto vlastníků', 'Vyúčtování dle vyhlášky 269', 'Shromáždění SVJ & per rollam', 'Fond oprav', 'Portál vlastníků', 'Bankovní napojení (Fio)', 'Komunikace (e-mail, SMS)', 'Mio AI asistent', 'Reporting', 'Dokumenty'],
  },
  {
    slug: 'spravce',
    icon: '🔑',
    title: 'ifmio pro správce nemovitostí',
    subtitle: 'Spravujte desítky domů z jednoho dashboardu. Hromadné operace, multi-property reporting.',
    benefits: [
      { title: 'Multi-property správa', desc: 'Jeden dashboard pro všechny nemovitosti. Přepínání kontextu jedním klikem.' },
      { title: 'Hromadné operace', desc: 'Generování předpisů, odesílání upomínek a reportů pro celé portfolio.' },
      { title: 'Pohoda & Money S3', desc: 'Export účetních dat do Pohoda XML a Money S3. Párování plateb dle VS.' },
      { title: 'Mio AI Asistent', desc: 'Delegujte rutinu na AI — odpovědi nájemníkům, generování dokumentů.' },
    ],
    features: ['Evidence nemovitostí & klientů', 'Multi-property dashboard', 'Automatické předpisy', 'Vyúčtování & rozúčtování', 'SIPO & bankovní API', 'Hromadné operace', 'Pracovní příkazy', 'Revize & TZB', 'Portál vlastníků', 'Pohoda & Money S3 export', 'Reporting & KPI', 'Mio AI asistent'],
  },
  {
    slug: 'facility-management',
    icon: '⚙️',
    title: 'ifmio pro facility management',
    subtitle: 'Helpdesk, pracovní příkazy, revize a SLA monitoring v jedné platformě.',
    benefits: [
      { title: 'Helpdesk & ticketing', desc: 'Příjem požadavků od nájemníků. Automatická kategorizace a přiřazení.' },
      { title: 'Pracovní příkazy', desc: 'Kompletní lifecycle opravy — od nahlášení po fakturaci s foto dokumentací.' },
      { title: 'Revize & compliance', desc: 'ISO 41001. Automatické připomínky termínů. Kontrolní listy.' },
      { title: 'SLA monitoring', desc: 'Sledování doby reakce a vyřízení. Eskalace při překročení limitu.' },
    ],
    features: ['Helpdesk & ticketing', 'Pracovní příkazy', 'SLA monitoring', 'Revize & TZB', 'ISO 41001 compliance', 'Mobilní aplikace', 'Foto dokumentace', 'Push notifikace', 'Reporting', 'Mio AI asistent'],
  },
  {
    slug: 'udrzba',
    icon: '🔧',
    title: 'ifmio pro údržbu a techniky',
    subtitle: 'Mobilní appka pro techniky v terénu. Pracovní příkazy, QR kódy, foto a push notifikace.',
    benefits: [
      { title: 'Mobilní aplikace', desc: 'iOS a Android. Příjem příkazů, foto dokumentace, QR sken měřidel.' },
      { title: 'QR kódy', desc: 'Naskenujte QR kód na měřidle nebo zařízení — zobrazí historii a stav.' },
      { title: 'Push notifikace', desc: 'Okamžité upozornění na nové příkazy, změny priorit a termíny.' },
      { title: 'Offline režim', desc: 'Pracujte i bez internetu. Data se synchronizují po připojení.' },
    ],
    features: ['Mobilní aplikace (iOS/Android)', 'Pracovní příkazy', 'QR sken měřidel', 'Foto dokumentace', 'Push notifikace', 'Offline režim', 'Kalendář zakázek', 'Historie oprav'],
  },
  {
    slug: 'investori',
    icon: '📈',
    title: 'ifmio pro investory do nemovitostí',
    subtitle: 'Cash flow přehled, výnosnost a obsazenost vašeho portfolia v reálném čase.',
    benefits: [
      { title: 'Portfolio dashboard', desc: 'Přehled všech nemovitostí na jednom místě. Výnosnost, obsazenost, cash flow.' },
      { title: 'KPI & reporting', desc: 'Automatické výpočty výnosnosti, průměrného nájmu, doby neobsazenosti.' },
      { title: 'Cash flow analýza', desc: 'Příjmy vs. náklady per nemovitost. Prognózy a trendy.' },
      { title: 'Delegace správy', desc: 'Přidělte správce nebo FM firmu. Sledujte jejich výkon.' },
    ],
    features: ['Portfolio dashboard', 'Cash flow v reálném čase', 'Výnosnost & obsazenost KPI', 'Multi-property reporting', 'Delegace správy', 'Bankovní napojení', 'Dokumenty', 'Mio AI asistent'],
  },
]

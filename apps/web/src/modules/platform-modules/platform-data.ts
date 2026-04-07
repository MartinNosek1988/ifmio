export interface PlatformModuleData {
  slug: string
  icon: string      // Lucide icon name or emoji for Mio AI
  title: string
  subtitle: string
  features: string[]
}

export const PLATFORM_MODULES: PlatformModuleData[] = [
  { slug: 'evidence', icon: 'Building2', title: 'Evidence nemovitostí', subtitle: 'Centrální evidence domů, jednotek, vlastníků a katastrálních dat.', features: ['Domy a bytové domy', 'Jednotky (byty, nebytové, garáže, sklepy)', 'Vlastnické vztahy', 'Katastrální data (ČÚZK import)', 'Společné prostory', 'Plochy a koeficienty'] },
  { slug: 'finance', icon: 'Receipt', title: 'Finance & doklady', subtitle: 'Kompletní finanční správa — faktury, DPH, bankovní transakce a ISDOC import.', features: ['Evidence faktur', 'DPH výpočty', 'ISDOC 6.0 import', 'Bankovní transakce', 'Cash flow přehled', 'Pohoda XML export'] },
  { slug: 'predpisy', icon: 'FileText', title: 'Předpisy plateb', subtitle: 'Automatický generátor měsíčních předpisů ze složek předpisu.', features: ['Složky předpisu', 'Automatický generátor', 'SIPO export', 'Hromadné odesílání', 'Historie předpisů', 'DPH per řádek předpisu'] },
  { slug: 'konto', icon: 'Wallet', title: 'Konto vlastníků', subtitle: 'Přehled pohybů, zůstatků, dluhů a přeplatků pro každého vlastníka.', features: ['Pohyby a zůstatky', 'Dlužníci', 'Automatické upomínky', 'Zápočet přeplatků', 'Počáteční stavy', 'Historie'] },
  { slug: 'revize', icon: 'ClipboardCheck', title: 'Revize & TZB', subtitle: 'Automatické připomínky revizních termínů a kontrolní listy.', features: ['Evidence TZB zařízení', 'Revizní termíny', 'Automatické připomínky', 'Kontrolní listy', 'ISO 41001', 'Auditní stopy'] },
  { slug: 'pracovni-prikazy', icon: 'Wrench', title: 'Pracovní příkazy', subtitle: 'Od nahlášení závady po fakturaci — kompletní lifecycle opravy.', features: ['Helpdesk ticketing', 'Přiřazení techniků', 'SLA monitoring', 'Foto dokumentace', 'Stavové notifikace', 'Mobilní aplikace'] },
  { slug: 'komunikace', icon: 'MessageSquare', title: 'Komunikace', subtitle: 'E-maily, SMS, datové schránky a nástěnka na jednom místě.', features: ['E-mailové šablony', 'Hromadné odesílání', 'SMS brána', 'Nástěnka pro obyvatele', 'Historie komunikace', 'Datové schránky (plán)'] },
  { slug: 'meridla', icon: 'Gauge', title: 'Měřidla & odečty', subtitle: 'Evidence měřidel, výměny a odečty hodnot.', features: ['Evidence měřidel', 'QR kódy', 'Odečty hodnot', 'Výměny měřidel', 'Hromadný import', 'Historie odečtů'] },
  { slug: 'vyuctovani', icon: 'FileCheck', title: 'Vyúčtování', subtitle: 'Roční zúčtování záloh dle vyhlášky 269/2015.', features: ['Vytápění a TUV', 'Studená voda', 'Společná elektřina', 'Výtah a úklid', 'Fond oprav', 'Export PDF'] },
  { slug: 'mio-ai', icon: '🤖', title: 'Mio AI Asistent', subtitle: 'Váš virtuální správce — chatbot 24/7, dokumenty, analýzy.', features: ['Chatbot v přirozeném jazyce', 'Generování dokumentů', 'Analýzy spotřeby', 'Odpovědi nájemníkům', 'Eskalace na operátora', 'Znalostní báze'] },
  { slug: 'portal', icon: 'Users', title: 'Portál vlastníků', subtitle: 'Self-service portál pro vlastníky a nájemníky.', features: ['Přehled konta', 'Hlášení závad', 'Dokumenty ke stažení', 'Hlasování (per rollam)', 'Odečty měřidel', 'Komunikace se správcem'] },
  { slug: 'reporting', icon: 'BarChart3', title: 'Reporting', subtitle: 'Dashboardy, grafy a automatické reporty.', features: ['Finanční dashboardy', 'Obsazenost & výnosnost', 'Revizní přehled', 'Export CSV/PDF', 'Vlastní filtry', 'Interaktivní grafy'] },
  { slug: 'shromazdeni', icon: 'CalendarCheck', title: 'Shromáždění SVJ', subtitle: 'Online hlasování, per rollam a zápisy ze shromáždění.', features: ['Pozvánky s programem', 'Prezenční listina', 'Hlasování', 'Per rollam hlasování', 'Zápisy', 'Archiv'] },
  { slug: 'mobilni-aplikace', icon: 'Smartphone', title: 'Mobilní aplikace', subtitle: 'Pracovní příkazy, foto a QR sken pro techniky v terénu.', features: ['iOS a Android', 'Pracovní příkazy', 'QR sken měřidel', 'Foto dokumentace', 'Push notifikace', 'Offline režim'] },
  { slug: 'banka', icon: 'Landmark', title: 'Bankovní napojení', subtitle: 'Automatická synchronizace s Fio bankou a import výpisů.', features: ['Fio API auto-sync', 'ABO/CSV import', 'Párování plateb dle VS', 'Multi-účet podpora', 'Historie transakcí', 'Denní synchronizace'] },
]

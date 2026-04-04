# IFMIO – Bytový dům nájemní: Doménový model

> Verze: 1.0 | 2026-04-04 | Zdroj pravdy pro implementaci nájemního domu v ifmio
> Companion dokument k SVJ a BD domain modelům

---

## 1. Co je nájemní bytový dům

Bytový dům v soukromém vlastnictví, kde vlastník (fyzická nebo právnická osoba) pronajímá byty nájemníkům. Na rozdíl od SVJ a BD zde NEEXISTUJE žádná speciální právnická osoba pro správu — vlastník rozhoduje sám.

### Zásadní rozdíl od SVJ a BD:

| | SVJ | BD | Nájemní dům |
|---|-----|-----|-------------|
| Vlastník bytů | Každý vlastník svůj byt | Družstvo celý dům | 1 vlastník celý dům |
| Právnická osoba | SVJ (forma 145) | BD (forma 110) | Žádná speciální |
| Rozhodování | Shromáždění (dle podílů) | Členská schůze (1=1) | Vlastník sám |
| Nájemníci | Volitelně (vlastník pronajímá) | Členové BD (povinně) | Všichni (účel domu) |
| Registr | Rejstřík SVJ | Obchodní rejstřík | Žádný speciální |
| V katastru | N × LV per jednotka | 1 LV na BD | 1 LV na vlastníka |

---

## 2. Kdo je vlastníkem

### 2.1 Varianty vlastnictví

**A) Fyzická osoba (FO) — jednotlivec**
- Nejjednodušší forma
- Příjmy z nájmu: §9 ZDP (příjmy z nájmu) nebo §7 (pokud podniká)
- Paušální výdaje 30 % nebo skutečné výdaje
- Odpisy budovy: 30 let (odpisová skupina 5)
- Zdravotní a sociální pojištění: NE (§9 ZDP = pasivní příjem)
- Obvykle 1-3 domy, self-managed nebo s malým správcem

**B) Společné jmění manželů (SJM)**
- Oba manželé spoluvlastní
- V katastru: oba na LV se zkratkou SJM
- Daní jeden z manželů (dohoda)
- Běžné u menších domů

**C) Podílové spoluvlastnictví**
- 2+ vlastníci s definovanými podíly (1/2, 1/3...)
- V katastru: všichni na LV s podíly
- Příjmy a výdaje dle podílů
- Rozhodování: nadpoloviční většina podílů (běžná správa), 2/3 (významná záležitost)
- Komplikované — často vede k založení SVJ nebo s.r.o.

**D) s.r.o. / a.s. (právnická osoba) — nejčastější u investorů**
- Společnost vlastní dům jako svůj majetek
- ARES: forma 112 (s.r.o.) nebo 121 (a.s.)
- Daň: DPPO 19 % (21 % od 2024)
- Odpisy: součástí nákladů firmy
- DPH: pokud obrat > 2 mil Kč → plátce (nájem bytů osvobozen, nebytových s DPH)
- Obvyklé u: developerů, investičních skupin, family offices
- Výhoda: oddělení osobního a podnikatelského majetku, lepší daňová optimalizace

**E) Fond / REIT / investiční skupina**
- Nemovitostní fond (dle zákona o investičních společnostech)
- Více domů v portfoliu
- Profesionální asset management + property management
- Obvykle komerční nemovitosti, ale i rezidenční (build-to-rent)

**F) Obec / město / stát**
- Obecní bytový fond
- Specifická pravidla (zákon o obcích, veřejné zakázky)
- Sociální nájmy, regulované nájemné
- Viz samostatný typ: Bytový dům — Obecní

### 2.2 V katastru nemovitostí

Na rozdíl od SVJ: dům je na JEDNOM listu vlastnictví jako CELEK. Jednotlivé byty NEJSOU v katastru jako samostatné jednotky (pokud nebylo vytvořeno prohlášení vlastníka).

| Situace | V katastru |
|---------|-----------|
| FO vlastní celý dům | 1 LV, vlastník = FO, objekt = budova + pozemek |
| SJM | 1 LV, vlastníci = oba manželé (SJM) |
| Spoluvlastnictví | 1 LV, vlastníci = A (1/2), B (1/4), C (1/4) |
| s.r.o. vlastní | 1 LV, vlastník = XY Reality s.r.o. (IČO) |
| S prohlášením vlastníka | N × LV per jednotka + LV bytové spoluvlastnictví (= de facto SVJ) |

**Důležité:** Pokud vlastník vytvoří prohlášení vlastníka a vymezí jednotky v katastru → dům se fakticky stává SVJ domem (při splnění podmínek pro vznik SVJ). Nájemní dům je tedy dům BEZ vymezených jednotek v katastru.

---

## 3. Nájemní vztahy

### 3.1 Nájemní smlouva (NOZ §2235-§2301)

| Náležitost | Detail | Povinnost |
|------------|--------|-----------|
| Označení bytu | Číslo bytu, podlaží, dispozice, plocha | Povinné |
| Pronajímatel | Jméno/firma, adresa, IČO | Povinné |
| Nájemce | Jméno, datum narození, trvalý pobyt | Povinné |
| Doba nájmu | Určitá (max. nemá) / neurčitá | Povinné |
| Nájemné | Výše v Kč/měs, splatnost | Povinné |
| Služby | Výčet služeb, zálohy, rozúčtování | Doporučené |
| Kauce (jistota) | Max. 3× měsíční nájemné | Volitelné |
| Popis stavu bytu | Předávací protokol | Doporučené |
| Členové domácnosti | Seznam osob v bytě | Doporučené |
| Forma | Písemná (NUTNÁ pro nájem bytu) | Povinné |

**Zákonná ochrana nájemce (silná!):**
- Nájemce je SLABŠÍ STRANA — zákon chrání jeho práva
- Nelze sjednat smluvní pokutu
- Nelze zkrátit nájemcova zákonná práva
- Nájemce může v bytě chovat zvíře (pokud nepřiměřeně neobtěžuje)
- Nájemce může v bytě pracovat/podnikat (pokud nezatěžuje dům)
- Při změně vlastníka domu přechází nájem na nového vlastníka
- Výpovědní lhůta: min. 3 měsíce (i u smlouvy na dobu určitou)

### 3.2 Doba nájmu

**Neurčitá doba** (nejčastější):
- Trvá dokud neskončí výpovědí nebo dohodou
- Výpovědní lhůta: 3 měsíce
- Pronajímatel může vypovědět JEN ze zákonných důvodů (NOZ §2288)

**Určitá doba:**
- Sjednaná na konkrétní období (1 rok, 2 roky...)
- Automatické prodloužení: pokud nájemce pokračuje v užívání > 3 měsíce a pronajímatel nevyzve k opuštění → prodlužuje se za stejných podmínek (max. na 2 roky)
- Pronajímatel může vypovědět jen ze zákonných důvodů

**Výpovědní důvody pronajímatele (NOZ §2288):**
- Hrubé porušení povinností nájemcem
- Odsouzení nájemce za úmyslný trestný čin proti pronajímateli/domu
- Byt má být vyklizen kvůli veřejnému zájmu (nelze po pronajímateli spravedlivě požadovat)
- Jiný závažný důvod pro vypovězení
- **S 3měsíční výpovědní lhůtou:** pokud pronajímatel potřebuje byt pro sebe/rodinného příslušníka

### 3.3 Nájemné

**Tržní nájemné:** Výše dle dohody stran (svobodná tvorba ceny). V Praze: typicky 250-450 Kč/m²/měs (2024).

**Zvyšování nájemného (NOZ §2249):**
- Pokud neupraveno ve smlouvě: pronajímatel může navrhnout zvýšení
- Max. o 20 % za 3 roky
- Do výše srovnatelného nájemného v místě (dle cenové mapy nebo znaleckého posudku)
- Nájemce musí souhlasit, jinak rozhodne soud
- Inflační doložka: lze sjednat ve smlouvě (CPI indexace)

**Srovnatelné nájemné:** NV 453/2013 Sb. — znalecký posudek nebo cenová mapa místně obvyklého nájemného.

### 3.4 Kauce / jistota (NOZ §2254)

- Max. 3× měsíční nájemné (dříve 6×)
- Pronajímatel ji uloží na účet a úročí (nebo kompenzuje úrokem)
- Vrací se při skončení nájmu po odečtení dluhů
- Nájemce může započíst kauci proti posledním nájmům (pokud smlouva nezakazuje)

### 3.5 Předávací protokol

| Kdy | Co obsahuje |
|-----|------------|
| Nastěhování | Stav bytu (stěny, podlahy, okna, zařízení), stav měřidel, seznam klíčů, foto dokumentace |
| Vystěhování | Porovnání se stavem při nastěhování, odečet měřidel, poškození, klíče zpět |
| Vyúčtování | Přeplatky/nedoplatky služeb, vrácení kauce po odečtení |

---

## 4. Finance nájemního domu

### 4.1 Příjmy vlastníka

| Zdroj | Detail |
|-------|--------|
| Nájemné z bytů | Hlavní příjem. Tržní cena. |
| Nájemné z nebytových prostor | Komerční nájem (obchody, kanceláře v přízemí) |
| Zálohy na služby | Průtokové — vybírá od nájemníků, platí dodavatelům |
| Příjmy z reklamy | Reklamní plochy na fasádě |

### 4.2 Výdaje vlastníka

| Kategorie | Příklady | Kdo platí |
|-----------|---------|-----------|
| Opravy a údržba budovy | Střecha, fasáda, stoupačky, kotelna | Vlastník |
| Běžná údržba SČ | Úklid, zahrada, deratizace | Vlastník (přeúčtovatelné nájemníkům jako služba) |
| Drobné opravy v bytě | Dle NV 308/2015 Sb. do 1 000 Kč/oprava | Nájemce |
| Revize | Elektro, plyn, komíny, výtahy, hromosvody | Vlastník |
| Pojištění | Budova, odpovědnost | Vlastník |
| Daň z nemovitosti | Roční | Vlastník |
| Odpisy budovy | 30 let, odpisová skupina 5 | Vlastník (daňový náklad) |
| Správa | Správcovská firma nebo vlastní práce | Vlastník |
| Energie SČ | Osvětlení chodeb, výtah | Vlastník (přeúčtovatelné) |
| Pojištění nájemníků | Pojištění odpovědnosti nájemce | Nájemce (vlastní) |

### 4.3 Služby spojené s nájmem (zákon 67/2013 Sb.)

**Co jsou služby:**
- Dodávka tepla a centralizované zásobování teplou vodou
- Dodávka studené vody a odvádění odpadních vod
- Provoz výtahu
- Osvětlení společných prostor
- Úklid společných prostor
- Odvoz komunálního odpadu
- Provoz STA/SAT
- Vybavení společných prostor (prádelna, sušárna)

**Co NEJSOU služby (platí nájemce přímo dodavateli):**
- Elektřina v bytě
- Plyn v bytě
- Internet/TV v bytě
- Telefon

**Rozúčtování:**
- Voda: dle vodoměrů (povinné bytové vodoměry) nebo dle počtu osob
- Teplo: vyhláška 269/2015 Sb. (30-50 % základní, 50-70 % spotřební)
- Ostatní: dle počtu osob, dle plochy, nebo rovným dílem (dle dohody)

### 4.4 Vyúčtování služeb

Stejná povinnost jako u SVJ — zákon 67/2013 Sb.:
- Vyúčtování do 4 měsíců po konci zúčtovacího období
- Reklamace: 30 dní
- Vypořádání: do 4 měsíců od vyúčtování
- Pokuta za nedoručení: 50 Kč/den/nájemník (max. po dobu 60 dnů)

### 4.5 Daňové aspekty

**FO — příjmy z nájmu (§9 ZDP):**

| Varianta | Výdaje | Efektivní zdanění |
|----------|--------|-------------------|
| Paušální výdaje | 30 % z příjmů | Jednodušší, ale bez odpisů |
| Skutečné výdaje | Odpisy + opravy + pojištění + správa + úroky z úvěru | Nižší daň, více práce |

Daň z příjmu FO: 15 % (do 1 935 552 Kč ročně), 23 % nad limit.
Zdravotní/sociální: neplatí se z §9 (pasivní příjem).
Výjimka: pokud pronájem na §7 (podnikání) → platí se SP+ZP.

**PO (s.r.o.) — příjmy z nájmu:**
- DPPO: 21 % (od 2024)
- Odpisy: součástí daňových nákladů
- DPH: nájem bytů osvobozen, nájem nebytových = s DPH
- Výplata zisku: srážková daň 15 % (dividenda)
- Celkové efektivní zdanění: ~33 % (21 % DPPO + 15 % srážka)

### 4.6 Předpis platby nájemníka (příklad)

```
Byt č. 5 (2+1, 55 m²), nájemník: Novák Jan

NÁJEMNÉ:
└── Nájemné: 18 500 Kč/měs (tržní cena)

ZÁLOHY NA SLUŽBY:
├── Teplo: 1 800 Kč/měs
├── Teplá voda: 550 Kč/měs
├── Studená voda: 380 Kč/měs
├── Úklid SČ: 200 Kč/měs
├── Výtah: 150 Kč/měs
├── Osvětlení SČ: 80 Kč/měs
├── Odvoz odpadu: 120 Kč/měs
└── STA: 50 Kč/měs

CELKEM: 21 830 Kč/měs
Kauce: 55 500 Kč (3× nájemné, složena při nastěhování)

Splatnost: k 1. dni měsíce
Účet: 987654321/0100
VS: 5 (číslo bytu)
```

---

## 5. Správa nájemního domu

### 5.1 Kdo spravuje

Na rozdíl od SVJ/BD neexistuje zákonná povinnost mít speciální orgán nebo správce. Vlastník rozhoduje sám.

**Varianty v praxi:**

**A) Vlastník spravuje sám (self-management)**
- Typické pro 1-2 domy, 5-20 bytů
- Vlastník sám: inkaso nájemného, komunikace s nájemníky, zajištění oprav
- Účetnictví: vlastní nebo externím účetní
- Nevýhoda: časově náročné, nutná dostupnost (havárie)
- ifmio: ideální produkt pro tento segment!

**B) Správcovská firma (property management)**
- Typické pro 3+ domy nebo větší domy (20+ bytů)
- Správce zajišťuje: inkaso, komunikace, technická správa, vyúčtování
- Odměna: 5-12 % z vybraného nájemného NEBO paušál per byt (200-500 Kč/byt/měs)
- Obvykle včetně: hledání nájemníků, příprava smluv, předávací protokoly

**C) Asset manager + property manager + facility manager (velcí investoři)**
```
Vlastník (investor/fond)
├── Asset manager: investiční strategie, nákup/prodej, portfolio
├── Property manager: nájemní smlouvy, inkaso, vztahy s nájemníky
└── Facility manager: technická správa, údržba, revize, energie
```

### 5.2 Klíčové procesy správy

| Proces | Detail | ifmio modul |
|--------|--------|-------------|
| Hledání nájemníků | Inzerce, prohlídky, výběr | ⏳ (CRM/marketplace) |
| Prověření nájemníků | Bonita, reference, insolvence (ISIR) | ✅ (iSpis.cz integrace) |
| Nájemní smlouva | Příprava, podpis, archiv | ⏳ (Contract model) |
| Předávací protokol | Nastěhování/vystěhování, fotodokumentace | ⏳ |
| Inkaso nájemného | Měsíční, párování plateb (VS) | ✅ (BankAccount + Fio) |
| Dlužníci | Upomínky, právní kroky | ✅ (Debtors + Reminders) |
| Vyúčtování služeb | Roční, zálohy vs skutečnost | ✅ (BillingPeriod) |
| Opravy a údržba | HelpDesk, objednávky, faktury | ✅ (WorkOrder + Invoice) |
| Revize | Plán, zajištění, archiv | ✅ (Asset + ServiceRecord) |
| Pojištění | Pojistka, události | ⏳ (Insurance model) |
| Obsazenost (vacancy) | Tracking prázdných bytů, plánování | ⏳ (Occupancy KPI) |
| Zvyšování nájemného | Indexace, srovnání s trhem | ⏳ (RentReview) |

---

## 6. Obsazenost — klíčový KPI

Obsazenost (occupancy rate) je nejdůležitější metrika nájemního domu.

```
Obsazenost = Pronajaté byty / Celkový počet bytů × 100

Příklad (dům 20 bytů):
- 18 pronajatých = 90 % obsazenost ✅
- 15 pronajatých = 75 % obsazenost ⚠️
- 12 pronajatých = 60 % obsazenost ❌ (problém)

Vacancy cost = Ušlé nájemné za prázdné byty
= 2 × 18 500 Kč × 12 měs = 444 000 Kč/rok (při 2 volných bytech)
```

**Tracking v ifmio:**
- Per byt: status (pronajatý / volný / v rekonstrukci / reservovaný)
- Datum: od kdy volný, jak dlouho
- Historie: předchozí nájemníci, důvod ukončení
- KPI dashboard: obsazenost %, trend, vacancy cost

---

## 7. V registrech

### 7.1 ARES
Nájemní dům jako FYZICKÁ NEMOVITOST není v ARES. V ARES je jen VLASTNÍK pokud je PO:
- s.r.o. (forma 112): IČO, firma, sídlo, CZ-NACE 68.20 (Pronájem a správa)
- a.s. (forma 121): dtto
- FO vlastník: v ARES jen pokud má živnostenský list na pronájem

### 7.2 ČÚZK
1 LV pro celou budovu + pozemek. Vlastník = FO/PO. Bez jednotek (pokud nemá prohlášení vlastníka). Zástavní právo = na celý dům (hypotéka).

### 7.3 Justice.cz
Jen pokud vlastník je PO zapsaná v OR. FO vlastník → žádný zápis v Justice.cz.

### 7.4 Detekce typu v ifmio
```
ČÚZK lookup → 1 vlastník celé budovy?
├── ANO → Nájemní dům NEBO RD
│   ├── Vlastník PO → ARES lookup → s.r.o./a.s. → Nájemní (investor)
│   ├── Vlastník obec → Obecní bytový dům
│   ├── Vlastník FO + bytový dům (>4 byty) → Nájemní (soukromý)
│   └── Vlastník FO + rodinný dům (≤3 byty) → Rodinný dům
└── NE → SVJ / Spoluvlastnictví
```

---

## 8. Mapování na ifmio modely

| Reálná entita | ifmio model | Poznámka |
|---------------|-------------|----------|
| Nájemní dům | Property (type: RENTAL_RESIDENTIAL) | |
| Budova | Building | 1 LV, bez jednotek v KN |
| Vlastník domu | Principal + PrincipalOwner | FO nebo PO |
| Vlastník PO | KbOrganization (orgType: SRO/AS) | Z ARES |
| Byt (nečíslovaný) | Unit (unitType: APARTMENT) | Bez KN čísla jednotky |
| Nájemník | Resident + Tenancy | Nájemní smlouva |
| Nájemní smlouva | Tenancy (dateFrom, dateTo, rent, deposit) | + Contract model ⏳ |
| Kauce | Tenancy.deposit | |
| Nájemné | PaymentPrescription (type: RENT) | Odlišný od SVJ záloh |
| Služby (zálohy) | PaymentPrescription (type: SERVICE_ADVANCE) | |
| Předávací protokol | — (⏳ HandoverProtocol model) | |
| Obsazenost | — (⏳ computed z Tenancy) | KPI dashboard |
| Správce (pokud ext.) | Tenant + ManagementContract | |
| Pojištění | — (⏳ Insurance model) | |

### Rozdíly v ifmio implementaci SVJ vs Nájemní:

| Funkce | SVJ | Nájemní dům |
|--------|-----|-------------|
| Předpis | Fond oprav + zálohy služby | Nájemné + zálohy služby |
| Typ platby | ADVANCE (záloha) | RENT (nájem) |
| Příjemce platby | Účet SVJ | Účet vlastníka |
| Shromáždění/hlasování | ✅ Povinné | ❌ Neexistuje |
| Fond oprav | ✅ Oddělený fond | ❌ Vlastník financuje opravy |
| Kauce | ❌ Neexistuje (SVJ) | ✅ Max 3× nájemné |
| Nájemní smlouva | ❌ (vlastník-nájemník per byt) | ✅ Centrální správa smluv |
| Obsazenost tracking | ❌ Irelevantní | ✅ Klíčový KPI |
| Zvyšování nájemného | ❌ | ✅ Indexace, cenová mapa |
| Předávací protokol | ❌ | ✅ Nastěhování/vystěhování |
| Pojistné události | SVJ řeší | Vlastník řeší |

---

## 9. Kritické zákony

| Předpis | Co upravuje | ifmio relevance |
|---------|-------------|-----------------|
| NOZ §2235-§2301 | Nájem bytu a domu | Nájemní smlouvy, ochrana nájemce |
| NOZ §2249 | Zvyšování nájemného | Indexace, cenová mapa |
| NOZ §2254 | Kauce (jistota) | Max 3×, úročení, vrácení |
| NOZ §2288-§2291 | Výpověď z nájmu | Výpovědní důvody, lhůty |
| Zákon 67/2013 Sb. | Služby spojené s užíváním | Vyúčtování, rozúčtování |
| NV 308/2015 Sb. | Drobné opravy (do 1 000 Kč) | Kdo platí co |
| NV 453/2013 Sb. | Srovnatelné nájemné | Znalecký posudek, cenová mapa |
| Vyhláška 269/2015 Sb. | Rozúčtování tepla a vody | Algoritmus vyúčtování |
| ZDP §9 | Příjmy z nájmu FO | Zdanění vlastníka |
| ZDP §30-§32 | Odpisy hmotného majetku | Odpisy budovy (30 let) |
| Zákon 586/1992 Sb. | DPPO | Zdanění PO vlastníka |
| Zákon 235/2004 Sb. | DPH | Osvobození nájmu bytů |

---

## 10. ifmio implementační checklist pro nájemní dům

### Hotové (✅):
- Evidence bytů (Unit)
- Evidence nájemníků (Resident + Tenancy)
- Předpisy plateb
- Vyúčtování služeb
- Bankovní účet + Fio API
- HelpDesk
- WorkOrders
- Revize (Asset + ServiceRecord)
- Dlužníci + upomínky
- Dokumentový archiv
- Prověření nájemníků (ISIR/CEE přes iSpis.cz)

### Chybí / potřebuje rozšíření (⏳):
- **Nájemní smlouva model** — Contract (typ, strany, doba, nájemné, kauce, přílohy)
- **Předávací protokol** — HandoverProtocol (stav bytu, měřidla, klíče, fotodokumentace)
- **Kauce tracking** — Deposit (částka, datum složení, úročení, vrácení, zápočty)
- **Obsazenost dashboard** — OccupancyKPI (pronajaté/volné, vacancy cost, trend)
- **Zvyšování nájemného** — RentReview (indexace CPI, srovnání s cenovou mapou, historie)
- **Pojištění** — Insurance (pojistka, pojistná částka, události)
- **Marketplace pro nájemníky** — Inzerce volných bytů, prohlídky, žádosti
- **Daňový přehled** — příjmy z nájmu, odpisy, výdaje per rok (pro §9 ZDP)

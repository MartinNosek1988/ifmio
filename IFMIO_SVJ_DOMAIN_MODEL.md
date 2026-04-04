# IFMIO – SVJ: Kompletní doménový model v2

> Verze: 2.0 | 2026-04-04 | Zdroj pravdy pro implementaci SVJ modulu v ifmio

---

## 1. Co je SVJ

Společenství vlastníků je právnická osoba založená za účelem zajišťování správy domu a pozemku (NOZ §1194). SVJ nesmí podnikat. Je obdobou spolku — zajišťuje správu cizího majetku. V ČR existuje ~60 000 SVJ.

### Co SVJ MŮŽE vlastnit (jen pro účely správy):
- Movitý majetek (sekačka, nářadí, IT)
- Bankovní účet (povinně)
- Jednotky v domě (byt domovníka, komerční prostor v přízemí — jen pro účely správy, ne investice)
- Pozemky (přilehlý pozemek, zahrada, parkoviště — pokud slouží k provozu domu)
- Pohledávky (nedoplatky vlastníků)
- SVJ NESMÍ vlastnit: investiční byty, nemovitosti mimo dům, obchodní podíly

### Co SVJ SPRAVUJE (ale nevlastní):
- Společné části domu: základy, střecha, obvodové/nosné zdi, schodiště, chodby, výtahy, kotelna, rozvody (voda, kanalizace, plyn, elektro), společné prostory (prádelna, sušárna, kočárkárna), balkóny/lodžie (stavebně = společná část, užívání = příslušný vlastník)
- Pozemek: zastavěný + přilehlé plochy
- NIKOLIV jednotky — ty spravují vlastníci (ale SVJ odpovídá za společné rozvody UVNITŘ jednotky — stoupačky, nosné zdi)

### Vznik SVJ:
- Povinný: ≥5 jednotek, ≥4 různí vlastníci
- Dobrovolný: <5 jednotek, souhlas VŠECH vlastníků
- Založení: schválení stanov (notářský zápis)
- Vznik: zápisem do rejstříku SVJ u krajského soudu
- Historická SVJ (před 1.1.2014): vznikaly automaticky ze zákona (zákon 72/1994 Sb.) — ~51 000 stále existuje

---

## 2. SVJ v registrech

### 2.1 ARES
IČO (8 číslic, unique), obchodní jméno ("Společenství vlastníků [adresa]"), právní forma kód 145, DIČ (jen pokud plátce DPH — většina NEMÁ), sídlo = adresa domu, datum vzniku/zániku, CZ-NACE 68.32, datová schránka. Detekce: pravniForma.kod === '145' → 100% SVJ.

### 2.2 Justice.cz (Rejstřík SVJ — NE obchodní rejstřík)
Název, sídlo, IČO, statutární orgán (výbor nebo předseda + jména členů), spisová značka. Sbírka listin: stanovy (povinné), prohlášení vlastníka (povinné), účetní závěrka (ročně), notářské zápisy, zápisy ze shromáždění.

### 2.3 ČÚZK (Katastr nemovitostí)
Pro SVJ dům existuje: LV pro bytové spoluvlastnictví (společný), LV per vlastník (s jeho jednotkou). Jednotka v katastru: číslo (1883/1), typ (byt/nebyt/garáž), plocha (m²), podíl na SČ (zlomek — 30/17021), vlastník, typ vlastnictví (výlučné/SJM/podílové), LV číslo, zástavní práva, exekuce/insolvence. Stavební objekt: ČP, KÚ, parcela, typ stavby, počet jednotek. Prohlášení vlastníka: klíčový dokument — definuje jednotky, SČ, podíly, obsahuje půdorysy.

### 2.4 RÚIAN
Kód stavebního objektu, adresní místa, GPS, KÚ, typ stavby, počet podlaží. RÚIAN NEOBSAHUJE: vlastníky, podíly, právní vztahy, SVJ info.

---

## 3. Orgány SVJ

### 3.1 Shromáždění (nejvyšší orgán)
Tvoří VŠICHNI vlastníci. Hlasuje se dle podílů na SČ (NE 1 člověk = 1 hlas). Min. 1× ročně. Usnášeníschopné: >50% všech hlasů přítomno.

Kvóra: Běžná správa >50% přítomných. Změna stanov >50% VŠECH. Změna prohlášení 100% VŠECH. Stavební úprava SČ ≥75% VŠECH. Úvěr SVJ >50% VŠECH.

Per rollam (NOZ §1212): písemně/elektronicky, kdo se nevyjádří = hlasoval PROTI, výsledek do 15 dnů.

### 3.2 Statutární orgán — DVĚ varianty (určují stanovy)

**Varianta A: Výbor (kolektivní) — nejčastější**
Min. 3 členové (lichý počet doporučen). Předseda výboru řídí činnost výboru (POZOR: předseda VÝBORU ≠ předseda SVJ). Volí shromáždění, funkční období typicky 5 let. Odměna: 0-2 000 Kč/měs per člen. Osobní odpovědnost za škodu.

Kdo může být členem: vlastník (nejčastější), KDOKOLIV svéprávný a bezúhonný (včetně nečlenů SVJ), právnická osoba. Stanovy MOHOU omezit jen na vlastníky.

**Varianta B: Předseda společenství vlastníků (individuální)**
Jedna osoba (FO nebo PO). Typicky menší SVJ (<15 jednotek) nebo profesionální předseda.

### 3.3 Profesionální (externí) předseda — rostoucí trend
FO nebo PO specializující se na výkon funkce. NOZ umožňuje — nemusí být vlastník. Odměna: 2 000-8 000 Kč/měs (30 jednotek ~3 800 Kč). Zajišťuje: zastupování SVJ, jednání s dodavateli, kontrola správce, příprava shromáždění. NEZAJIŠŤUJE: technickou údržbu, úklid. Má vlastní pojištění odpovědnosti.

Best practice: Profesionální předseda + kontrolní komise z vlastníků + správcovská firma.

POZOR na konflikt zájmů: správce NEMÁ být současně předsedou (jeden kontroluje druhého).

### 3.4 Kontrolní komise / Revizor (volitelný)
Stanovy mohou zřídit. Kontroluje hospodaření SVJ. Doporučeno VŽDY pokud je externí předseda.

---

## 4. Správa SVJ — kdo co dělá

### 4.1 Správcovská firma
Většina SVJ (~80%) má smluvního správce na příkazní smlouvu (NOZ §2430).

Oblasti: Ekonomická správa (předpisy, inkaso, dlužníci, rozpočet) 80-200 Kč/j/m. Účetní služby (účetnictví, DPH, závěrka) 50-150 Kč/j/m. Technická správa (revize, údržba, havárie) 50-150 Kč/j/m. Administrativa (shromáždění, zápisy, komunikace) zahrnuto. Komplex: 200-500 Kč/jednotka/měs.

### 4.2 Varianty v praxi:
**A) Jeden správce — vše** (nejčastější)
**B) Správce + samostatný účetní** (OSVČ)
**C) Správce + domovník/údržbář z domu** (DPP ~5 000 Kč/měs)
**D) Bez správce — výbor vše sám** (malé SVJ) + externí účetní
**E) Profesionální předseda + správce + kontrolní komise** (best practice)

ifmio musí podporovat VŠECHNY tyto modely — různé role, různé přístupy, různé reporty per subjekt.

---

## 5. Finance SVJ

### 5.1 DPH
~95% SVJ je NEPLÁTCE DPH. Příspěvky na správu se do obratu NEPOČÍTAJÍ. Plátcem se stane jen pokud komerční příjmy (pronájem nebytových prostor, reklama) překročí 2 mil Kč/rok. Nájem bytů = osvobozen od DPH vždy.

### 5.2 Účetnictví
Podvojné účetnictví POVINNĚ (od 2016). Roční závěrka (rozvaha + VZZ). Schvaluje shromáždění. Ukládá se do sbírky listin rejstříku. Daňové přiznání DPPO: většina příjmů osvobozena (příspěvky vlastníků), zdanitelné: úroky, pronájem, penále.

### 5.3 Fond oprav (dlouhodobé zálohy)
Vlastníci přispívají měsíčně dle podílů na SČ. Typicky 25-60 Kč/m²/měs. Čerpá se na opravy a investice. Stav fondu = klíčový ukazatel finančního zdraví. Nečerpaný zůstatek přechází na nového vlastníka při prodeji (nevrací se).

Příklad předpisu (75 m², podíl 30/17021): Fond oprav 2 250 + Správce 300 + Pojištění 51 + Teplo 2 100 + Voda TV 650 + Voda SV 450 + Úklid 200 + Výtah 150 + Osvětlení 80 + Domovník 100 = CELKEM 6 331 Kč/měs. VS: 18831, splatnost k 25. předchozího měsíce.

### 5.4 Vyúčtování služeb (roční)
Zálohy vs skutečnost → přeplatek/nedoplatek. Do 4 měsíců po konci období. Vyhláška 269/2015 Sb.: teplo 30-50% základní (plocha) + 50-70% spotřební (měřidla). Voda dle vodoměrů. Reklamace: 30 dní.

---

## 6. Pojištění SVJ
- Pojištění budovy: živly, voda, vandalismus. 15-50 000 Kč/rok. Pojistná částka = reprodukční hodnota (30-100 mil Kč).
- Pojištění odpovědnosti SVJ: 3-8 000 Kč/rok.
- D&O (výbor/předseda): 2-5 000 Kč/rok. Silně doporučeno.
- Pojištění strojů (výtah, kotelna): 2-5 000 Kč/rok.
- Pojistné události: nahlášení → havarijní oprava → oznámení pojišťovně do 3 dnů → dokumentace → likvidace → plnění.

---

## 7. Mapování na ifmio modely

SVJ → Property (type: SVJ) + KbOrganization. Budova → Building. Jednotka → Unit + BuildingUnit. Vlastník → Resident/Party + UnitOwnershipKb + KbPerson. Nájemník → Resident + Tenancy. Výbor/Předseda → PrincipalOwner + StatutoryBodyKb. Profesionální předseda → PrincipalOwner (isExternal: true). Správce → Tenant + ManagementContract. Fond oprav → FundRepair + FundRepairEntry. Předpis → PaymentPrescription. Banka → BankAccount + BankTransaction. Shromáždění → Assembly + VotingItem + VotingVote. Revize → Asset + AssetServiceRecord.

### Chybí / potřebuje rozšíření:
- Pojištění budovy (Insurance model)
- Pojistné události (InsuranceClaim)
- Plán oprav (RepairPlan — rok, popis, cena, stav)
- Dodavatelé služeb (Supplier — IČO, smlouva, typ služby, cena)
- Smlouvy (Contract — typ, dodavatel, platnost, soubor)
- Profesionální předseda flag (isExternal na PrincipalOwner)
- Různé role správy (správce vs účetní vs údržba v ManagementContract)
- Prohlášení vlastníka parsing (jednotky, podíly, SČ z PDF)

---

## 8. Kritické zákony
NOZ §1158-§1222 (bytové spoluvlastnictví, SVJ). NOZ §1200 (stanovy). NOZ §1205-§1214 (orgány). NOZ §1212 (per rollam). NOZ §2430 (příkazní smlouva — správce). Zákon 67/2013 (služby). Vyhláška 269/2015 (rozúčtování tepla/vody). Zákon 563/1991 (účetnictví). Zákon 586/1992 (DPPO). Zákon 424/2022 (měsíční přehledy spotřeby). NV 366/2013 (limit pro opravy). Zákon 256/2013 (katastrální zákon).

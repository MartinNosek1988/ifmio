# IFMIO – Komerční nemovitost: Doménový model

> Verze: 1.0 | 2026-04-04 | Zdroj pravdy pro implementaci komerčních nemovitostí v ifmio
> Companion dokument k SVJ, BD a Nájemní dům domain modelům

---

## 1. Co je komerční nemovitost

Komerční nemovitost je budova nebo komplex budov určený primárně k podnikatelskému využití — pronájem kancelářských, obchodních, skladových nebo výrobních prostor. Vlastník (investor, fond, REIT, s.r.o./a.s.) pronajímá prostory firemním nájemcům za tržní komerční nájemné.

### Zásadní rozdíl od rezidenčních typů:

| | SVJ | BD | Nájemní dům | **Komerční** |
|---|-----|-----|-------------|-------------|
| Vlastník | Každý vlastník svůj byt | Družstvo celý dům | 1 vlastník celý dům | Investor/fond/PO |
| Nájemci | Volitelně (vlastník pronajímá) | Členové BD | Fyzické osoby (byty) | **Firmy (PO)** |
| Právní režim nájmu | NOZ §2235 (chráněný) | ZOK §744 (účelné N) | NOZ §2235 (chráněný) | **NOZ §2302 (nechráněný)** |
| Indexace | Ne | Ne | Limitovaně | **Ano (CPI/pevná)** |
| DPH | Většinou neplátce | Často plátce | Byty osvobozeny | **Povinně s DPH** |
| Service charges | Zahrnuty v předpisu | Součást nájemného | Zálohy služeb | **Samostatné SC** |
| Správa | Výbor/správce | Představenstvo | Vlastník/správce | **Property + FM** |
| Certifikace | Ne | Ne | Ne | **BREEAM/LEED** |
| Délka nájmu | Neurčitá/určitá | Neurčitá (právo nájmu) | Neurčitá/určitá | **5-15 let typicky** |

---

## 2. Typy komerčních nemovitostí

### 2.1 Kancelářská budova (Office)

**Klasifikace:**
- **Třída A:** Prémiové — CBD lokace, moderní design, plná klimatizace, inteligentní řízení budovy (BMS), certifikace BREEAM/LEED, podzemní garáže, recepce, konferenční zázemí. Nájemné: 18-25 EUR/m²/měs (Praha centrum).
- **Třída B:** Kvalitní — dobrá lokace, renovované nebo novější budovy, klimatizace, výtahy, základní služby. Nájemné: 13-17 EUR/m²/měs.
- **Třída C:** Ekonomické — okrajové lokace, starší budovy, omezené vybavení, nižší standard. Nájemné: 8-12 EUR/m²/měs.

**Specifika:**
- Pronajímatelná plocha (NLA/GLA) vs celková plocha — BOMA standard měření
- Koeficient pronajímatelnosti (add-on faktor): 10-20% nad čistou plochu
- Fit-out: shell & core, cat A (základní vybavení), cat B (nájemce si dokončí)
- Flexibilní workspace trend: coworking plochy, hot desking
- Parkovací stání: koeficient 1:60-1:80 m² kancelářské plochy

### 2.2 Obchodní prostor / Retail

**Podtypy:**
- **High-street retail:** Přízemí budov na obchodních třídách (Na Příkopě, Národní, Pařížská)
- **Obchodní centrum / Shopping mall:** Multi-tenant, anchor tenants + specialty stores
- **Retail park:** Venkovní formát, větší jednotky, edge-of-town lokace
- **Standalone:** Supermarket, hobby market, stavební bazar

**Specifika:**
- **Turnover rent (obratové nájemné):** Základní nájemné + % z obratu (typicky 5-12%)
- **Anchor tenant:** Velký nájemce (supermarket, H&M) s nižším nájemným ale garantující footfall
- **Marketing fond:** Nájemci přispívají na společný marketing centra (1-3% nájemného)
- **Otevírací doba:** Závazná dle nájemní smlouvy (pokuty za neotvření)
- **Exkluzivita:** Smlouva může zakazovat pronájem konkurenčnímu nájemci

### 2.3 Skladový / logistický areál (Industrial & Logistics)

**Podtypy:**
- **Big box warehouse:** >5 000 m², distribuční centra, e-commerce fulfillment
- **City logistics / last-mile:** Menší formáty blízko měst
- **Light industrial:** Výroba + sklad + kancelář v jednom
- **Data center:** Specifické požadavky (redundantní napájení, chlazení, bezpečnost)

**Specifika:**
- Výška (clear height): 10-12 m standard, >12 m premium
- Nosnost podlahy: 5 t/m² standard
- Doky (loading bays): Počet a typ (level, dock leveler)
- Sprinklery, požární dělení
- Nájemné: 4-6 EUR/m²/měs (ČR)
- Triple Net Lease (NNN) — nájemce platí vše

### 2.4 Průmyslový objekt (Industrial)

**Specifika:**
- Brownfield vs greenfield
- Ekologické zátěže (EIA, dekontaminace)
- Specifické technické požadavky (jeřáby, vzduchotechnika, chemická odolnost)
- Povolovací proces: EIA, stavební povolení, IPPC
- Delší nájemní smlouvy (10-25 let)

---

## 3. Kdo je vlastníkem

### 3.1 Varianty vlastnictví

**A) s.r.o. / a.s. — SPV (Special Purpose Vehicle) — nejčastější**
- Každá nemovitost v samostatné SPV s.r.o.
- Důvod: asset deal vs share deal, odpovědnost, financování
- Matka (holding) vlastní 100% podíl v SPV
- ARES: forma 112 (s.r.o.) nebo 121 (a.s.)
- V katastru: SPV s.r.o. na LV

**B) Nemovitostní fond (investiční fond)**
- Dle zákona 240/2013 Sb. o investičních společnostech
- Kvalifikovaný investor fond (FKVI) — min. vklad 1 mil EUR, max 50 investorů
- Fond kolektivního investování — retail přístupný
- Správce fondu (OBHOSPODAŘOVATEL) — licencovaná investiční společnost
- Depozitář (banka) — kontrolní funkce
- Daňové zvýhodnění: 5% sazba DPPO

**C) REIT (Real Estate Investment Trust)**
- V ČR zatím neexistuje speciální REIT legislativa
- V praxi: akciové společnosti nebo fondy s REIT-like strukturou
- CTP, Penta Real Estate, CPI Property Group — de facto české REIT

**D) Zahraniční investor (přes českou SPV)**
- Holding: Lucembursko, Nizozemsko, Kypr (daňová optimalizace)
- Česká SPV s.r.o. drží nemovitost
- Běžné u institucionálních investorů

**E) Obec / stát / veřejný sektor**
- Komerční prostory ve vlastnictví obce
- Zákon o obcích — povinnost hospodárného nakládání
- Výběrová řízení na nájemce

### 3.2 V katastru nemovitostí

Komerční budova na JEDNOM listu vlastnictví — vlastník = SPV/investor. Jednotlivé pronajímané prostory v katastru NEMUSÍ být jako samostatné jednotky (záleží na prohlášení vlastníka). U obchodních center: často bez prohlášení — celá budova = 1 LV.

---

## 4. Právní režim komerčního nájmu

### 4.1 Nájem prostoru sloužícího k podnikání (NOZ §2302-2315)

**ZÁSADNÍ ROZDÍL od bytového nájmu:**
- Nájemce je podnikatel, prostor slouží k podnikání
- NECHRÁNĚNÝ nájem — NOZ §2235 (ochrana nájemce bytu) se NEAPLIKUJE
- Smluvní volnost je VÝRAZNĚ ŠIRŠÍ než u bytového nájmu
- Výpovědní doba: dle smlouvy (ne zákonná 3 měsíce)
- Právo nájemce na náhradní pronájem: ANO (§2315 — pokud nájem skončí výpovědí pronajímatele bez porušení, nájemce má právo na přiměřenou náhradu)
- Pacht (§2332): pokud nájemce provozuje podnik — ještě volnější režim

### 4.2 Typická struktura nájemní smlouvy

| Klauzule | Typický obsah | Poznámka |
|----------|---------------|----------|
| Předmět nájmu | Specifikace prostor (m², podlaží, příloha — půdorys) | NLA vs GLA |
| Účel nájmu | Konkrétní podnikatelská činnost | Omezení: jen dohodnutá činnost |
| Doba nájmu | Určitá: 5-15 let (office), 10-20 let (retail anchor) | Opce na prodloužení |
| Nájemné | Base rent (EUR/m²/měs nebo CZK/m²/měs) | Měsíční nebo čtvrtletní fakturace |
| Indexace | CPI inflace (roční), nebo pevné % (2-3%/rok) | Automatická, na výročí |
| Service charges | Skutečné provozní náklady prorata dle plochy | Open book — nájemce vidí rozpis |
| Kauce / bankovní záruka | 3-6 měsíců nájemného | BG preferováno u větších nájemců |
| Break clause | Možnost předčasného ukončení (za poplatek) | Typicky po 3. nebo 5. roce |
| Fit-out příspěvek | Tenant improvement allowance (TIA) | Pronajímatel přispěje na stavbu |
| Rent-free period | 3-12 měsíců bez nájemného (fit-out) | Amortizuje se po dobu nájmu |
| Transfer / sublease | Podmíněno souhlasem pronajímatele | Zákaz nebo souhlas (reasonable consent) |
| Konkurenční doložka | Pronajímatel nesmí pronajmout konkurentovi | Zejména u retail |
| Pojištění | Povinné pojištění nájemce (odpovědnost, obsah) | Pronajímatel pojišťuje budovu |
| Předkupní právo | Na prodloužení nebo na koupi | Vyjednávací pozice |

### 4.3 Handover (předání prostor)

**Protokolární předání:**
- Shell & core: holé prostory, přípojky médií
- Cat A: základní strop, podlaha, osvětlení, HVAC
- Cat B: kompletní fit-out (nájemce/pronajímatel)
- Handover protocol: stav prostor, měřidla, klíče, přístupy
- Reinstatement (vrácení): nájemce uvede do původního stavu na konci nájmu (nebo dilapidation payment)

---

## 5. Finance komerční nemovitosti

### 5.1 Příjmové toky

**A) Base rent (základní nájemné)**
- Hlavní příjem
- Typicky EUR/m²/měsíc (kanceláře) nebo EUR/m²/rok
- Fakturace: měsíčně nebo čtvrtletně PŘEDEM
- DPH: komerční nájem = s DPH (21%)

**B) Service charges (provozní náklady)**
- Přeúčtované skutečné náklady nájemcům dle plochy
- Obsahuje: úklid, ostraha, údržba, pojistné, energie společných prostor, odpady, zahrada, recepce, BMS/technologie, správa budovy (PM fee)
- Open book: nájemci mají právo nahlédnout do dokladů
- Roční vyúčtování: skutečné náklady vs zálohy → přeplatek/nedoplatek
- CAP (strop): některé smlouvy mají strop na SC nárůst (3-5%/rok)

**C) Turnover rent (obratové nájemné) — retail**
- Base rent + procentní podíl z obratu nájemce nad threshold
- Typicky: 5-12% z obratu nad dohodnutou hranici
- Nájemce reportuje obrat měsíčně/čtvrtletně
- Pronajímatel má právo auditu

**D) Marketing fund (obchodní centra)**
- Příspěvky nájemců na společný marketing
- Typicky 1-3% z base rent
- Společný rozpočet → akce, reklama, digital marketing

**E) Parking / storage**
- Pronájem parkovacích stání
- Pronájem skladových prostor
- Fakturováno samostatně

**F) Ostatní příjmy**
- Reklama na fasádě/ve společných prostorách
- Příjmy z antén/BTS (telco)
- Nabíjecí stanice EV
- Pronájem konferenčních místností

### 5.2 Nákladové položky (pronajímatel)

| Kategorie | Položky | Přeúčtovatelné SC? |
|-----------|---------|---------------------|
| Energie SČ | Elektřina, teplo, chlazení spol. prostor | ✅ |
| Úklid | Úklid SČ, recepce, okolí | ✅ |
| Ostraha | 24/7 security, CCTV, přístupy | ✅ |
| Údržba | HVAC, výtahy, BMS, drobná údržba | ✅ |
| Pojištění | Budova, odpovědnost | ✅ |
| Odpady | Svoz, třídění | ✅ |
| Zeleň | Údržba zahrady, interiérová zeleň | ✅ |
| PM fee | Odměna property managera | ✅ (limitovaně) |
| **CAPEX** | Investice, rekonstrukce, výměna střechy | ❌ (pronajímatel) |
| **Daň z nemovitosti** | Roční daň | ❌ nebo ✅ (dle smlouvy) |
| **Financování** | Splátky úvěru, úroky | ❌ (pronajímatel) |
| **Odpisy** | Účetní/daňové odpisy budovy | ❌ (pronajímatel) |
| **Leasing commission** | Provize makléři za nového nájemce | ❌ (pronajímatel) |

### 5.3 DPH specifika

- Komerční nájem = ZDANITELNÉ plnění (21% DPH)
- Pronajímatel je plátce DPH (téměř vždy)
- Nájemce (firma) si DPH odečte na vstupu → daňově neutrální
- Service charges: s DPH
- Nájem bytů (pokud v budově jsou): OSVOBOZENO od DPH (i u plátce)
- Pozor: pokud budova obsahuje mix (byt + komerční) → krácený odpočet DPH

### 5.4 Účetnictví a reporting

**Pronajímatel:**
- Podvojné účetnictví (s.r.o./a.s.)
- Odpisy budovy: 30 let (odpisová skupina 5) nebo 50 let (odp. skupina 6 — administrativní budovy)
- IFRS 16 (Leases) pokud konsolidace do nadnárodní skupiny
- Auditorská povinnost: aktiva >40 mil NEBO obrat >80 mil NEBO >50 zaměstnanců
- Investiční reporting: NOI, Cap Rate, WAULT, Occupancy, ERV

**Klíčové KPI:**
| KPI | Vzorec | Typická hodnota |
|-----|--------|-----------------|
| NOI (Net Operating Income) | Příjmy − provozní náklady | 70-85% příjmů |
| Cap Rate (kapitalizační míra) | NOI / hodnota nemovitosti | 5-8% (ČR office) |
| WAULT (Weighted Average Unexpired Lease Term) | Vážený průměr zbývající doby nájmu | 3-7 let (zdravé) |
| Occupancy (obsazenost) | Pronajatá plocha / celková NLA | >90% cíl |
| ERV (Estimated Rental Value) | Tržní nájemné při re-letting | EUR/m²/rok |
| Yield on Cost | NOI / celkové náklady investice | >7% pro development |
| Tenant retention rate | % nájemců kteří prodloužili | >70% zdravé |
| Collection rate | Inkasované / fakturované nájemné | >98% cíl |

### 5.5 Předpis platby (komerční nájemce):
```
Nájemce: ABC Consulting s.r.o. (IČO: 12345678)
Prostor: Kancelář 3.NP, jednotka 301-305 (420 m² NLA)
Smlouva: od 1.1.2023, na 7 let, opce 2×5 let

NÁJEMNÉ:
├── Base rent: 420 m² × 16 EUR/m²/měs = 6 720 EUR/měs
├── Indexace: CPI k 1.1. každého roku
├── DPH 21%: 1 411,20 EUR
└── Celkem nájemné s DPH: 8 131,20 EUR/měs

SERVICE CHARGES (zálohy):
├── Úklid SČ: 420 m² × 1,20 EUR = 504 EUR
├── Ostraha: 420 m² × 0,80 EUR = 336 EUR
├── Údržba HVAC+výtahy: 420 m² × 0,90 EUR = 378 EUR
├── Energie SČ: 420 m² × 1,50 EUR = 630 EUR
├── Pojištění: 420 m² × 0,30 EUR = 126 EUR
├── Odpady: 420 m² × 0,15 EUR = 63 EUR
├── PM fee: 420 m² × 0,50 EUR = 210 EUR
├── Celkem SC netto: 2 247 EUR/měs
├── DPH 21%: 471,87 EUR
└── Celkem SC s DPH: 2 718,87 EUR/měs

PARKING:
├── 6 stání × 150 EUR/stání/měs = 900 EUR
├── DPH 21%: 189 EUR
└── Celkem parking s DPH: 1 089 EUR/měs

═══════════════════════════════════════
CELKEM MĚSÍČNĚ s DPH: 11 939,07 EUR
═══════════════════════════════════════

Splatnost: 1. den měsíce, předem
Platební metoda: Bankovní převod
Měna: EUR (dle smlouvy; CZK ekvivalent dle kurzu ČNB)
VS: 420301 (číslo jednotky)
```

---

## 6. Správa komerční nemovitosti — role

### 6.1 Asset Manager (AM)
Strategická úroveň — maximalizace hodnoty nemovitosti pro investora.
- Investiční strategie (hold/sell/reposition)
- CAPEX rozhodování
- Financování (refinancing, exit strategy)
- Nájemní strategie (tenant mix, positioning)
- Valuace a reporting investorům
- Obvykle: zaměstnanec investiční skupiny / fondu

### 6.2 Property Manager (PM)
Operativní správa — denní chod nemovitosti a vztahy s nájemci.
- Nájemní smlouvy (příprava, vyjednávání, prodlužování)
- Fakturace nájemného a service charges
- Inkaso a dlužníci
- Vyúčtování SC (roční)
- Komunikace s nájemci
- Rozpočtování (OPEX budget)
- Reporting AM/vlastníkovi (měsíční/čtvrtletní)
- Obvykle: external PM firma (CBRE, JLL, Cushman, Colliers, nebo lokální)
- Odměna: 3-5% z inkasa nebo fixní fee

### 6.3 Facility Manager (FM)
Technická správa — provoz a údržba budovy.
- Technická údržba (HVAC, výtahy, BMS, elektro)
- Údržba budovy (opravy, revize, plánovaná údržba)
- Úklid a ostraha (řízení subdodavatelů)
- Energie management (optimalizace spotřeby)
- BOZP a požární ochrana
- Předávání prostor (handover/reinstatement)
- Obvykle: external FM firma nebo interní technik
- Odměna: 1-3% z SC nebo fixní fee

### 6.4 Leasing Agent / Broker
- Hledání nových nájemců
- Marketing volných prostor
- Prohlídky, vyjednávání HOT (heads of terms)
- Provize: 10-20% ročního nájemného (jednorázově)

### 6.5 V ifmio — mapování rolí:

| Reálná role | ifmio implementace |
|-------------|-------------------|
| Asset Manager | Tenant admin (investor přístup) → portfolio dashboard, KPI, valuace |
| Property Manager | Tenant admin (PM přístup) → nájmy, fakturace, SC, reporting |
| Facility Manager | Tenant admin (FM přístup) → WO, revize, assets, údržba |
| Leasing Agent | CRM modul → pipeline, leads, prohlídky |
| Nájemce | Tenant Portal (firma) → faktury, SC, helpdesk, dokumenty |
| Kontaktní osoba nájemce | Owner Portal adaptace → přístup per unit |

---

## 7. Facility Management specifika

### 7.1 Plánovaná údržba (PPM — Planned Preventive Maintenance)

| Systém | Frekvence | Zákon / norma | Poznámka |
|--------|-----------|---------------|----------|
| Výtahy | Měsíčně + roční revize | ČSN EN 13015, NV 27/2003 | Povinné servisní smlouvy |
| HVAC / VZT | Čtvrtletně | Vyhláška 6/2003 | F-plyny: nařízení EU 517/2014 |
| Požární systémy | Ročně + měsíční kontroly | Vyhláška 246/2001 | EPS, SHZ, PHE |
| Elektro revize | 1× za 5 let (kanceláře) | ČSN 33 1500 | Revizní zpráva povinná |
| Hromosvody | 1× za 5 let | ČSN EN 62305 | |
| Plynové rozvody | 1× za 3 roky | Vyhláška 85/1978 | Revizní technik |
| Kotelna | Ročně | Vyhláška 91/1993 | |
| Požární dveře | Ročně | ČSN EN 1154 | |
| Čerpadla / tlak. nádoby | Ročně | ČSN 69 0012 | |
| BMS/CCTV | Čtvrtletně | — | Servisní smlouva |
| Střecha | Ročně (vizuální) | — | Po zimě / bouřkách |
| Fasáda (opláštění) | 2× za 5 let | — | Bezpečnostní kontrola |

### 7.2 Energetický management

- PENB (průkaz energetické náročnosti): povinný při prodeji/pronájmu >250 m²
- Energetický audit: povinný pro PO s >250 zaměstnanci nebo obratem >1,3 mld
- Certifikace: BREEAM (UK standard), LEED (US standard), WELL (health & wellness)
- Smart building: BMS (Building Management System) — řízení HVAC, osvětlení, žaluzií
- Submetering: měření spotřeby per nájemce (elektřina, voda, teplo/chlazení)
- ESG reporting: povinné pro velké firmy (CSRD/ESRS od 2025)

### 7.3 Emergency management

- Havarijní plán budovy
- Klíčové kontakty: správce, technik, hasiči, záchranná služba, vodárna, teplárenská
- Evakuační plán (požární poplachové směrnice)
- Záložní napájení (UPS, diesel generátor)
- Záložní čerpadla, zásobníky vody

---

## 8. Komerční nemovitost v registrech

### 8.1 ARES
IČO vlastníka (SPV s.r.o./a.s.). Právní forma: 112 (s.r.o.), 121 (a.s.), investiční fond (forma 911-999 dle typu). CZ-NACE: 68.20 (Pronájem a správa nemovitostí). Detekce: pravniForma + CZ-NACE 68.20 → pravděpodobně nemovitostní SPV.

### 8.2 ČÚZK (Katastr nemovitostí)
Celá budova na 1 LV (vlastník = SPV). Pokud prohlášení vlastníka: jednotky v KN (kancelář, obchod, garáže). Zástavní právo: bankovní úvěr (senior debt). Výměra pozemku, BPEJ (u industrial). Způsob využití stavby: budova pro obchod, budova pro administrativu, budova pro průmysl.

### 8.3 RÚIAN
Kód stavebního objektu, adresa, GPS, KÚ. Typ stavby, počet podlaží, zastavěná plocha. RÚIAN NEobsahuje nájemce ani komerční informace.

### 8.4 Stavební úřad
Kolaudační rozhodnutí (účel užívání → office/retail/warehouse)
Změna užívání: nutný souhlas SÚ (např. office → retail)
Stavební povolení pro tenant fit-out (pokud stavební zásah)

---

## 9. Lease management — klíčový modul

### 9.1 Lifecycle nájemní smlouvy

```
LEAD (CRM)
  │ kvalifikace, prohlídka, HOT (heads of terms)
  ▼
NEGOTIATION
  │ právní review, úpravy smlouvy, due diligence nájemce
  ▼
SIGNING
  │ podpis smlouvy, bankovní záruka / kauce
  ▼
FIT-OUT
  │ stavba prostor, TIA čerpání, dozor pronajímatele
  ▼
HANDOVER
  │ předávací protokol, měřidla, klíče/karty, zahájení nájmu
  ▼
ACTIVE LEASE ←── indexace (roční), SC vyúčtování, prodloužení
  │ rent review, option exercise, lease event tracking
  ▼
LEASE EVENT (break, option, expiry notice)
  │ 12-6 měsíců předem → notifikace → rozhodnutí
  ▼
TERMINATION / RENEWAL
  │ reinstatement prostor, vrácení kauce / BG
  │ NEBO: nová smlouva / amendment
  ▼
VACANCY (re-letting)
  │ marketing volných prostor → zpět na LEAD
```

### 9.2 Lease events (kritický tracking)

| Event | Kdy | Notifikace |
|-------|-----|------------|
| Rent commencement | Start nájmu | 30 dní předem |
| First rent-free expiry | Konec rent-free období | 15 dní předem |
| Indexace | Výročí smlouvy | 60 dní předem |
| Break option (nájemce) | Dle smlouvy (typicky rok 3/5) | 12 měsíců předem |
| Break option (pronajímatel) | Dle smlouvy | 12 měsíců předem |
| Option to renew | 6-12 měsíců před expiry | 18 měsíců předem |
| Lease expiry | Konec doby nájmu | 18-24 měsíců předem |
| BG/kauce expiry | Platnost bankovní záruky | 60 dní předem |
| Pojistka nájemce expiry | Roční obnova | 30 dní předem |

### 9.3 Rent roll (přehled nájmů)

Klíčový dokument — snapshot všech aktivních nájmů v budově:

| Pole | Popis |
|------|-------|
| Nájemce | Název firmy, IČO |
| Jednotka | Číslo, podlaží, m² NLA |
| Smlouva od-do | Začátek a konec nájmu |
| WAULT | Zbývající doba nájmu |
| Base rent | EUR/m²/měs + celkem měs |
| Indexace | Typ + datum příští indexace |
| SC záloha | EUR/m²/měs |
| Parking | Počet stání, cena |
| Break clause | Datum, podmínky |
| Next event | Nejbližší lease event |
| Stav | Active / Notice / Vacant |

---

## 10. Mapování na ifmio modely

| Reálná entita | ifmio model | Poznámka |
|---------------|-------------|----------|
| Komerční budova | Property (type: COMMERCIAL_OFFICE / COMMERCIAL_RETAIL / COMMERCIAL_INDUSTRIAL) | Nový PropertyType enum hodnoty |
| Vlastník (SPV) | KbOrganization + PropertyOwnership | |
| Komerční jednotka | Unit (unitType: OFFICE / RETAIL / WAREHOUSE / PARKING) | Rozšířit UnitType |
| Nájemce (firma) | Party (type: ORGANIZATION) + Tenancy | Tenancy rozšířit o komerční pole |
| Nájemní smlouva | **LeaseAgreement** (NOVÝ model) | Viz §10.1 |
| Kontaktní osoba | Party (type: PERSON) + TenancyContact | |
| Service charges | **ServiceChargeSchedule** (NOVÝ) | SC rozpis + vyúčtování |
| Property Manager | Tenant + ManagementContract (role: PM) | |
| Facility Manager | Tenant + ManagementContract (role: FM) | |
| Asset Manager | TenantUser (role: ASSET_MANAGER) | |
| Lease event | **LeaseEvent** (NOVÝ model) | Tracking + notifikace |
| Rent roll | Computed view z LeaseAgreement + Unit + Tenancy | |
| Fit-out | WorkOrder (type: FIT_OUT) + budget tracking | |
| Bankovní záruka | **BankGuarantee** (NOVÝ model) | Nebo rozšířit Deposit |
| CAPEX plán | **CapexPlan** + **CapexItem** (NOVÉ) | |
| Marketing fond | FundRepair adaptace (type: MARKETING) | |

### 10.1 Nový model: LeaseAgreement

```prisma
model LeaseAgreement {
  id                    String   @id @default(cuid())
  tenantId              String   // ifmio tenant
  propertyId            String   // budova
  unitId                String   // pronajatá jednotka
  tenancyId             String   // nájemce (Party/Tenancy)

  // Identifikace
  contractNumber        String   // číslo smlouvy
  status                LeaseStatus // DRAFT, ACTIVE, NOTICE, TERMINATED, EXPIRED

  // Doba
  leaseStart            DateTime
  leaseEnd              DateTime?
  isIndefinite          Boolean  @default(false)
  rentFreeStart         DateTime?
  rentFreeEnd           DateTime?
  handoverDate          DateTime?

  // Nájemné
  baseRentAmount        Decimal
  baseRentCurrency      String   @default("CZK") // CZK nebo EUR
  baseRentPeriod        RentPeriod // MONTHLY, QUARTERLY, ANNUALLY
  baseRentPerSqm        Decimal? // pro přehlednost
  vatRate               Decimal  @default(21)

  // Indexace
  indexationType        IndexationType // CPI, FIXED_PERCENT, NONE
  indexationPercent      Decimal? // pokud FIXED_PERCENT
  indexationDate         DateTime? // datum příští indexace
  indexationReferenceMonth Int? // CPI reference měsíc

  // Turnover rent (retail)
  hasTurnoverRent       Boolean  @default(false)
  turnoverPercentage    Decimal?
  turnoverThreshold     Decimal?

  // Service charges
  scBudgetAmount        Decimal? // roční SC budget
  scBudgetPerSqm        Decimal?

  // Parking
  parkingSpaces         Int      @default(0)
  parkingRatePerSpace   Decimal?

  // Kauce / BG
  depositType           DepositType? // CASH, BANK_GUARANTEE, PARENT_GUARANTEE
  depositAmount         Decimal?
  depositBgExpiry       DateTime?

  // Break / option
  breakDateTenant       DateTime?
  breakDateLandlord     DateTime?
  breakNoticePeriod     Int? // měsíce
  renewalOptionYears    Int? // počet let opce
  renewalOptionDeadline DateTime?

  // Fit-out
  fitOutAllowance       Decimal? // TIA částka
  fitOutDeadline        DateTime?
  reinstatementRequired Boolean  @default(true)

  // Meta
  notes                 String?
  documentIds           String[] // přílohy (smlouva PDF, přílohy)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  createdBy             String?

  // Relations
  property              Property @relation(fields: [propertyId], references: [id])
  unit                  Unit     @relation(fields: [unitId], references: [id])
  tenancy               Tenancy  @relation(fields: [tenancyId], references: [id])
  events                LeaseEvent[]
  scSchedules           ServiceChargeSchedule[]
}

enum LeaseStatus {
  DRAFT
  ACTIVE
  NOTICE        // výpovědní lhůta běží
  TERMINATED
  EXPIRED
}

enum RentPeriod {
  MONTHLY
  QUARTERLY
  ANNUALLY
}

enum IndexationType {
  CPI
  FIXED_PERCENT
  NONE
}

enum DepositType {
  CASH
  BANK_GUARANTEE
  PARENT_GUARANTEE
}
```

### 10.2 Nový model: LeaseEvent

```prisma
model LeaseEvent {
  id               String         @id @default(cuid())
  leaseAgreementId String
  eventType        LeaseEventType
  eventDate        DateTime       // kdy má nastat
  notifyDate       DateTime       // kdy notifikovat (předem)
  status           EventStatus    // UPCOMING, NOTIFIED, ACTIONED, MISSED
  description      String?
  actionRequired   String?        // co má PM udělat
  actionedAt       DateTime?
  actionedBy       String?
  notes            String?
  createdAt        DateTime       @default(now())

  leaseAgreement   LeaseAgreement @relation(fields: [leaseAgreementId], references: [id])
}

enum LeaseEventType {
  RENT_COMMENCEMENT
  RENT_FREE_EXPIRY
  INDEXATION
  BREAK_OPTION_TENANT
  BREAK_OPTION_LANDLORD
  RENEWAL_OPTION
  LEASE_EXPIRY
  BG_EXPIRY
  INSURANCE_EXPIRY
  RENT_REVIEW
  SC_RECONCILIATION
  CUSTOM
}

enum EventStatus {
  UPCOMING
  NOTIFIED
  ACTIONED
  MISSED
}
```

---

## 11. Rozšíření existujících modelů

### 11.1 PropertyType enum — nové hodnoty

```typescript
enum PropertyType {
  // Existující
  SVJ = 'SVJ',
  BD = 'BD',
  RENTAL_HOUSE = 'RENTAL_HOUSE',
  MUNICIPAL = 'MUNICIPAL',

  // NOVÉ — komerční
  COMMERCIAL_OFFICE = 'COMMERCIAL_OFFICE',
  COMMERCIAL_RETAIL = 'COMMERCIAL_RETAIL',
  COMMERCIAL_INDUSTRIAL = 'COMMERCIAL_INDUSTRIAL',
  COMMERCIAL_LOGISTICS = 'COMMERCIAL_LOGISTICS',
  COMMERCIAL_MIXED = 'COMMERCIAL_MIXED', // smíšený komerční (office + retail)

  // Budoucí
  FAMILY_HOUSE = 'FAMILY_HOUSE',
  LAND = 'LAND',
  MIXED_USE = 'MIXED_USE', // bytový dům s komerčními prostory
}
```

### 11.2 UnitType enum — nové hodnoty

```typescript
enum UnitType {
  // Existující
  APARTMENT = 'APARTMENT',
  NON_RESIDENTIAL = 'NON_RESIDENTIAL',
  GARAGE = 'GARAGE',
  CELLAR = 'CELLAR',
  PARKING = 'PARKING',
  COMMON = 'COMMON',

  // NOVÉ — komerční
  OFFICE = 'OFFICE',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
  PRODUCTION = 'PRODUCTION',
  SERVER_ROOM = 'SERVER_ROOM',
  CONFERENCE = 'CONFERENCE',
  CANTEEN = 'CANTEEN',
  RECEPTION = 'RECEPTION',
  LOADING_DOCK = 'LOADING_DOCK',
}
```

### 11.3 Tenancy rozšíření

```prisma
// Rozšířit existující Tenancy model o komerční pole:
model Tenancy {
  // ... existující pole ...

  // Komerční rozšíření
  companyName          String?    // Název firmy nájemce
  companyIco           String?    // IČO
  companyDic           String?    // DIČ
  companyAres          Json?      // Cache ARES dat
  contactPerson        String?    // Kontaktní osoba
  contactEmail         String?
  contactPhone         String?
  businessActivity     String?    // Účel nájmu (obchodní činnost)

  leaseAgreements      LeaseAgreement[]
}
```

---

## 12. Workflow v ifmio — komerční specifika

### 12.1 Nový nájemce flow

```
1. LEAD v CRM → kvalifikace, prohlídka, HOT
2. Due diligence: ARES check (IČO), ISIR (insolvence), reference
3. Smlouva: draft → review → podpis → LeaseAgreement created
4. Kauce/BG: přijetí + evidence (BankGuarantee model)
5. Fit-out: WorkOrder (type: FIT_OUT), milestones, TIA tracking
6. Handover: předávací protokol, měřidla, přístupy
7. Aktivace: LeaseAgreement status → ACTIVE, zahájení fakturace
8. Auto-generované LeaseEvents pro všechny termíny
```

### 12.2 SC vyúčtování flow (roční)

```
1. SC budget (leden) → odsouhlasení nájemci
2. Měsíční zálohy → fakturace
3. Celoroční sběr skutečných nákladů (doklady, faktury)
4. Roční vyúčtování (Q1 následujícího roku):
   a) Skutečné náklady per kategorie
   b) Alokace per nájemce (dle m² NLA nebo dohodnutého klíče)
   c) Porovnání se zálohami → přeplatek / nedoplatek
5. Odeslání nájemcům (open book)
6. Reklamační lhůta (30 dní)
7. Vyrovnání (dobropis / dofakturace)
```

### 12.3 Indexace flow (automatický)

```
1. LeaseEvent (INDEXATION) → notifikace PM 60 dní předem
2. PM ověří: CPI index (ČSÚ) nebo fixní procento
3. Výpočet nového nájemného
4. Oznámení nájemci (amendment / notification letter)
5. Update LeaseAgreement.baseRentAmount
6. Nový LeaseEvent pro příští rok
7. Aktualizace fakturace
```

---

## 13. Certifikace a ESG

### 13.1 BREEAM (Building Research Establishment Environmental Assessment Method)
UK standard, nejčastější v ČR. Hodnocení: Pass, Good, Very Good, Excellent, Outstanding. Kategorie: Energy, Health & Wellbeing, Innovation, Land Use, Materials, Management, Pollution, Transport, Waste, Water. Certifikátor: BRE Global. Platnost: neomezená (ale re-certifikace doporučena).

### 13.2 LEED (Leadership in Energy and Environmental Design)
US standard (USGBC). Hodnocení: Certified, Silver, Gold, Platinum. V ČR méně časté než BREEAM. Platnost: neomezená.

### 13.3 WELL (International WELL Building Institute)
Zaměření na zdraví uživatelů budovy. Air, Water, Nourishment, Light, Movement, Thermal Comfort, Sound, Materials, Mind, Community. Roste popularita post-COVID.

### 13.4 V ifmio
- Certifikace jako atribut Property (certType, certLevel, certDate, certExpiry)
- ESG reporting data: energetická spotřeba, CO2 emise, voda, odpady
- Povinné pro velké firmy od 2025 (CSRD/ESRS direktivy)

---

## 14. Kritické zákony

- NOZ §2302-2315 — Nájem prostoru sloužícího k podnikání
- NOZ §2332-2357 — Pacht (pokud nájemce provozuje podnik)
- Zákon 235/2004 Sb. — DPH (komerční nájem = zdanitelný)
- Zákon 563/1991 Sb. — Účetnictví
- Zákon 586/1992 Sb. — Daň z příjmů (odpisy, DPPO)
- Zákon 240/2013 Sb. — Investiční společnosti a fondy
- Zákon 256/2004 Sb. — Podnikání na kapitálovém trhu
- Zákon 338/1992 Sb. — Daň z nemovitých věcí
- Vyhláška 268/2009 Sb. — Technické požadavky na stavby
- Vyhláška 246/2001 Sb. — Požární prevence
- Zákon 100/2001 Sb. — EIA (posuzování vlivů na ŽP)
- Zákon 406/2000 Sb. — Hospodaření energií (PENB, energetický audit)
- Nařízení EU 2020/852 — Taxonomie (ESG klasifikace)
- Směrnice EU 2022/2464 — CSRD (ESG reporting)

# IFMIO – Smíšený dům (SVJ + komerční prostory): Doménový model

> Verze: 1.0 | 2026-04-04 | Zdroj pravdy pro implementaci smíšených domů v ifmio
> Companion dokument ke SVJ, BD, Nájemní dům a Komerční nemovitost domain modelům

---

## 1. Co je smíšený dům

Smíšený dům (mixed-use building) je budova, kde se kombinují REZIDENČNÍ a KOMERČNÍ prostory pod jednou střechou. Nejčastější varianta v české praxi: bytový dům (SVJ nebo BD), kde přízemí / 1. NP obsahuje komerční prostory — obchody, restaurace, kanceláře, ordinace, provozovny služeb.

### Proč je to komplexní

Smíšený dům kombinuje DVA odlišné právní režimy nájmu, DVĚ sady finančních toků, DVĚ úrovně DPH a DVĚ skupiny uživatelů v rámci jednoho objektu se sdílenými společnými prostory a technickými systémy.

### Jak časté to je

V českých městech je smíšený dům NORMA, ne výjimka. Většina prvorepublikových bytových domů (Praha, Brno, Ostrava, Plzeň) má komerční prostory v přízemí. Odhadem 30-40% všech SVJ v ČR spravuje alespoň jednu nebytovou jednotku.

### Varianty v praxi

```
Smíšený dům
│
├── A) SVJ + komerční prostory v přízemí (NEJČASTĚJŠÍ)
│   Byty: vlastníci (SVJ členové)
│   Přízemí: obchod, restaurace, kancelář (vlastník = SVJ nebo jiný vlastník)
│   Správa: SVJ spravuje celek, komerční nájmy řeší vlastník nebytové jednotky
│
├── B) BD + komerční prostory
│   Byty: družstevní (členové BD)
│   Přízemí: komerční (BD = vlastník, pronajímá)
│   Správa: BD řeší vše (byty i komerci)
│
├── C) Nájemní dům + komerční prostory
│   Byty: 1 vlastník pronajímá byty
│   Přízemí: 1 vlastník pronajímá komerční prostory
│   Správa: vlastník/správce řeší vše
│
├── D) SVJ + celé patro kanceláří
│   Byty: 2.-6. NP
│   Kanceláře: 1. NP (jedno velké IČO nájemce nebo multi-tenant)
│   Typické u přestavěných bytových domů v centru
│
├── E) Vertikální mix
│   Přízemí: retail
│   1.-3. NP: kanceláře
│   4.-8. NP: byty
│   Podzemí: garáže
│   Typické u nových developerských projektů
│
└── F) Dům s ordinacemi / službami
    Byty: horní patra
    Přízemí: lékařské ordinace, kadeřnictví, pojišťovna
    Velmi časté u menších měst
```

---

## 2. Právní struktura — SVJ s nebytovými prostory

### 2.1 Nebytová jednotka v SVJ

Nebytový prostor (komerční) je v SVJ evidován jako JEDNOTKA v katastru nemovitostí — stejně jako byt. Má vlastní:
- Číslo jednotky (např. 1883/101 — číslo za lomítkem odlišuje od bytů)
- Výměru (m²)
- Podíl na společných částech (spoluvlastnický podíl — zlomek)
- Vlastníka (může být odlišný od vlastníků bytů)
- List vlastnictví

### 2.2 Kdo může vlastnit nebytovou jednotku

**A) SVJ samo** — SVJ může vlastnit nebytový prostor PRO ÚČELY SPRÁVY (NOZ §1195). Typicky: kancelář správce, sklad nářadí. SVJ MŮŽE pronajímat nebytový prostor a mít z toho příjem (ale primární účel musí být správa domu). Pokud SVJ pronajímá: příjem z nájmu → příjem SVJ → DPH implikace!

**B) Individuální vlastník** — Fyzická nebo právnická osoba vlastní nebytovou jednotku. Je členem SVJ (hlasuje dle podílu na SČ). Pronajímá prostor třetím stranám. Nese odpovědnost za nájemce (hluk, provoz, odpady...).

**C) Developer / investor** — Neprodal nebytové prostory, zůstaly v jeho vlastnictví. Pronajímá je komerčně. Typické u nových projektů.

### 2.3 Práva a povinnosti vlastníka nebytové jednotky v SVJ

Vlastník nebytové jednotky má STEJNÁ práva jako vlastník bytu:
- Hlasování na shromáždění (dle podílu na SČ)
- Právo být volen do výboru
- Přístup ke společným částem

Ale TAKÉ STEJNÉ povinnosti:
- Platí fond oprav (dle podílu na SČ)
- Platí zálohy na služby
- Dodržuje stanovy a domovní řád
- Udržuje jednotku (aby neohrožoval ostatní)

**Specifické povinnosti:**
- Zajistit, aby provozovna nesloužila k činnosti obtěžující ostatní (hluk, zápach, vibrace)
- Zajistit přístup nájemce k fasádě/výloze BEZ poškození společných částí
- Odpovědnost za nájemce vůči SVJ (pokud nájemce poruší domovní řád)
- Stavební úpravy v nebytovém prostoru: nutný souhlas shromáždění pokud zasahují do SČ

---

## 3. Finanční specifika smíšeného domu

### 3.1 Trojitý finanční systém

```
═══════════════════════════════════════════════════
PŘÍJMY SVJ
═══════════════════════════════════════════════════

Vlastníci BYTŮ ──────────────────┐
  └── Fond oprav (dle podílu SČ) │
  └── Zálohy na služby           ├──► ÚČET SVJ
  └── Pojištění (podíl)          │      │
                                 │      │
Vlastníci NEBYTOVÝCH prostor ────┘      │
  └── Fond oprav (dle podílu SČ)        │
  └── Zálohy na služby                  │
  └── Pojištění (podíl)                 │
  └── Případně VYŠŠÍ příspěvek*         │
                                        │
Příjem z pronájmu (pokud SVJ vlastní) ──┘
  └── Nájemné od komerčního nájemce
  └── DPH (pokud SVJ plátce)

═══════════════════════════════════════════════════
KOMERČNÍ NÁJEMNÉ (mimo SVJ)
═══════════════════════════════════════════════════

Komerční nájemce ──► Vlastník nebytové jednotky
  └── Nájemné (NOZ §2302 — nechráněný nájem)
  └── Service charges (přeúčtované náklady)
  └── DPH (povinně s DPH)
  └── Kauce / bankovní záruka

Vlastník nebytové jednotky ──► SVJ
  └── Fond oprav (svůj podíl)
  └── Zálohy na služby
  └── Příplatek za komerční využití (pokud stanovy)
```

*Stanovy SVJ MOHOU stanovit VYŠŠÍ příspěvek na správu pro nebytové prostory (NOZ §1180). Důvod: komerční prostory generují vyšší opotřebení společných částí (více návštěvníků, zásobování, odpady).

### 3.2 DPH komplikace — nejkritičtější oblast

**Scénář A: SVJ je NEPLÁTCE DPH (nejčastější u čistě bytových SVJ)**
- Příspěvky vlastníků: bez DPH
- Pokud SVJ pronajímá nebytový prostor a příjem překročí 2 mil Kč/rok → SVJ se MUSÍ registrovat jako plátce
- V praxi: většina SVJ je pod limitem (pronájem 1-2 nebytových prostor za 10-30 tis Kč/měs = 120-360 tis Kč/rok)

**Scénář B: SVJ je PLÁTCE DPH (kvůli komerčním příjmům)**
- Zdanitelné plnění: pronájem nebytových prostor (21% DPH)
- Osvobozené plnění: příspěvky vlastníků bytů na správu
- KRÁCENÝ ODPOČET DPH: SVJ nemůže odečíst 100% DPH z přijatých faktur — musí krátit poměrem zdanitelných/celkových příjmů
- Koeficient krácení: typicky 5-20% (dle podílu komerčních příjmů)
- Administrativní náročnost: měsíční přiznání DPH, kontrolní hlášení, evidence

**Příklad DPH koeficientu:**
```
Roční příjmy SVJ:
├── Příspěvky vlastníků: 1 200 000 Kč (osvobozeno)
├── Pronájem obchodu: 240 000 Kč (zdanitelné + DPH)
└── Celkem: 1 440 000 Kč

Koeficient krácení: 240 000 / 1 440 000 = 16,67%
→ SVJ může odečíst pouze 16,67% DPH z přijatých faktur

Faktura za opravu střechy: 500 000 Kč + 105 000 Kč DPH
→ Odpočet DPH: 105 000 × 16,67% = 17 504 Kč (místo plných 105 000 Kč)
```

**Scénář C: Vlastník nebytové jednotky (ne SVJ) pronajímá**
- Vlastník je plátce DPH → nájemné s DPH
- SVJ se to NETÝKÁ — příjem z nájmu jde vlastníkovi, ne SVJ
- SVJ pouze inkasuje od vlastníka fond oprav + služby (bez DPH)

### 3.3 Rozúčtování služeb — komerční vs rezidenční

**Teplo (vyhláška 269/2015 Sb.):**
- Nebytové prostory (obchody, restaurace) mají ODLIŠNÝ režim vytápění
- Provozní doba: byty 0-24h, obchody 8-20h
- Často samostatný zdroj tepla / klimatizace
- Pokud na společném rozvodu: rozúčtování dle m² + měřidla
- Komerční nájemce může mít vlastní měřič tepla (submetering)

**Voda:**
- Komerční prostory: vlastní vodoměr (povinně pokud odlišná spotřeba)
- Restaurace, kadeřnictví: výrazně vyšší spotřeba → vlastní měřidlo
- Pokud bez vlastního měřidla: paušál nebo přepočet dle normy

**Elektřina společných prostor:**
- Komerční prostory mohou mít vlastní odběrné místo (SAMOSTATNÝ elektroměr)
- Společná elektřina (chodby, výtah, osvětlení): rozúčtování dle podílu SČ
- Komerční prostory často požadují vyšší příkon → posílení přípojky

**Úklid:**
- Přízemní komerční prostory generují více nečistot (zákazníci, zásobování)
- Stanovy mohou stanovit vyšší příspěvek na úklid pro nebytové jednotky

**Odpady:**
- Komerční producent odpadu: VLASTNÍ smlouva s odpadovou firmou (IČO = povinnost)
- Komunální odpad od zákazníků obchodu: řeší nájemce, NE SVJ

**Výtah:**
- Komerční prostory v přízemí výtah nepoužívají → stanovy mohou stanovit nulový příspěvek

### 3.4 Předpis platby — příklad smíšeného domu

```
═══════════════════════════════════════════════════
PŘEDPIS: Byt č. 1883/5 (3+kk, 75 m², podíl 30/17021)
Vlastník: Jan Novák
═══════════════════════════════════════════════════
Fond oprav:           2 250 Kč (75 m² × 30 Kč)
Správce:                300 Kč
Pojištění budovy:        51 Kč (podíl)
Teplo:                2 100 Kč
Teplá voda:             650 Kč
Studená voda:           450 Kč
Úklid:                  200 Kč
Výtah:                  150 Kč
Osvětlení SČ:            80 Kč
Domovník:               100 Kč
────────────────────────────────────
CELKEM:               6 331 Kč/měs
VS: 18835 | Splatnost: 25. předchozího měsíce


═══════════════════════════════════════════════════
PŘEDPIS: Nebytový prostor č. 1883/101 (obchod, 120 m², podíl 60/17021)
Vlastník: ABC Retail s.r.o.
═══════════════════════════════════════════════════
Fond oprav:           4 800 Kč (120 m² × 40 Kč) *VYŠŠÍ SAZBA*
Správce:                400 Kč
Pojištění budovy:        85 Kč (podíl)
Teplo:                    0 Kč (vlastní vytápění)
Teplá voda:               0 Kč (vlastní měřidlo → přímá fakturace)
Studená voda:             0 Kč (vlastní měřidlo → přímá fakturace)
Úklid:                  400 Kč *VYŠŠÍ SAZBA*
Výtah:                    0 Kč (přízemí — nevyužívá)
Osvětlení SČ:           160 Kč (podíl — dvojnásobek kvůli vstupním dveřím)
Domovník:               200 Kč
Příplatek komerční:     500 Kč (dle stanov — zvýšené opotřebení SČ)
────────────────────────────────────
CELKEM SVJ:           6 545 Kč/měs
VS: 1883101 | Splatnost: 25. předchozího měsíce

PLUS: Vlastník sám inkasuje od svého nájemce:
  Komerční nájemné:  35 000 Kč + DPH 7 350 Kč
  SC přeúčtování:     5 000 Kč + DPH 1 050 Kč
  ═══════════════════════════════════════════
  Celkem nájemce platí vlastníkovi: 48 400 Kč/měs
```

---

## 4. Stavebně-technické specifika

### 4.1 Společné technické systémy

Smíšený dům má sdílené systémy, ale s odlišnými požadavky per sekci:

| Systém | Rezidenční část | Komerční část | Řešení |
|--------|----------------|---------------|--------|
| Vchod | Hlavní vchod (uzamčený, domácí telefon) | Vlastní vchod z ulice (otevřený pro zákazníky) | Oddělené vstupy |
| Výtah | Pro rezidenty (klíčovka/čip) | Obvykle nevyužívá (přízemí) | Rozdělení nákladů |
| Elektro | Společný rozvod, měřidla per byt | Vlastní odběrné místo (vyšší příkon) | Oddělené elektroměry |
| Voda | Společná přípojka, měřidla per byt | Vlastní vodoměr (vyšší spotřeba) | Submetering |
| Teplo | Centrální kotelna / CZT | Vlastní VZT / klimatizace nebo napojeno na centrál | Submetering / oddělené |
| Odpady | Společné popelnice (komunál) | Vlastní smlouva (živnostenský odpad) | Oddělená evidence |
| Internet | Společné rozvody (UPC/O2) | Vlastní přípojka (business internet) | Oddělené |
| Kanalizace | Společný svod | Tukový lapač (restaurace povinně!) | Stavební úprava |
| Vzduchotechnika | Přirozené větrání | Nucené větrání / VZT (povinné u gastro) | Vlastní VZT |
| Požární ochrana | Společný EPS (pokud je) | Vlastní EPS + SHZ (dle účelu) | Propojené |

### 4.2 Kritické body střetu

**Fasáda a výloha:**
- Komerční nájemce chce výlohu, reklamu, markýzu
- Fasáda = SPOLEČNÁ ČÁST → souhlas shromáždění SVJ
- Stavební zásah: souhlas ≥75% všech hlasů
- Reklamní tabule: souhlas shromáždění + stavební úřad (místní regulace)

**Zásobování:**
- Obchod/restaurace: pravidelné zásobování → hluk, blokování vchodu
- Řešení: stanovení hodin zásobování v domovním řádu
- Parkování dodavatelů: problém v centru města

**Hluk a zápach:**
- Restaurace: kuchyňský odtah, hluk provozu, music
- Noční provoz (bar, klub): §1013 NOZ — neúměrné obtěžování
- Řešení: stanovy + domovní řád + nájemní smlouva s omezeními

**Odpady:**
- Komerční odpad: oddělená evidence a smlouva
- Gastro: bioodpad, tukový lapač
- Stavební odpad z fit-outu: povinnost nájemce

---

## 5. Varianty smíšeného domu — detailní scénáře

### 5.1 Scénář A: SVJ + obchod v přízemí (vlastník = člen SVJ)

```
Bytový dům Na Příkopě 15, Praha 1
│
├── SVJ "Společenství vlastníků Na Příkopě 15" (IČO: 28123456)
│   ├── 12 bytových jednotek (2.-5. NP)
│   ├── 1 nebytová jednotka (přízemí — obchod, 120 m²)
│   └── Podíly: byty = 16 841/17 021, obchod = 180/17 021
│
├── Vlastník bytu č. 1 → Jan Novák (bydlí v bytě)
├── Vlastník bytu č. 2 → Eva Dvořáková (pronajímá nájemníkovi)
├── ...
├── Vlastník bytu č. 12 → Petr Černý
│
└── Vlastník nebytové jednotky č. 101 → ABC Retail s.r.o.
    └── Pronajímá obchod nájemci: Květinářství Růže s.r.o.
        └── Nájemní smlouva (NOZ §2302): 35 000 Kč/měs + DPH
        └── Kauce: 105 000 Kč
        └── Doba: neurčitá, výpovědní lhůta 6 měsíců
```

**Finanční toky v ifmio:**
```
Květinářství Růže s.r.o. ──(nájemné 35k+DPH)──► ABC Retail s.r.o.
                                                      │
ABC Retail s.r.o. ──(fond oprav + služby 6 545 Kč)──► SVJ účet
Jan Novák ──(fond oprav + služby 6 331 Kč)──────────► SVJ účet
Eva Dvořáková ──(fond oprav + služby 6 331 Kč)──────► SVJ účet
...
Nájemník Evy D. ──(nájemné 18 500 + služby 4 200)──► Eva Dvořáková
```

**ifmio implementace:**
- Property: type = SVJ (primární typ)
- Unit 1883/101: unitType = NON_RESIDENTIAL (nebo RETAIL)
- ABC Retail s.r.o.: Party (ORGANIZATION) + UnitOwnership (vlastník jednotky v SVJ)
- Květinářství Růže: Party (ORGANIZATION) + Tenancy (komerční nájemce)
- LeaseAgreement: komerční smlouva mezi ABC Retail a Květinářství
- Fond oprav: PaymentPrescription pro ABC Retail (vyšší sazba)

### 5.2 Scénář B: SVJ + nebytové prostory ve vlastnictví SVJ

```
Bytový dům Vinohradská 42, Praha 2
│
├── SVJ vlastní:
│   ├── Nebytový prostor 101 (obchod, 80 m²) — PRONAJÍMÁ
│   │   └── Nájemce: Pekařství Zrno s.r.o. → 25 000 Kč/měs
│   └── Nebytový prostor 102 (kancelář, 30 m²) — VLASTNÍ PRO SPRÁVU
│       └── Kancelář správce / archiv
│
├── 20 bytových jednotek
└── SVJ je PLÁTCE DPH (kvůli pronájmu obchodu >2 mil/rok? NE, 300k/rok)
    → SVJ NENÍ plátce DPH (pod limitem 2 mil Kč)
```

**Specifika:**
- Příjem SVJ z pronájmu = 300 000 Kč/rok → pod DPH limitem → neplátce
- Příjem se zdaní DPPO (ale SVJ může uplatnit osvobození §19b/2h ZDP — příjmy z vlastního majetku)
- Nájemné jde přímo na účet SVJ → snižuje předpisy vlastníkům bytů
- SVJ musí fakturovat nájemci (i bez DPH — prostá faktura)

**ifmio implementace:**
- Unit 101: vlastník = SVJ (KbOrganization = SVJ samotné)
- Tenancy: Pekařství Zrno jako komerční nájemce SVJ
- LeaseAgreement: SVJ jako pronajímatel
- Příjem: evidence na účtu SVJ, párovatelný jako příjem (ne platba vlastníka)

### 5.3 Scénář C: BD + komerční prostory

```
Bytové družstvo Harmonie (IČO: 45678901)
│
├── BD vlastní CELOU budovu
├── 30 družstevních bytů (členové BD)
├── 2 komerční prostory v přízemí:
│   ├── Obchod (100 m²) → nájemce: Potraviny XY s.r.o.
│   └── Kadeřnictví (40 m²) → nájemce: Kadeřnice Jana (OSVČ)
│
└── BD je PLÁTCE DPH:
    ├── Nájemné od členů: osvobozeno
    └── Komerční nájmy: s DPH 21% → krácený odpočet
```

**Specifika:**
- BD pronajímá komerční prostory SAMO (je vlastník celé budovy)
- BD je téměř vždy plátce DPH (komerční příjmy)
- Krácený odpočet DPH (obdobně jako SVJ v scénáři B)
- Příjmy z komerčních nájmů → snižují nájemné členům BD

### 5.4 Scénář D: Nový developerský projekt (vertikální mix)

```
Rezidence Park, Praha 5
│
├── Podzemí: 50 garážových stání (vlastníci bytů nebo investoři)
├── Přízemí: 4 retail jednotky (developer neprodal → pronajímá)
├── 1. NP: coworking hub (1 velký nájemce)
├── 2.-8. NP: 56 bytů (SVJ)
│
├── SVJ "Společenství vlastníků Rezidence Park"
│   ├── Členové: 56 vlastníků bytů + 50 vlastníků garáží + developer (4 retail + 1 NP)
│   └── Developer má VELKÝ podíl na SČ (retail + coworking = ~25% celkového podílu)
│       → Developer OVLÁDÁ hlasování na shromáždění!
│
└── Problém: Developer jako člen SVJ s dominantním podílem
    → Může blokovat rozhodnutí nebo protlačovat vlastní zájmy
    → Řešení: stanovy omezují hlasovací práva developerovi
```

---

## 6. Domovní řád a koexistence

### 6.1 Typická pravidla pro komerční prostory (ve stanovách nebo domovním řádu)

| Oblast | Pravidlo | Sankce |
|--------|---------|--------|
| Provozní doba | Max. 6:00-22:00 (nebo dle typu činnosti) | Pokuta dle stanov |
| Zásobování | Pouze 7:00-10:00 a 14:00-16:00 | Pokuta |
| Hluk | Nepřekročit hygienické limity (NV 272/2011) | Výpověď nájmu |
| Odtah | Kuchyňský odtah dle normy, bez obtěžování | Stavební řízení |
| Reklama | Souhlas shromáždění pro reklamu na fasádě | Odstranění |
| Parkování | Zásobovací zóna, ne před vchodem domu | Odtah |
| Odpady | Vlastní smlouva, oddělené kontejnery | Pokuta |
| Stavební úpravy | Souhlas shromáždění + stavební úřad | Uvedení do původního stavu |
| Pojištění | Povinné pojištění odpovědnosti nájemce | Výpověď nájmu |

### 6.2 Konflikty v praxi — TOP 10

1. **Hluk z restaurace/baru** — nejčastější spor, řeší hygiena + soud
2. **Zápach z kuchyně** — nedostatečný odtah, tukový aerosol
3. **Parkování zásobování** — blokování vchodu/vjezdu
4. **Reklama na fasádě** — bez souhlasu SVJ
5. **Stavební úpravy bez souhlasu** — probourání stěny, nový vchod
6. **Poškození společných prostor** — zásobováním, zákazníky
7. **Odpady** — komerční odpad v domovních popelnicích
8. **Bezpečnost** — nezajištěný vchod kvůli zákazníkům
9. **Developer ovládá SVJ** — blokuje investice do rezidenční části
10. **DPH nesprávně** — SVJ neví, že má být plátcem

---

## 7. Mapování na ifmio modely

### 7.1 Jak ifmio reprezentuje smíšený dům

Smíšený dům NENÍ nový PropertyType — je to Property (type: SVJ/BD/RENTAL_HOUSE) s jednotkami různých typů. Klíčové je, že ifmio musí umět na JEDNÉ nemovitosti (Property) pracovat s:

1. **Rezidenčními jednotkami** — fond oprav, služby, per rollam, vyúčtování
2. **Komerčními jednotkami** — LeaseAgreement, SC, indexace, DPH, break clause
3. **Sdílenými systémy** — rozúčtování nákladů s různými klíči per typ jednotky

### 7.2 Datový model

```
Property (type: SVJ)
│
├── Unit (unitType: APARTMENT) ── 12× ── UnitOwnership ── PaymentPrescription
│   └── Tenancy (rezidenční, volitelně) ── NOZ §2235 (chráněný)
│
├── Unit (unitType: RETAIL) ── 1× ── UnitOwnership
│   └── Tenancy (komerční)
│       └── LeaseAgreement ── NOZ §2302 (nechráněný)
│           ├── LeaseEvents (indexace, break, expiry...)
│           ├── ServiceChargeSchedule
│           └── BankGuarantee / Deposit
│
├── Unit (unitType: OFFICE) ── 1× ── UnitOwnership
│   └── Tenancy (komerční)
│       └── LeaseAgreement
│
├── Unit (unitType: PARKING) ── 10× ── UnitOwnership
│
└── FinancialContext (SVJ kontext)
    ├── PaymentPrescriptions (fond oprav + služby)
    ├── BankTransactions
    ├── Invoices
    └── FundRepair
```

### 7.3 Nová pole / rozšíření pro smíšený dům

**Property model — rozšíření:**
```typescript
// Property (existující) — přidat:
hasMixedUse: boolean        // flag: dům má komerční prostory
mixedUseDescription?: string // popis (např. "obchod v přízemí")
isVatPayer: boolean          // SVJ je plátce DPH?
vatCoefficientPercent?: number // koeficient krácení DPH (%)
```

**Unit model — rozšíření:**
```typescript
// Unit (existující) — přidat:
isCommercial: boolean           // flag pro komerční jednotku
commercialActivity?: string     // účel (obchod, restaurace, kancelář...)
hasOwnElectricMeter: boolean    // vlastní elektroměr
hasOwnWaterMeter: boolean       // vlastní vodoměr
hasOwnHeating: boolean          // vlastní vytápění / VZT
hasOwnEntrance: boolean         // vlastní vchod z ulice
usesElevator: boolean           // používá výtah domu
operatingHours?: string         // provozní doba (JSON: { from: "08:00", to: "20:00" })
```

**PaymentPrescription — rozšíření:**
```typescript
// PaymentPrescription — přidat:
commercialSurcharge?: number    // příplatek za komerční využití (Kč/měs)
elevatorExempt: boolean         // osvobození od výtahu (přízemí)
heatingExempt: boolean          // vlastní vytápění → nepřispívá na centrální
waterExempt: boolean            // vlastní vodoměr → platí přímo dodavateli
```

**ServiceAllocationKey — NOVÝ model:**
```prisma
model ServiceAllocationKey {
  id               String   @id @default(cuid())
  tenantId         String   // ifmio tenant
  propertyId       String   // budova
  serviceType      String   // HEATING, COLD_WATER, HOT_WATER, CLEANING, ELEVATOR, LIGHTING
  allocationMethod AllocationMethod // AREA, SHARE, PERSONS, METERS, FIXED, CUSTOM
  residentialRate  Decimal? // sazba pro rezidenční (Kč/m² nebo Kč/os)
  commercialRate   Decimal? // sazba pro komerční (může být vyšší)
  exemptUnits      String[] // ID jednotek osvobozených (přízemí bez výtahu apod.)
  notes            String?

  property         Property @relation(fields: [propertyId], references: [id])
}

enum AllocationMethod {
  AREA           // dle m² plochy
  SHARE          // dle podílu na SČ
  PERSONS        // dle počtu osob
  METERS         // dle měřidel (vodoměr, kalorimetr)
  FIXED          // pevná částka
  CUSTOM         // vlastní vzorec
}
```

### 7.4 UI implikace

**Property detail stránka:**
- Badge: "Smíšený dům" pokud hasMixedUse = true
- Záložka "Komerční prostory" — přehled nebytových jednotek s nájemci
- Záložka "Lease Management" — přehled LeaseAgreements, events, rent roll
- DPH widget: zobrazit koeficient krácení, upozornění na blížící se DPH limit

**Unit list / detail:**
- Vizuální odlišení komerčních jednotek (jiná ikona, barva)
- Komerční detail: rozšířená karta s LeaseAgreement, SC, BG info
- Rezidenční detail: standardní SVJ/BD view

**Finance:**
- Předpisy: rozlišit rezidenční a komerční (jiná sazba fondu, příplatky)
- Vyúčtování: oddělené klíče pro komerční jednotky
- DPH přiznání: automatický výpočet koeficientu krácení
- Rent roll export: komerční nájmy zvlášť

**Dashboard:**
- KPI: obsazenost komerčních prostor
- Alert: blížící se lease events (break, expiry, indexace)
- Alert: DPH limit (pokud se SVJ blíží 2 mil Kč)
- Příjmy: rozlišení rezidenční vs komerční

---

## 8. Workflow v ifmio — smíšený dům

### 8.1 Onboarding smíšeného domu

```
1. Založení Property (type: SVJ/BD)
2. Import jednotek z ČÚZK (byty + nebytové prostory)
3. Detekce komerčních jednotek → flag isCommercial
4. Nastavení allocation keys (rozúčtovací klíče per služba)
5. Evidence vlastníků (včetně vlastníka nebytové jednotky)
6. Evidence komerčního nájemce (Tenancy + LeaseAgreement)
7. Nastavení předpisů (rezidenční: fond + služby, komerční: fond + služby + příplatek)
8. DPH posouzení (je SVJ plátce? → nastavit koeficient)
9. Auto-generování lease events
```

### 8.2 Měsíční cyklus

```
Rezidenční:
├── Generování předpisů (fond oprav + služby)
├── Párování plateb (Fio API)
├── Dlužníci + upomínky
└── Standardní SVJ workflow

Komerční:
├── Fakturace nájemného (base rent + SC zálohy + parking)
├── DPH výpočet a evidence
├── Párování plateb
├── Lease event monitoring (notifikace PM)
├── Indexace check (CPI/roční výročí)
└── SC tracking (sběr nákladů)

Společné:
├── Bankovní účet SVJ — párovnání VŠECH příjmů (rezidenční + komerční)
├── Faktura od dodavatele → DPH krácení
└── Reporting: společný přehled s rozlišením rezidenční/komerční
```

### 8.3 Roční cyklus

```
Q1 (leden-březen):
├── SC vyúčtování (komerční nájemci) — za předchozí rok
├── Příprava nového SC budgetu
├── Indexace nájemného (CPI k 1.1.)
└── DPH koeficient za předchozí rok (final)

Q2 (duben):
├── Vyúčtování služeb rezidenční (zákon: do 4 měsíců)
├── Vyúčtování služeb komerční (dle smlouvy, typicky do Q1)
└── Přeplatky / nedoplatky (rezidenční + komerční)

Q2-Q3:
├── Příprava shromáždění SVJ
│   └── Zpráva o hospodaření (rezidenční + komerční příjmy)
│   └── Plán oprav (CAPEX) + financování
│   └── DPH status (informovat vlastníky)
├── Revize a údržba (společné systémy)
└── Pojištění: obnova, kontrola krytí

Q4:
├── Budget příštího roku (rezidenční + komerční)
├── SC budget (komerční) → prezentace nájemcům
├── Lease event review (expiry, break options v příštím roce)
└── DPH: výpočet zálohového koeficientu na příští rok
```

---

## 9. DPH v detailu — implementace v ifmio

### 9.1 Automatická DPH detekce

```
IF property.hasMixedUse AND příjem z komerčních nájmů > 0:
  IF celkové zdanitelné příjmy SVJ > 2 000 000 Kč/12 měsíců:
    → ALERT: "SVJ překročilo DPH limit — povinná registrace"
    → property.isVatPayer = true
  ELSE IF celkové zdanitelné příjmy > 1 500 000 Kč:
    → WARNING: "SVJ se blíží DPH limitu"
  ELSE:
    → property.isVatPayer = false (pod limitem)
```

### 9.2 DPH koeficient krácení

```
Vstup:
├── Zdanitelné příjmy (komerční nájmy) = A
├── Osvobozené příjmy (příspěvky vlastníků) = B
└── Celkové příjmy = A + B

Koeficient = A / (A + B) × 100 %

Aplikace:
├── Přijatá faktura (dodavatel): 100 000 Kč + 21 000 Kč DPH
├── Odpočet DPH: 21 000 × koeficient %
└── Náklad SVJ: 100 000 + (21 000 - odpočet)
```

### 9.3 ifmio DPH modul — požadavky

- Automatický výpočet koeficientu z účetních dat
- Měsíční DPH přiznání (generování podkladů)
- Kontrolní hlášení (XML export pro finanční úřad)
- Evidence zdanitelných a osvobozených plnění
- Archiv DPH dokladů
- Alert: blížící se DPH limit u neplátce

---

## 10. Příklady z praxe — pro testovací data

### 10.1 Malé SVJ s obchodem v přízemí (Praha 7)

```
SVJ Letná 15, IČO: 28765432
├── 8 bytů (2.-4. NP), vlastníci: 8 FO
├── 1 obchod v přízemí (85 m²), vlastník: XY Development s.r.o.
│   └── Nájemce: Bio Krámek s.r.o., nájemné: 22 000 Kč/měs
├── SVJ NENÍ plátce DPH (XY Dev inkasuje nájemné, ne SVJ)
├── Fond oprav: byty 30 Kč/m², obchod 45 Kč/m²
├── Obchod nepoužívá výtah, má vlastní elektroměr a vodoměr
└── Celkový měsíční příjem SVJ: ~65 000 Kč (z toho obchod ~5 800 Kč)
```

### 10.2 Velké SVJ s více komerčními prostory (Praha 2)

```
SVJ Vinohradská 120, IČO: 29876543
├── 24 bytů (2.-6. NP), vlastníci: mix FO a PO
├── 3 komerční prostory (přízemí):
│   ├── Restaurace (150 m²), vlastník: SVJ → nájemce: Trattoria s.r.o., 55 000 Kč/měs
│   ├── Kancelář (60 m²), vlastník: SVJ → nájemce: Advokát JUDr. Novák, 18 000 Kč/měs
│   └── Kadeřnictví (35 m²), vlastník: SVJ → nájemce: Hair Studio OSVČ, 12 000 Kč/měs
├── SVJ JE PLÁTCE DPH! (příjmy z nájmů = 1 020 000 Kč/rok → pod limitem,
│   ALE dobrovolná registrace kvůli odpočtu DPH z oprav)
├── DPH koeficient: ~35% (komerční příjmy vs celkové)
├── Problém: restaurace — hluk, zápach, tukový lapač
├── Řešení: nájemní smlouva s přísnými podmínkami + pojištění
└── Celkový měsíční příjem SVJ: ~195 000 Kč (z toho komerční: ~85 000 Kč)
```

### 10.3 Nový development (Praha 5)

```
SVJ Rezidence Smíchov, IČO: 30987654
├── Podzemí: 40 garážových stání
├── Přízemí: 2 retail (vlastník: developer, každý 200 m²)
│   ├── Supermarket (200 m²), nájemce: Žabka s.r.o., 150 000 Kč/měs + 5% turnover
│   └── Lékárna (200 m²), nájemce: Dr. Max a.s., 120 000 Kč/měs
├── 2.-10. NP: 72 bytů
├── Developer má ~30% podíl na SČ (retail + garáže)
│   → Dominantní hlas na shromáždění → potenciální konflikt
├── SVJ NENÍ plátce DPH (developer inkasuje komerční nájmy, ne SVJ)
├── Developer platí SVJ: fond oprav + služby za retail jednotky
│   └── Fond oprav: 50 Kč/m² (vyšší sazba) → 20 000 Kč/měs
│   └── Služby: dle měřidel + podíl na SČ → ~8 000 Kč/měs
└── Lease management: developer má vlastní PM → v ifmio oddělený přístup
```

---

## 11. Implementační priorita v ifmio

### Fáze 1 — Základní podpora (MVP)
- [x] Property type zahrnuje SVJ, BD, RENTAL_HOUSE
- [ ] Unit.unitType rozšířit o RETAIL, OFFICE
- [ ] Unit.isCommercial flag
- [ ] PaymentPrescription: odlišná sazba pro komerční jednotky
- [ ] Vizuální rozlišení komerčních jednotek v UI

### Fáze 2 — Lease Management
- [ ] LeaseAgreement model
- [ ] LeaseEvent model + notifikace
- [ ] Rent roll view
- [ ] Indexace engine (CPI, fixed %)
- [ ] Komerční fakturace (s DPH)

### Fáze 3 — Service Charges & DPH
- [ ] ServiceChargeSchedule model
- [ ] SC vyúčtování (roční)
- [ ] DPH koeficient krácení
- [ ] DPH přiznání podklady
- [ ] ServiceAllocationKey (rozúčtovací klíče per služba per typ jednotky)

### Fáze 4 — Advanced
- [ ] BankGuarantee model
- [ ] Turnover rent (retail)
- [ ] CAPEX plánování
- [ ] ESG / certifikace evidence
- [ ] Multi-PM přístup (developer + SVJ správce)

---

## 12. Kritické zákony (specifické pro smíšený dům)

- NOZ §1180 — Příspěvky na správu: stanovy MOHOU stanovit vyšší příspěvek pro nebytové jednotky
- NOZ §1195 — SVJ může vlastnit jednotky (pro účely správy)
- NOZ §2302-2315 — Nájem prostoru sloužícího k podnikání (nebytové prostory)
- NOZ §1013 — Zákaz imisí (hluk, zápach, vibrace) — ochrana vlastníků bytů
- NOZ §1175 — Stavební úpravy jednotky vyžadující souhlas SVJ
- Zákon 235/2004 Sb. — DPH: krácený odpočet při smíšeném využití
- Vyhláška 269/2015 Sb. — Rozúčtování tepla a vody (specifika pro nebytové prostory)
- Zákon 67/2013 Sb. — Služby spojené s bydlením
- NV 272/2011 Sb. — Ochrana zdraví před hlukem (hygienické limity)
- Zákon 258/2000 Sb. — Ochrana veřejného zdraví (gastro, kadeřnictví)
- Vyhláška 137/2004 Sb. — Hygienické požadavky na stravovací služby
- Zákon 183/2006 Sb. — Stavební zákon: změna účelu užívání (byt → nebyt)

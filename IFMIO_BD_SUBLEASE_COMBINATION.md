# IFMIO – BD + Podnájem člena: Kombinovaný doménový model

> Verze: 1.0 | 2026-04-04
> Člen bytového družstva podnajímá svůj družstevní byt třetí osobě

---

## 1. Klíčový rozdíl: PODNÁJEM, ne pronájem

U BD se NEJEDNÁ o pronájem, ale o PODNÁJEM. Právně:

```
BD (vlastník celého domu)
│   PRONAJÍMATEL
│
├── Člen BD (nájemce — má družstevní podíl)
│   │   NÁJEMCE vůči BD
│   │   PODNAJÍMATEL vůči třetí osobě
│   │
│   └── Podnájemce (třetí osoba — NENÍ člen BD)
│       PODNÁJEMCE
│       Slabší ochrana než nájemce
│       Nemá žádný vztah k BD
```

**Tři strany = tři právní vztahy:**
- BD ↔ Člen: nájemní smlouva (ze zákona, na základě členství)
- Člen ↔ Podnájemce: podnájemní smlouva (NOZ §2274-§2278)
- BD ↔ Podnájemce: žádný přímý vztah (ale BD může podnájem zakázat)

### Proč je to důležité pro ifmio:

| | SVJ + pronájem | BD + podnájem |
|---|----------------|---------------|
| Typ smlouvy | Nájemní smlouva | PODNÁJEMNÍ smlouva |
| Souhlas potřeba | Ne (vlastník rozhoduje sám) | ANO — písemný souhlas BD (představenstva) |
| Ochrana bydlícího | Silná (nájemce = slabší strana) | Slabší (podnájemce má méně práv) |
| Výpovědní lhůta | Min. 3 měsíce ze zákona | Dle dohody (může být i 1 měsíc) |
| Zánik | Vlastník nemůže snadno vypovědět | Podnájem zaniká automaticky se zánikem nájmu |
| Náhradní bydlení | Nájemce má nárok | Podnájemce NEMÁ nárok |

---

## 2. Souhlas BD s podnájmem

Toto je zásadní specifikum — u SVJ vlastník nepotřebuje souhlas nikoho. U BD musí člen získat souhlas družstva.

### Pravidla:

| Situace | Souhlas BD potřeba? |
|---------|-------------------|
| Člen v bytě BYDLÍ a podnajímá ČÁST bytu | NE (NOZ §2274) |
| Člen v bytě NEBYDLÍ a podnajímá CELÝ byt | ANO — písemný souhlas představenstva |
| Stanovy podnájem zakazují | Podnájem NELZE (ani se souhlasem) |
| Stanovy podnájem neupravují | Souhlas nutný dle NOZ §2275 |
| Podnájem bez souhlasu BD | HRUBÉ porušení → výstraha → vyloučení z BD |

### Proces získání souhlasu:

```
1. Člen podá PÍSEMNOU žádost představenstvu BD
   - Jméno podnájemce, datum narození, adresa
   - Doba podnájmu
   - Důvod podnájmu (volitelné)

2. Představenstvo rozhodne (do 30 dnů typicky)
   - Souhlas: písemný, na dobu max. 1 rok (dle stanov)
   - Nesouhlas: bez udání důvodu (BD jako vlastník má právo odmítnout)
   - Poplatek: 0-6 000 Kč/rok (administrativní poplatek, dle stanov)

3. Při nesouhlasu: člen se může odvolat k členské schůzi

4. Po udělení souhlasu:
   - Člen uzavře podnájemní smlouvu s podnájemcem
   - Oznámí BD kontaktní údaje podnájemce do 7 dnů
   - Souhlas se obnovuje (typicky ročně)
```

### ifmio dopad:
- Model: `SubleaseConsent` (žádost, stav, datum udělení, platnost, poplatek)
- Workflow: žádost → schválení představenstvem → oznámení → obnova
- Alert: 30 dní před expirací souhlasu → upozornění na obnovu
- Kontrola: seznam podnájemců v domě pro představenstvo

---

## 3. Trojitý finanční tok

```
Dodavatelé služeb (teplárenská, vodárna...)
        │
        ▼
BD (účet BD) ←── nájemné (účelné náklady) ←── ČLEN BD
        │                                          │
        │                                          │
        ▼                                          ▼
Vyúčtování služeb                      Podnájemní smlouva
(BD → člen)                            (člen → podnájemce)
        │                                          │
        ▼                                          ▼
Přeplatek/nedoplatek                   Podnájemné + zálohy služeb
(BD vrátí/doúčtuje členovi)           (podnájemce platí členovi)
```

### Co platí KDO KOMU:

| Platba | Kdo platí | Komu | Poznámka |
|--------|-----------|------|----------|
| Nájemné BD (účelné náklady) | Člen | BD účet | Fond oprav + splátka úvěru + správa |
| Zálohy na služby | Člen | BD účet | Teplo, voda, úklid, výtah |
| Poplatek za souhlas | Člen | BD účet | 0-6 000 Kč/rok dle stanov |
| Podnájemné | Podnájemce | Člen (osobní účet) | Tržní cena (výrazně vyšší než náklady BD) |
| Zálohy na služby | Podnájemce | Člen (osobní účet) | Přeúčtovatelné položky |
| Elektřina v bytě | Podnájemce | Dodavatel (přímo) | Vlastní smlouva |

### Příklad — měsíční toky:

```
ČLEN PLATÍ BD:                           PODNÁJEMCE PLATÍ ČLENOVI:
├── Fond oprav:         1 650 Kč         ├── Podnájemné:       16 000 Kč
├── Splátka úvěru BD:     800 Kč         ├── Záloha teplo:      1 800 Kč
├── Správa BD:            250 Kč         ├── Záloha TV:           550 Kč
├── Pojištění:             45 Kč         ├── Záloha SV:           380 Kč
├── Záloha teplo:       1 800 Kč         ├── Úklid:               180 Kč
├── Záloha TV:            550 Kč         ├── Výtah:               130 Kč
├── Záloha SV:            380 Kč         └── Osvětlení:            65 Kč
├── Úklid:                180 Kč
├── Výtah:                130 Kč         CELKEM:              19 105 Kč
└── Osvětlení:             65 Kč
CELKEM:                5 850 Kč          VÝNOS ČLENA:
                                         19 105 - 5 850 = 13 255 Kč/měs
Poplatek za souhlas: 2 000 Kč/rok       (před zdaněním)
= 167 Kč/měs
```

**Ziskový spread:** Člen platí BD účelné náklady (~5 850 Kč), podnájemce platí tržní cenu (~19 105 Kč). Rozdíl je výnos člena. Tohle je hlavní motivace pro podnájem družstevních bytů.

---

## 4. Co přeúčtovat a co ne

| Položka | BD → Člen | Člen → Podnájemce | Poznámka |
|---------|----------|-------------------|----------|
| Teplo | ✅ | ✅ Přeúčtovat | Dle spotřeby |
| Teplá voda | ✅ | ✅ Přeúčtovat | Dle vodoměru |
| Studená voda | ✅ | ✅ Přeúčtovat | Dle vodoměru |
| Úklid SČ | ✅ | ✅ Přeúčtovat | Dle dohody |
| Výtah | ✅ | ✅ Přeúčtovat | Dle dohody |
| Osvětlení SČ | ✅ | ✅ Přeúčtovat | Dle dohody |
| Fond oprav | ✅ | ❌ NEPŘEÚČTOVAT | Investice člena do BD |
| Splátka úvěru BD | ✅ | ❌ NEPŘEÚČTOVAT | Investice člena |
| Správa BD | ✅ | ❌ NEPŘEÚČTOVAT | Náklad člena |
| Pojištění | ✅ | ❌ NEPŘEÚČTOVAT | Náklad člena |
| Poplatek za souhlas | — | ❌ NEPŘEÚČTOVAT | Náklad člena |

---

## 5. Podnájemní smlouva — specifika

### Povinné náležitosti:

| Náležitost | Detail |
|------------|--------|
| Smluvní strany | Člen BD (podnajímatel) + podnájemce |
| Předmět | Byt č. X v domě BD [adresa] |
| Právní titul člena | Člen BD, nájemce na základě členství + souhlas BD |
| Doba | Určitá NEBO neurčitá (max. do doby platnosti souhlasu BD) |
| Podnájemné | Výše + splatnost + způsob platby |
| Služby | Výčet, zálohy, rozúčtování |
| Kauce | Zákon nestanoví limit (u podnájmu neplatí limit 3× z §2254!) |
| Souhlas BD | Příloha: kopie písemného souhlasu představenstva |
| Domovní řád | Povinnost dodržovat domovní řád BD |
| Forma | Písemná (vyžadována zákonem) |

### Zánik podnájmu:

| Důvod | Detail |
|-------|--------|
| Uplynutí doby | U smlouvy na dobu určitou |
| Výpověď | Dle smluvené výpovědní lhůty (může být i 1 měsíc) |
| Zánik nájmu člena | Podnájem zaniká AUTOMATICKY (klíčový rozdíl od SVJ!) |
| Vyloučení člena z BD | → zánik členství → zánik nájmu → zánik podnájmu |
| Převod podílu | Nový člen vstupuje do nájmu → podnájem může zůstat (pokud nový člen souhlasí) |
| Odvolání souhlasu BD | BD odvolá souhlas → člen musí podnájem ukončit |
| Smrt člena | Podíl dědí → dědic = nový nájemce → podnájem pokračuje |

**POZOR — řetězový zánik:**
```
BD vyloučí člena za porušení stanov
    → zánik členství v BD
        → zánik nájmu družstevního bytu
            → zánik podnájmu (automaticky!)
                → podnájemce musí vyklidit
                    → podnájemce NEMÁ nárok na náhradní bydlení
```

Toto je zásadní riziko pro podnájemce. ifmio by měl na toto upozornit v nájemním vztahu.

---

## 6. Práva a povinnosti — tři strany

### 6.1 BD (vlastník, pronajímatel)

- Uděluje/odvolává souhlas s podnájmem
- Může podnájem zakázat (bez udání důvodu)
- Vybírá poplatek za souhlas (dle stanov)
- Eviduje podnájemce (pro rozúčtování dle osob)
- Nemá přímý vztah s podnájemcem
- Pokud podnájemce poškodí dům → BD se obrací na ČLENA

### 6.2 Člen BD (nájemce, podnajímatel)

**Vůči BD:**
- Platí nájemné a zálohy na účet BD
- Žádá o souhlas s podnájmem (písemně, předem)
- Hlásí počet osob v bytě (pro rozúčtování)
- Odpovídá za chování podnájemce
- Dodržuje stanovy a domovní řád
- Hlasuje na členské schůzi (1 člen = 1 hlas)

**Vůči podnájemci:**
- Uzavírá podnájemní smlouvu
- Vybírá podnájemné a zálohy na služby
- Vyúčtovává služby
- Odpovídá za stav bytu
- Zprostředkovává komunikaci s BD (opravy SČ, havárie)

### 6.3 Podnájemce

**Práva (SLABŠÍ než nájemce u SVJ!):**
- Užívat byt a společné části
- Reklamovat vyúčtování služeb
- Při smrti podnajímatele: podnájem pokračuje s dědicem

**Nemá právo (na rozdíl od nájemce):**
- Zákonná ochrana dle §2235+ NOZ (to platí jen pro nájem, ne podnájem)
- Automatické prodloužení smlouvy
- Náhradní bydlení při výpovědi
- Přechod podnájmu na člena domácnosti (při smrti)
- Členství v BD ani hlasování na schůzi
- Nahlížet do dokumentů BD

**Povinnosti:**
- Platit podnájemné a zálohy členovi
- Dodržovat domovní řád BD
- Drobné opravy (dle smlouvy)
- Umožnit přístup pro revize, odečty

---

## 7. Dvojité vyúčtování (stejné jako u SVJ + pronájem)

```
BD vyúčtuje členovi:
├── Všechny služby (teplo, voda, úklid...)
├── Dle vyhlášky 269/2015
└── Do 4 měsíců po konci období

Člen vyúčtuje podnájemci:
├── Jen přeúčtovatelné služby
├── Dle zákona 67/2013
├── BEZ fondu oprav, splátky úvěru, správy
└── Do 4 měsíců
```

---

## 8. Daňové aspekty

### Člen BD — příjmy z podnájmu:

Příjmy z podnájmu družstevního bytu = §9 ZDP (příjmy z nájmu):
```
Roční příjem: 16 000 × 12 =           192 000 Kč (samotné podnájemné)
Výdaje paušál 30 %:                   -57 600 Kč
NEBO skutečné výdaje:
  Nájemné BD:            -70 200 Kč (5 850 × 12)
  Poplatek za souhlas:    -2 000 Kč
  Pojištění odpovědnosti:   -800 Kč
  Drobné opravy:          -5 000 Kč
  Celkem skutečné:       -78 000 Kč

Základ daně (paušál):    134 400 Kč → daň 15 % = 20 160 Kč
Základ daně (skutečné):  114 000 Kč → daň 15 % = 17 100 Kč

→ Skutečné výdaje jsou výhodnější (nájemné BD je velký náklad)
→ Ale: u BD NELZE uplatnit odpisy (člen nevlastní byt!)
```

**Klíčový rozdíl od SVJ:** U SVJ vlastník může odepisovat byt (30 let). U BD člen NEMŮŽE odepisovat — nevlastní nemovitost, jen družstevní podíl. Odpis družstevního podílu není možný.

---

## 9. Mapování na ifmio entity

```
BD (KbOrganization, orgType: BD)
│
├── Budova (Building) — celá vlastněná BD
│   │
│   ├── Byt č. 5 (Unit)
│   │   │
│   │   ├── Člen BD: Novák Jan (Party, role: COOPERATIVE_MEMBER)
│   │   │   ├── MembershipRecord (členství v BD, podíl, datum vstupu)
│   │   │   ├── PaymentPrescription BD (nájemné + služby = 5 850 Kč/měs)
│   │   │   │   VS: 5, účet BD
│   │   │   │
│   │   │   ├── SubleaseConsent (souhlas BD s podnájmem)
│   │   │   │   ├── Stav: schváleno
│   │   │   │   ├── Platnost: 1.1.2025 - 31.12.2025
│   │   │   │   ├── Poplatek: 2 000 Kč/rok
│   │   │   │   └── Alert: obnova 30 dní předem
│   │   │   │
│   │   │   └── PODNAJÍMATEL → Podnájemní smlouva (Tenancy, type: SUBLEASE)
│   │   │       ├── od: 1.3.2025, do: 28.2.2026
│   │   │       ├── podnájemné: 16 000 Kč/měs
│   │   │       ├── kauce: 32 000 Kč (2× podnájemné)
│   │   │       └── zálohy služeb: 3 105 Kč/měs
│   │   │
│   │   └── Podnájemce: Dvořáková Eva (Resident, role: SUBTENANT)
│   │       ├── Tenancy (type: SUBLEASE) → člen Novák
│   │       ├── PaymentPrescription PODNÁJEM (podnájemné + služby = 19 105 Kč/měs)
│   │       │   VS: 5, účet ČLENA (ne BD!)
│   │       └── Domácnost: Dvořáková + partner
│   │
│   ├── Byt č. 6 (Unit) — člen bydlí sám (bez podnájmu)
│   │   ├── Člen: Černý Petr (role: COOPERATIVE_MEMBER_OCCUPANT)
│   │   └── PaymentPrescription BD (nájemné + služby)
│   │
│   └── Byt č. 7 ... (další byty)
│
├── Představenstvo BD:
│   ├── Předseda: Ing. Šťastný Karel (člen BD)
│   ├── Člen: Bc. Malá Jana (člen BD)
│   └── Člen: Horák Tomáš (člen BD)
│
└── Správce: Bytová správa s.r.o.
    Příkazní smlouva, 300 Kč/byt/měs
```

### Nové modely pro ifmio:

```typescript
// Souhlas BD s podnájmem
model SubleaseConsent {
  id              String    @id @default(uuid())
  tenantId        String    // tenant scope
  unitId          String    // jednotka
  memberId        String    // člen BD (Party)
  subtenantName   String    // jméno podnájemce
  subtenantDob    DateTime? // datum narození
  requestedAt     DateTime  // datum žádosti
  decidedAt       DateTime? // datum rozhodnutí
  status          SubleaseConsentStatus // PENDING, APPROVED, REJECTED, EXPIRED, REVOKED
  validFrom       DateTime?
  validTo         DateTime? // max 1 rok typicky
  fee             Decimal?  // poplatek za souhlas
  feePaid         Boolean   @default(false)
  rejectionReason String?   // důvod zamítnutí (volitelné)
  decidedBy       String?   // kdo rozhodl (předseda/představenstvo)
  note            String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  unit            Unit      @relation(fields: [unitId], references: [id])
  member          Party     @relation(fields: [memberId], references: [id])
  
  @@index([unitId])
  @@index([memberId])
  @@index([status])
}

enum SubleaseConsentStatus {
  PENDING   // čeká na rozhodnutí představenstva
  APPROVED  // schváleno
  REJECTED  // zamítnuto
  EXPIRED   // vypršela platnost
  REVOKED   // odvoláno družstvem
}

// Rozšíření Tenancy o typ
enum TenancyType {
  LEASE      // standardní nájem (SVJ vlastník → nájemník, nájemní dům)
  SUBLEASE   // podnájem (BD člen → podnájemce)
}
```

---

## 10. Rozdíly SVJ+pronájem vs BD+podnájem v ifmio

| Aspekt | SVJ + pronájem | BD + podnájem |
|--------|---------------|---------------|
| Typ smlouvy | LEASE (nájemní) | SUBLEASE (podnájemní) |
| Souhlas třetí strany | Ne | Ano (SubleaseConsent) |
| Poplatek za souhlas | Ne | 0-6 000 Kč/rok |
| Obnova souhlasu | Ne | Ročně (alert) |
| Kauce limit | Max 3× nájemné | Bez limitu |
| Výpovědní lhůta | Min. 3 měsíce | Dle dohody |
| Zánik při vyloučení | N/A (vlastník nelze vyloučit) | Automatický řetězový zánik |
| Odpisy bytu | Ano (vlastník odepisuje) | Ne (člen nevlastní) |
| Daňové výdaje | Odpisy + opravy + pojištění | Nájemné BD + opravy (bez odpisů!) |
| Role bydlícího | TENANT (nájemce) | SUBTENANT (podnájemce) |
| Ochrana bydlícího | Silná (NOZ §2235+) | Slabší (NOZ §2274+) |
| Hlasovací právo bydlícího | Žádné | Žádné |
| V katastru | Vlastník na LV jednotky | Člen NENÍ v katastru |
| Portál bydlícího | Nájemce vidí svůj předpis | Podnájemce vidí svůj předpis |

---

## 11. Kritické zákony

| Předpis | Vztah | Detail |
|---------|-------|--------|
| ZOK §727-757 | BD ↔ člen | Bytová družstva |
| NOZ §2274-§2278 | Člen ↔ podnájemce | Podnájem |
| NOZ §2275 | Člen → BD | Souhlas s podnájmem |
| NOZ §2215 | Obecný podnájem | Základní pravidla |
| Zákon 67/2013 | Oba vztahy | Služby — dvojité vyúčtování |
| Vyhláška 269/2015 | BD → člen | Rozúčtování tepla/vody |
| ZDP §9 | Člen | Zdanění příjmů z podnájmu |

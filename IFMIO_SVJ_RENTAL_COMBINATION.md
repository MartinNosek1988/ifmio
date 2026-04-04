# IFMIO – SVJ + Pronájem bytu: Kombinovaný doménový model

> Verze: 1.0 | 2026-04-04
> Nejčastější kombinace v praxi: vlastník jednotky v SVJ pronajímá svůj byt nájemníkovi

---

## 1. O co jde

Bytový dům je SVJ. Jeden nebo více vlastníků jednotek svůj byt nepobývá sám, ale pronajímá ho nájemníkovi. Vzniká třívrstvý vztah:

```
SVJ (právnická osoba)
│
├── Vlastník bytu (člen SVJ)
│   │   Je PLÁTCE vůči SVJ (fond oprav + služby)
│   │   Je PRONAJÍMATEL vůči nájemníkovi
│   │   Má DVĚ sady povinností
│   │
│   └── Nájemník (NENÍ člen SVJ)
│       Je PLÁTCE vůči vlastníkovi (nájemné + služby)
│       Nemá přímý vztah k SVJ
│       Ale UŽÍVÁ společné části domu
```

**Klíčový princip:** Nájemník NENÍ členem SVJ. Nemá hlasovací právo. Jeho vztah je výhradně s vlastníkem bytu (pronajímatelem). Ale fakticky bydlí v domě, užívá společné části a generuje spotřebu.

---

## 2. Trojitý finanční tok

```
Dodavatelé služeb (teplárenská, vodárna, elektřina...)
        │
        ▼
SVJ (účet SVJ) ←── zálohy na služby + fond oprav ←── VLASTNÍK bytu
        │                                                    │
        │                                                    │
        ▼                                                    ▼
Vyúčtování služeb                              Nájemní smlouva
(SVJ → vlastník)                               (vlastník → nájemník)
        │                                                    │
        ▼                                                    ▼
Přeplatek/nedoplatek                           Nájemné + zálohy služeb
(SVJ vrátí/doúčtuje vlastníkovi)              (nájemník platí vlastníkovi)
        │                                                    │
        ▼                                                    ▼
Vlastník přeúčtuje                             Vlastník vyúčtuje
nedoplatek/přeplatek                           služby nájemníkovi
nájemníkovi                                    (zákon 67/2013 Sb.)
```

### Co platí KDO KOMU:

| Platba | Kdo platí | Komu | Účel |
|--------|-----------|------|------|
| Fond oprav | Vlastník | SVJ | Příspěvek na správu dle podílu na SČ |
| Zálohy na služby | Vlastník | SVJ | Teplo, voda, úklid, výtah... |
| Pojištění budovy | Vlastník | SVJ (zahrnuté v předpisu) | Podíl na pojistném |
| Odměna správci | Vlastník | SVJ (zahrnuté v předpisu) | Podíl na správě |
| Nájemné | Nájemník | Vlastník | Tržní cena za užívání bytu |
| Zálohy na služby | Nájemník | Vlastník | Teplo, voda v bytě |
| Elektřina v bytě | Nájemník | Dodavatel (přímo) | Vlastní smlouva nájemníka |
| Plyn v bytě | Nájemník | Dodavatel (přímo) | Vlastní smlouva nájemníka |
| Internet/TV | Nájemník | Dodavatel (přímo) | Vlastní smlouva nájemníka |
| Kauce | Nájemník | Vlastník | Jistota (max 3× nájemné) |

### Příklad — měsíční předpisy:

```
VLASTNÍK PLATÍ SVJ:                      NÁJEMNÍK PLATÍ VLASTNÍKOVI:
├── Fond oprav:        2 250 Kč          ├── Nájemné:          18 500 Kč
├── Záloha teplo:      2 100 Kč          ├── Záloha teplo:      2 100 Kč
├── Záloha TV:           650 Kč          ├── Záloha TV:           650 Kč
├── Záloha SV:           450 Kč          ├── Záloha SV:           450 Kč
├── Úklid:               200 Kč          ├── Úklid:               200 Kč
├── Výtah:               150 Kč          ├── Výtah:               150 Kč
├── Osvětlení:            80 Kč          ├── Osvětlení:            80 Kč
├── Pojištění:            73 Kč          └── Odvoz odpadu:        120 Kč
└── Správa:              250 Kč          
CELKEM:               6 203 Kč          CELKEM:              22 250 Kč

VLASTNÍKŮV VÝNOS:
Příjem od nájemníka:    22 250 Kč
- Platba SVJ:           -6 203 Kč
- Daň z nemovitosti:      -150 Kč (měsíční podíl)
- Pojištění odpovědnosti:  -80 Kč
- Rezerva na opravy bytu: -500 Kč
= Čistý výnos:         15 317 Kč/měs (před zdaněním)
```

---

## 3. Dvojité vyúčtování

Ročně probíhají DVĚ vyúčtování:

### 3.1 SVJ → Vlastník (vyúčtování SVJ)

SVJ vyúčtuje služby vlastníkovi jako svému členu:
- Zálohy zaplacené vlastníkem za rok vs skutečné náklady
- Dle vyhlášky 269/2015 Sb. (teplo, voda)
- Přeplatek/nedoplatek → vlastník
- Termín: do 4 měsíců po konci zúčtovacího období

### 3.2 Vlastník → Nájemník (vyúčtování pronajímatele)

Vlastník vyúčtuje služby nájemníkovi:
- Zálohy zaplacené nájemníkem vs skutečné náklady (které vlastník dostal od SVJ)
- Zákon 67/2013 Sb.
- Přeplatek/nedoplatek → nájemník
- Termín: do 4 měsíců

**Důležité:** Vlastník MUSÍ vyúčtovat nájemníkovi, i když SVJ ještě nevyúčtovalo vlastníkovi. V praxi většina vlastníků čeká na vyúčtování SVJ a pak teprve vyúčtovává nájemníkovi (ale formálně by měl stihnout lhůtu).

### 3.3 Co přeúčtovat a co ne

| Položka | SVJ → Vlastník | Vlastník → Nájemník | Poznámka |
|---------|---------------|---------------------|----------|
| Teplo (ÚT) | ✅ | ✅ Přeúčtovat | Dle spotřeby v bytě |
| Teplá voda | ✅ | ✅ Přeúčtovat | Dle vodoměru |
| Studená voda | ✅ | ✅ Přeúčtovat | Dle vodoměru |
| Úklid SČ | ✅ | ✅ Přeúčtovat | Dle dohody |
| Výtah | ✅ | ✅ Přeúčtovat | Dle dohody |
| Osvětlení SČ | ✅ | ✅ Přeúčtovat | Dle dohody |
| Fond oprav | ✅ | ❌ NEPŘEÚČTOVAT | Platí vlastník (je to jeho investice do nemovitosti) |
| Pojištění budovy | ✅ | ❌ NEPŘEÚČTOVAT | Platí vlastník |
| Odměna správci | ✅ | ❌ NEPŘEÚČTOVAT | Platí vlastník |
| Odvoz odpadu | Někdy ✅ | ✅ Přeúčtovat | Dle počtu osob |

**Pravidlo:** Nájemník hradí jen SLUŽBY SPOJENÉ S UŽÍVÁNÍM BYTU. Fond oprav, pojištění, správa = náklad vlastníka (pokrytý z nájemného).

---

## 4. Práva a povinnosti — tři strany

### 4.1 Vlastník bytu (dvojí role)

**Jako člen SVJ:**
- Platí předpisy SVJ (fond oprav + služby)
- Hlasuje na shromáždění (dle podílu na SČ)
- Může být zvolen do výboru
- Odpovídá za chování svého nájemníka vůči SVJ
- Musí dodržovat stanovy a domovní řád
- Za dluhy SVJ ručí dle podílu

**Jako pronajímatel:**
- Uzavírá nájemní smlouvu s nájemníkem
- Vybírá nájemné a zálohy na služby
- Vyúčtovává služby nájemníkovi
- Zajišťuje údržbu UVNITŘ bytu (ne společné části — ty SVJ)
- Vrací kauci při skončení nájmu
- Oznámí SVJ/správci kdo v bytě bydlí (pro rozúčtování dle osob, klíče, přístup)

**Specifické povinnosti:**
- Oznámit SVJ, že byt pronajímá (stanovy mohou vyžadovat)
- Oznámit SVJ počet osob v bytě (pro rozúčtování)
- Zajistit, aby nájemník dodržoval domovní řád SVJ
- Nést odpovědnost za škody způsobené nájemníkem na společných částech

### 4.2 Nájemník

**Práva:**
- Užívat byt a společné části domu (chodby, výtah, sklep, prádelna)
- Chovat zvíře (pokud nepřiměřeně neobtěžuje)
- Pracovat/podnikat v bytě (pokud nezatěžuje dům)
- Příjem návštěv, členů domácnosti
- Přechod nájmu na člena domácnosti při smrti nájemce

**Povinnosti:**
- Platit nájemné a zálohy na služby vlastníkovi
- Užívat byt řádně, provádět běžnou údržbu a drobné opravy (NV 308/2015)
- Dodržovat domovní řád SVJ (i když není člen)
- Umožnit přístup pro revize, opravy, odečty měřidel
- Oznámit závady v bytě vlastníkovi
- Nezasahovat do společných částí bez souhlasu SVJ

**NEMÁ právo:**
- Hlasovat na shromáždění SVJ
- Nahlížet do dokumentů SVJ (pokud stanovy neumožňují)
- Měnit společné části (ani dveře bytu, pokud jsou společnou částí)
- Podnajímat bez souhlasu vlastníka

### 4.3 SVJ

**Ve vztahu k vlastníkovi:**
- Standardní vztah člen–SVJ (předpisy, hlasování, informace)

**Ve vztahu k nájemníkovi:**
- SVJ nemá PŘÍMÝ právní vztah s nájemníkem
- Ale nájemník užívá společné části → SVJ může vyžadovat dodržování domovního řádu
- SVJ vydá klíče/čip nájemníkovi (přes vlastníka)
- SVJ eviduje počet osob v bytě (pro rozúčtování)
- Pokud nájemník poškodí společné části → SVJ se obrací na VLASTNÍKA (ne přímo na nájemníka)

---

## 5. Krátkodobý pronájem (Airbnb)

**Aktuální právní stav (2024-2026):**
- SVJ MŮŽE ve stanovách omezit krátkodobý pronájem (Airbnb, Booking)
- NS ČR potvrdil (26 Cdo 854/2022): SVJ může stanovit pravidla pro užívání jednotek k opakovanému krátkodobému pronájmu
- Ale: SVJ nemůže ZCELA zakázat — může jen omezit (např. max počet hostů, noční klid, registrace)
- eTurista: nový digitální systém pro registraci pronajímatelů (MMR připravuje)

**ifmio dopad:**
- Typ nájmu: LONG_TERM (standardní) vs SHORT_TERM (Airbnb)
- U short-term: jiný předpis (per noc, ne per měsíc), jiné vyúčtování
- Evidence hostů (povinnost vůči cizinecké policii u cizinců)
- Obsazenost se počítá jinak (per noc, ne per měsíc)

---

## 6. Specifické situace

### 6.1 Vlastník pronajímá VÍCE bytů v jednom SVJ
- Má více jednotek → více předpisů od SVJ
- Každý byt má svého nájemníka
- Hlasuje s CELKOVÝM podílem na SČ (součet podílů všech jednotek)
- V ifmio: 1 vlastník (Party) → N jednotek (Unit) → N nájemníků (Resident)

### 6.2 Byt pronajatý firmě (právnická osoba)
- Nájemce = s.r.o./a.s., která přiděluje byt svému zaměstnanci
- Nájemní smlouva: vlastník ↔ firma
- V bytě bydlí: zaměstnanec firmy (podnájemník)
- DPH: nájem bytu firmě = stále osvobozeno od DPH (účel bydlení)
- Výpovědní ochrana: slabší než u FO nájemce

### 6.3 Spoluvlastnictví jednotky
- Byt vlastní 2 osoby (sourozenci, partneři mimo manželství)
- Oba jsou členy SVJ, ale jednotka má 1 hlas (zastupují se)
- Jeden z nich pronajímá → druhý musí souhlasit
- V ifmio: UnitOwnership s podíly (1/2 + 1/2)

### 6.4 Vlastník v insolvenci / exekuci
- Exekuce na jednotku → zapsáno v KN (C-část LV)
- Nájem pokračuje (exekuce neruší nájem)
- Nájemné může být přikázáno exekutorem (nájemník platí exekutorovi)
- ifmio: flag na Property/Unit + alert

### 6.5 Smrt vlastníka
- Dědění jednotky → noví vlastníci = noví členové SVJ
- Nájem pokračuje (přechází na dědice)
- Nájemník nemusí nic měnit (nový vlastník vstupuje do smlouvy)
- ifmio: změna vlastníka v evidenci

### 6.6 Prodej pronajatého bytu
- Kupní smlouva + vklad do KN
- Nájem PŘECHÁZÍ na nového vlastníka automaticky (NOZ §2221)
- Nájemník pokračuje za stejných podmínek
- Nový vlastník nemůže vypovědět jen kvůli koupi
- ifmio: změna vlastníka, nájemní smlouva zůstává

---

## 7. Mapování na ifmio entity

```
SVJ (KbOrganization, orgType: SVJ)
│
├── Budova (Building)
│   │
│   ├── Jednotka 1883/1 (Unit)
│   │   │
│   │   ├── Vlastník: Novák Jan (Party, role: OWNER)
│   │   │   ├── UnitOwnership (podíl 30/17021, typ: EXCLUSIVE)
│   │   │   ├── PaymentPrescription SVJ (fond oprav + služby = 6 203 Kč/měs)
│   │   │   │   VS: 18831, účet SVJ
│   │   │   │
│   │   │   └── PRONAJÍMATEL → Nájemní smlouva (Tenancy)
│   │   │       ├── od: 1.1.2024, do: neurčitá
│   │   │       ├── nájemné: 18 500 Kč/měs
│   │   │       ├── kauce: 55 500 Kč
│   │   │       └── služby záloha: 3 750 Kč/měs
│   │   │
│   │   └── Nájemník: Dvořáková Eva (Resident, role: TENANT)
│   │       ├── Tenancy → vlastník Novák
│   │       ├── PaymentPrescription NÁJEM (nájemné + služby = 22 250 Kč/měs)
│   │       │   VS: 18831, účet VLASTNÍKA (ne SVJ!)
│   │       ├── Měřidla: TV SN-001, SV SN-002, teplo RTN-003
│   │       └── Domácnost: Dvořáková + 1 dítě (pro rozúčtování dle osob)
│   │
│   ├── Jednotka 1883/2 (Unit) — vlastník bydlí sám (bez pronájmu)
│   │   ├── Vlastník: Černý Petr (Party, role: OWNER)
│   │   ├── UnitOwnership (podíl 25/17021)
│   │   ├── PaymentPrescription SVJ (fond oprav + služby)
│   │   └── Resident: Černý Petr (role: OWNER_OCCUPANT)
│   │       └── Bez Tenancy — vlastník = rezident
│   │
│   └── Jednotka 1883/3 ... (další byty — mix vlastníků a nájemníků)
│
├── Správce: Grand Facility s.r.o. (Tenant v ifmio)
│   Spravuje SVJ jako celek
│   Nezajišťuje nájemní vztahy per byt (to je věc vlastníka)
│
└── Fond oprav SVJ
    Příspěvky VŠECH vlastníků (i těch co pronajímají)
    Nájemníci do fondu oprav NEPŘISPÍVAJÍ
```

### DVA typy předpisů v ifmio:

```
1. PŘEDPIS SVJ (PropertyPrescription, type: SVJ_ADVANCE)
   Plátce: VLASTNÍK
   Příjemce: SVJ účet
   Obsahuje: fond oprav + zálohy služby + pojištění + správa
   VS: číslo jednotky
   
2. PŘEDPIS NÁJEM (PropertyPrescription, type: RENTAL)
   Plátce: NÁJEMNÍK  
   Příjemce: VLASTNÍK účet (osobní, ne SVJ!)
   Obsahuje: nájemné + zálohy služby (přeúčtovatelné)
   VS: číslo jednotky nebo jiný
```

### DVA typy vyúčtování:

```
1. VYÚČTOVÁNÍ SVJ → VLASTNÍK
   Období: kalendářní rok
   Položky: teplo, TV, SV, úklid, výtah, osvětlení...
   Výsledek: přeplatek/nedoplatek vlastníkovi
   
2. VYÚČTOVÁNÍ VLASTNÍK → NÁJEMNÍK
   Období: dle nájemní smlouvy (obvykle kalendářní rok)
   Položky: teplo, TV, SV, úklid, výtah (PŘEÚČTOVATELNÉ)
   NEZAHRNUJE: fond oprav, pojištění, správa
   Výsledek: přeplatek/nedoplatek nájemníkovi
```

---

## 8. ifmio implementace — co je potřeba

### Hotové (✅):
- Unit + UnitOwnership (vlastník s podílem)
- Resident + Tenancy (nájemník se smlouvou)
- PaymentPrescription (předpis platby)
- BillingPeriod (vyúčtování)
- BankAccount + BankTransaction
- HelpDesk
- Meters (vodoměry, kalorimetry)

### Potřebuje rozšíření (⏳):

**A) Dva bankovní účty per jednotka:**
- Účet SVJ (kam vlastník platí SVJ předpis)
- Účet vlastníka (kam nájemník platí nájem)
- ifmio musí párovat platby na SPRÁVNÝ účet

**B) Rozlišení "co přeúčtovat":**
- Každá položka předpisu SVJ: flag `isRechargeable: boolean`
- Fond oprav: isRechargeable = false
- Teplo, voda: isRechargeable = true
- Automatické generování nájemního předpisu z SVJ předpisu (přeúčtovatelné položky + nájemné)

**C) Dvojité vyúčtování:**
- BillingPeriod typ: SVJ_TO_OWNER (SVJ vyúčtuje vlastníkovi)
- BillingPeriod typ: OWNER_TO_TENANT (vlastník vyúčtuje nájemníkovi)
- Vlastník vidí obojí, nájemník vidí jen své

**D) Role v jednotce:**
```typescript
enum UnitResidentRole {
  OWNER_OCCUPANT    // vlastník bydlí sám
  OWNER_LANDLORD    // vlastník pronajímá (nebydlí v bytě)
  TENANT            // nájemník
  SUBTENANT         // podnájemník
  HOUSEHOLD_MEMBER  // člen domácnosti nájemníka
}
```

**E) Nájemní smlouva model:**
- Contract (typ: LEASE, strany: owner ↔ tenant, doba, nájemné, kauce)
- Přílohy: sken smlouvy, předávací protokol

**F) Portál nájemníka (Owner Portal rozšíření):**
- Nájemník vidí: svůj předpis, platby, vyúčtování, HelpDesk
- Nájemník NEVIDÍ: SVJ dokumenty, fond oprav, shromáždění, ostatní byty
- Vlastník vidí: SVJ + svůj byt + svého nájemníka

**G) Notifikace:**
- SVJ → vlastník: předpis, vyúčtování, shromáždění, upomínka
- Vlastník → nájemník: předpis nájmu, vyúčtování, oznámení
- Nájemník → vlastník: HelpDesk ticket, žádost

---

## 9. Daňové aspekty vlastníka-pronajímatele

### FO vlastník (§9 ZDP):

```
Roční příjmy z nájmu:
  Nájemné 12 × 18 500 =                    222 000 Kč
  
Výdaje (paušál 30 %):
  222 000 × 0,30 =                          -66 600 Kč
  
NEBO skutečné výdaje:
  Předpisy SVJ (fond oprav + služby):       -74 436 Kč
  Odpisy bytu (1/30 z pořizovací ceny):     -100 000 Kč
  Pojištění:                                  -3 000 Kč
  Opravy v bytě:                            -15 000 Kč
  Celkem skutečné:                         -192 436 Kč

Základ daně (skutečné výdaje):               29 564 Kč
Daň 15 %:                                     4 435 Kč

→ Při skutečných výdajích + odpisech je daň VÝRAZNĚ nižší
→ Ale: fond oprav NENÍ daňový výdaj (je to záloha, ne náklad)
→ Daňově uznatelné: odpisy, pojištění, opravy, úroky z hypotéky
```

---

## 10. Kritické zákony pro kombinaci SVJ + pronájem

| Předpis | Vztah | Detail |
|---------|-------|--------|
| NOZ §1194-1222 | SVJ ↔ vlastník | Bytové spoluvlastnictví |
| NOZ §2235-2301 | Vlastník ↔ nájemník | Nájem bytu |
| NOZ §2254 | Vlastník ↔ nájemník | Kauce max 3× |
| NOZ §2255 | Nájemník | Právo pracovat v bytě, chovat zvíře |
| NOZ §2274-2278 | Nájemník | Podnájem (jen se souhlasem vlastníka) |
| NOZ §2279-2284 | Nájemník/vlastník | Přechod nájmu (smrt nájemce) |
| Zákon 67/2013 | Oba vztahy | Služby — DVĚ vyúčtování |
| Vyhláška 269/2015 | SVJ → vlastník | Rozúčtování tepla/vody |
| NV 308/2015 | Vlastník ↔ nájemník | Drobné opravy (do 1000 Kč = nájemce) |
| ZDP §9 | Vlastník | Zdanění příjmů z nájmu |

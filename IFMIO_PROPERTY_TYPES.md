# IFMIO – Doménový model typů nemovitostí

> Verze: 1.0 | 2026-04-04
> Účel: Definice všech typů nemovitostí, jejich specifik, datových požadavků a workflow.
> Tento dokument je ZDROJEM PRAVDY pro celý systém.

---

## 1. Hierarchie nemovitostního trhu

```
Nemovitost (Building)
│
├── Bytový dům (více jednotek)
│   │
│   ├── SVJ (Společenství vlastníků jednotek)
│   │   Vlastníci: každý byt má jiného vlastníka
│   │   Správa: výbor SVJ nebo externí správce
│   │   Finance: fond oprav, předpisy, vyúčtování
│   │   Právní: zákon 89/2012 Sb. (NOZ), §1194-§1222
│   │
│   ├── Bytové družstvo (BD)
│   │   Vlastník: družstvo vlastní celý dům
│   │   Nájemníci: členové družstva (družstevní byty)
│   │   Správa: představenstvo družstva
│   │   Finance: nájemné, fond oprav
│   │   Právní: zákon 90/2012 Sb. (ZOK)
│   │
│   ├── Nájemní bytový dům (soukromý vlastník)
│   │   Vlastník: 1 fyzická/právnická osoba (nebo spoluvlastníci)
│   │   Nájemníci: smlouvy dle NOZ §2235-§2301
│   │   Správa: vlastník sám nebo správcovská firma
│   │   Finance: nájemné → vlastníkovi, provozní náklady
│   │
│   ├── Obecní / městský bytový dům
│   │   Vlastník: obec / město
│   │   Nájemníci: sociální nebo tržní nájmy
│   │   Správa: obecní správa nebo delegovaný správce
│   │
│   └── Smíšený dům (kombinace výše)
│       Přízemí: komerční prostory (obchody, restaurace)
│       Patra: byty (SVJ, nájemní, nebo mix)
│
├── Rodinný dům (RD)
│   Vlastník: 1 osoba/rodina
│   Správa: vlastník
│   ifmio relevance: nízká (pokud není pronajímán)
│
├── Komerční nemovitost
│   ├── Kancelářská budova
│   ├── Obchodní centrum
│   ├── Skladový / logistický areál
│   └── Průmyslový objekt
│   Vlastník: investor / REIT / fond
│   Nájemníci: firmy (komerční nájmy)
│   Správa: facility management
│
└── Speciální
    ├── Garáže / parkovací dům
    ├── Pozemek (bez stavby)
    └── Historický objekt (památkově chráněný)
```

---

## 2. Detailní definice typů

### 2.1 SVJ (Společenství vlastníků jednotek)

**Právní forma:** Právnická osoba (IČO), zapsaná v rejstříku SVJ
**Právní předpis:** NOZ §1194-§1222, zákon 89/2012 Sb.
**Vznik:** Automaticky ze zákona při převodu vlastnictví první jednotky (pokud >5 jednotek)

**Klíčové charakteristiky:**
- Každá jednotka má jiného vlastníka (fyzická/právnická osoba)
- Vlastníci mají PODÍL na společných částech (dle prohlášení vlastníka)
- Rozhodování: shromáždění vlastníků (hlasování podle podílů)
- Správa: výbor SVJ (volený) NEBO profesionální správce (smluvní)
- Finance: fond oprav (zálohy dle podílů), vyúčtování služeb

**Data v ifmio:**
| Pole | Zdroj | Povinné |
|------|-------|---------|
| IČO | ARES | ✅ |
| DIČ | ARES | pokud plátce DPH |
| Název SVJ | ARES | ✅ |
| Statutární orgán (výbor) | Justice.cz / ARES | ✅ |
| Stanovy | Justice.cz sbírka listin | ✅ |
| Účetní závěrka | Justice.cz sbírka listin | ✅ |
| Prohlášení vlastníka | katastr | ✅ |
| Seznam jednotek | ČÚZK katastr | ✅ |
| Vlastníci jednotek + podíly | ČÚZK katastr | ✅ |
| Fond oprav (stav) | účetní závěrka / manuální | doporučené |
| Předpisy plateb | manuální | per workflow |
| Pojištění budovy | manuální | doporučené |

**Workflow v ifmio:**
- Předpisy plateb → měsíční zálohy vlastníkům
- Vyúčtování služeb (teplo, voda, úklid)
- HelpDesk (hlášení závad vlastníky/nájemníky)
- Shromáždění vlastníků (per rollam / prezenčně)
- Revize a údržba (výtahy, kotelna, elektro)
- Fond oprav (příjmy, čerpání, plán oprav)

---

### 2.2 Bytové družstvo (BD)

**Právní forma:** Družstvo (IČO), zapsané v OR
**Právní předpis:** Zákon 90/2012 Sb. (ZOK), §727-§757

**Klíčové charakteristiky:**
- Družstvo vlastní CELOU budovu
- Členové mají PRÁVO UŽÍVÁNÍ bytu (ne vlastnictví)
- Členský podíl (převoditelný) = právo na byt
- Rozhodování: členská schůze
- Správa: představenstvo družstva

**Rozdíl SVJ vs BD:**
| Aspekt | SVJ | BD |
|--------|-----|-----|
| Vlastnictví bytu | vlastník (zápis v KN) | družstvo (člen má právo užívání) |
| Převod | kupní smlouva + vklad do KN | převod členského podílu |
| Rozhodování | podíly na společných částech | 1 člen = 1 hlas |
| Hypotéka | na konkrétní byt | na členský podíl (složitější) |
| IČO | SVJ má vlastní IČO | BD má vlastní IČO |
| Registrace | rejstřík SVJ | obchodní rejstřík |

**Data v ifmio:** Obdobné jako SVJ, ale:
- Místo "vlastníci" → "členové družstva"
- Místo "podíly na společných částech" → "členské podíly"
- Účetní závěrka povinná (jako u jakékoliv PO)

---

### 2.3 Nájemní bytový dům

**Právní forma:** Vlastník = FO nebo PO (s.r.o., a.s.)
**Právní předpis:** NOZ §2235-§2301 (nájem bytu)

**Klíčové charakteristiky:**
- 1 vlastník celé budovy (nebo spoluvlastníci)
- Všechny byty pronajímány nájemníkům
- Nájemní smlouvy (určitá/neurčitá doba)
- Kauce (max 3× měsíční nájemné)
- Výpovědní lhůta (3 měsíce ze zákona)

**Data v ifmio:**
| Pole | Zdroj | Povinné |
|------|-------|---------|
| Vlastník | katastr / manuální | ✅ |
| IČO vlastníka (pokud PO) | ARES | pokud PO |
| Nájemní smlouvy | manuální | ✅ |
| Nájemné per byt | manuální | ✅ |
| Kauce | manuální | doporučené |
| Inkaso služeb | manuální | ✅ |
| Pojištění | manuální | doporučené |

**Workflow:**
- Nájemní smlouvy (vytvoření, prodloužení, výpověď)
- Inkaso nájemného + služeb
- Vyúčtování služeb nájemníkům
- Předávací protokoly (nastěhování/vystěhování)
- HelpDesk (hlášení závad nájemníky)
- Obsazenost tracking

---

### 2.4 Obecní / městský bytový dům

**Právní forma:** Vlastník = obec/město
**Specifika:**
- Sociální nájmy (regulované nájemné)
- Výběrová řízení na nájemníky (pořadníky)
- Dotace na opravy (IROP, Zelená úsporám)
- Specifické účetnictví (rozpočtová soustava)
- Transparentnost (zákon o obcích)

---

### 2.5 Komerční nemovitost

**Právní forma:** Vlastník = investor, fond, REIT, s.r.o./a.s.
**Specifika:**
- Komerční nájmy (jiná pravidla než bytové)
- Indexace nájemného (inflace, CPI)
- Tenant fit-out
- Service charges (provozní náklady přeúčtované nájemcům)
- Facility management (úklid, bezpečnost, technická správa)
- CAPEX / OPEX plánování
- Certifikace (BREEAM, LEED)

---

## 3. Jednotky (Units) v kontextu typů

### Typy jednotek:

| Typ | Kód | Popis | Typický kontext |
|-----|-----|-------|----------------|
| Byt | APARTMENT | Bytová jednotka | SVJ, BD, nájemní |
| Nebytový prostor | NON_RESIDENTIAL | Kancelář, obchod, ateliér | SVJ (přízemí), komerční |
| Garáž | GARAGE | Garážové stání | SVJ, komerční |
| Sklep | CELLAR | Sklepní kóje | SVJ, BD |
| Parkovací stání | PARKING | Venkovní/podzemní | SVJ, komerční |
| Společný prostor | COMMON | Chodba, sušárna, prádelna | SVJ, BD |

### Jednotka v kontextu:

**SVJ:**
```
Jednotka 1883/1
├── Typ: byt (3+kk, 75 m²)
├── Podlaží: 2. NP
├── Vlastník: Jan Novák (podíl 30/17021 na společných částech)
├── Nájemník: Eva Dvořáková (nájemní smlouva)
├── Předpis: fond oprav 2 250 Kč/měs + záloha služby 3 500 Kč/měs
└── Měřidla: teplá voda SN123, studená SN124, teplo KAL456
```

**Nájemní dům:**
```
Byt č. 5
├── Typ: byt (2+1, 55 m²)
├── Podlaží: 3. NP
├── Vlastník: XY Reality s.r.o. (celá budova)
├── Nájemník: Petr Černý
├── Nájem: 18 500 Kč/měs + služby 4 200 Kč/měs
├── Kauce: 37 000 Kč
├── Smlouva: od 1.1.2024, neurčitá
└── Měřidla: teplá voda, studená voda
```

---

## 4. Role osob v kontextu typů

| Role | SVJ | BD | Nájemní dům | Komerční |
|------|-----|-----|-------------|----------|
| Vlastník jednotky | ✅ (každý byt) | ❌ (družstvo) | ❌ (1 vlastník) | ❌ (investor) |
| Člen družstva | ❌ | ✅ | ❌ | ❌ |
| Nájemník | ✅ (pokud pronajímá) | ✅ (člen = nájemník) | ✅ | ✅ |
| Podnájemník | ✅ | ✅ (se souhlasem) | ❌ | ❌ |
| Předseda SVJ | ✅ | ❌ | ❌ | ❌ |
| Předseda představenstva | ❌ | ✅ | ❌ | ❌ |
| Správce (FM) | ✅ (external) | ✅ (external) | ✅ (vlastník/external) | ✅ |
| Property manager | ❌ | ❌ | ❌ | ✅ |

---

## 5. Finanční specifika per typ

### SVJ:
- **Fond oprav:** Zálohy vlastníků dle podílů → fond → čerpání na opravy
- **Služby:** Zálohy → vyúčtování (teplo, voda, úklid, výtah, osvětlení)
- **Účetnictví:** Jednoduché nebo podvojné (dle obratu)
- **DPH:** Většinou neplátce (pokud nemá komerční prostory)
- **Rozúčtování:** Vyhláška 269/2015 Sb. (teplo, voda)

### BD:
- **Nájemné:** Členové platí "nájemné" družstvu
- **Fond oprav:** Obdobný jako SVJ
- **Účetnictví:** Podvojné (povinně)
- **DPH:** Většinou neplátce

### Nájemní dům:
- **Nájemné:** Tržní, smluvní
- **DPH:** Nájem bytů osvobozen od DPH; komerční prostory s DPH
- **Odpisy:** Vlastník odepisuje budovu (daňově)
- **Daň z příjmu:** Pronájem = příjem vlastníka (§9 ZDP)

---

## 6. Mapování na ARES / RÚIAN / Katastr

### Detekce typu z veřejných dat:

```
IČO existuje?
├── ANO → ARES lookup
│   ├── Právní forma 145 → SVJ
│   ├── Právní forma 110 → Bytové družstvo
│   ├── Právní forma 112 → s.r.o. (investor/správce)
│   ├── Právní forma 121 → a.s. (investor/fond)
│   └── Právní forma 801/811 → Obec
│
└── NE → Katastr lookup
    ├── 1 vlastník FO → Rodinný dům / Nájemní dům
    ├── 1 vlastník PO → Nájemní dům / Komerční
    ├── N vlastníků FO → Spoluvlastnictví
    ├── N vlastníků (jednotky) → BD bez SVJ / SVJ nezapsané
    └── Obec/stát → Obecní dům
```

### Kódy právních forem (ARES):

| Kód | Název | ifmio typ |
|-----|-------|-----------|
| 145 | Společenství vlastníků jednotek | SVJ |
| 110 | Družstvo | BD |
| 112 | Společnost s ručením omezeným | SRO (investor/správce) |
| 121 | Akciová společnost | AS (investor/fond) |
| 141 | Nadace | NADACE |
| 706 | Spolek | SPOLEK |
| 801 | Obec | MUNICIPALITY |
| 811 | Kraj | REGION |

---

## 7. Doporučení pro ifmio

### Enum v schema.prisma:

```prisma
enum PropertyType {
  SVJ                    // Společenství vlastníků jednotek
  BD                     // Bytové družstvo
  RENTAL_RESIDENTIAL     // Nájemní bytový dům (soukromý vlastník)
  RENTAL_MUNICIPAL       // Obecní/městský bytový dům
  CONDO_NO_SVJ           // Bytový dům s jednotkami bez SVJ
  MIXED_USE              // Smíšený dům (byty + komerční)
  SINGLE_FAMILY          // Rodinný dům
  COMMERCIAL_OFFICE      // Kancelářská budova
  COMMERCIAL_RETAIL      // Obchodní prostory
  COMMERCIAL_WAREHOUSE   // Skladový/logistický
  COMMERCIAL_INDUSTRIAL  // Průmyslový
  PARKING                // Garáže / parkovací dům
  LAND                   // Pozemek (bez stavby)
  OTHER                  // Jiné
}
```

### UI zobrazení:

| Typ | Badge barva | Ikona | Zkratka |
|-----|-------------|-------|---------|
| SVJ | teal | 🏢 | SVJ |
| BD | blue | 🏢 | BD |
| Nájemní | purple | 🏠 | NÁJ |
| Obecní | green | 🏛️ | OBC |
| RD | orange | 🏡 | RD |
| Komerční | gray | 🏗️ | KOM |

---

## 8. Dopad na KB / CRM

### Při importu:
1. RÚIAN → stavební objekt (typ: budova, RD, garáž...)
2. ARES → právní forma → detekce SVJ/BD/SRO
3. Katastr → vlastnická struktura → potvrzení/upřesnění typu
4. Justice.cz → stanovy → specifická pravidla SVJ/BD

### V CRM:
- Filtr podle typu v tabulce budov
- Různé karty v detailu podle typu (SVJ má "Výbor", nájemní má "Nájemní smlouvy")
- Predikce specifická per typ (SVJ: fond oprav, BD: členská schůze, nájemní: obsazenost)
- Checklist specifický per typ (SVJ: stanovy, pojištění, revize; nájemní: smlouvy, kauce)

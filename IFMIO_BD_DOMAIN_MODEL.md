# IFMIO – Bytové družstvo (BD): Doménový model

> Verze: 1.0 | 2026-04-04 | Zdroj pravdy pro implementaci BD modulu v ifmio
> Companion dokument k IFMIO_SVJ_DOMAIN_MODEL.md

---

## 1. Co je Bytové družstvo

Bytové družstvo (BD) je obchodní korporace (právnická osoba) založená za účelem zajišťování bytových potřeb svých členů (ZOK §727). BD vlastní celou budovu a poskytuje byty svým členům do nájmu. BD se zapisuje do obchodního rejstříku (NE rejstřík SVJ).

Firma BD MUSÍ obsahovat slova "bytové družstvo" (ZOK §728).

### Klíčový rozdíl SVJ vs BD:
- **SVJ:** Vlastníci vlastní JEDNOTKY → SVJ jen spravuje společné části
- **BD:** Družstvo vlastní CELOU BUDOVU → členové mají právo UŽÍVÁNÍ (nájem)

### Co BD VLASTNÍ:
- Celou budovu (včetně všech bytů) — na jednom LV v katastru
- Pozemek pod budovou a přilehlé pozemky
- Movitý majetek (vybavení, technika)
- Může vlastnit i další nemovitosti (pro zajištění bytových potřeb členů)

### Co BD NESMÍ:
- Měnit předmět činnosti (musí zůstat bytovým družstvem dokud má nájemce)
- Použít zisk jinak než k uspokojování bytových potřeb a rozvoji BD
- BD MŮŽE provozovat doplňkovou činnost (pronájem nebytových prostor, drobné služby)

### Vznik BD:
- Založí min. 3 osoby (FO nebo PO)
- Schválením stanov na ustavující schůzi
- Vzniká zápisem do obchodního rejstříku
- Základní členský vklad (výše dle stanov, zákon nestanoví minimum)
- V ČR existuje ~5 000-8 000 bytových družstev

---

## 2. BD v registrech

### 2.1 ARES
IČO (8 číslic), firma obsahuje "bytové družstvo", právní forma kód 110 (Družstvo), DIČ (většina BD je plátce DPH — mají komerční nájmy), sídlo, datum vzniku/zániku, CZ-NACE 68.20 (Pronájem a správa nemovitostí), datová schránka, počet zaměstnanců (BD často má zaměstnance — domovník, účetní).

Detekce BD v ARES: pravniForma.kod === '110' AND firma contains 'bytové družstvo'.

### 2.2 Justice.cz (Obchodní rejstřík — NE rejstřík SVJ!)
BD se zapisuje do OBCHODNÍHO REJSTŘÍKU (oddíl Dr). Spisová značka: Dr XXXXX.

Obsah: název, sídlo, IČO, právní forma (Družstvo), předmět činnosti ("zajišťování bytových potřeb členů"), statutární orgán = Představenstvo (předseda + členové), kontrolní komise (povinná u >50 členů), den vzniku.

Sbírka listin: stanovy, účetní závěrka (povinně ročně — podvojné účetnictví), výroční zpráva (pokud audit), notářské zápisy, zápisy z členských schůzí.

### 2.3 ČÚZK (Katastr nemovitostí)
ZÁSADNÍ ROZDÍL od SVJ: V katastru je celá budova na JEDNOM listu vlastnictví s vlastníkem = bytové družstvo. Jednotlivé byty (družstevní byty) v katastru NEJSOU VIDĚT jako samostatné jednotky. Katastr eviduje: stavební objekt (ČP, KÚ, parcela, typ stavby) a vlastníka = BD (IČO, název). Zástavní práva jsou na celé budově (ne per byt). Exekuce jde na majetek BD (celý dům), ne na jednotlivé byty.

### 2.4 RÚIAN
Stejné jako u SVJ — stavební objekt, adresy, GPS, KÚ. Neobsahuje vlastnické vztahy.

---

## 3. Orgány BD

### 3.1 Členská schůze (nejvyšší orgán)
Všichni členové BD. Hlasování: 1 člen = 1 hlas (NE dle podílů — zásadní rozdíl od SVJ). Svolává představenstvo min. 1× za účetní období. Usnášeníschopnost: většina všech členů. Pokud neusnášeníschopná → náhradní členská schůze (usnášeníschopná za přítomnosti byť 1 člena!).

Per rollam: povoleno pokud to stanovy dovolují (ZOK §652-655). Nedoručení vyjádření = NESOUHLAS (opak SVJ kde = PROTI).

U BD >200 členů: shromáždění delegátů místo členské schůze.

### 3.2 Představenstvo (statutární orgán)
Kolektivní orgán (min. 3 členové). Předseda představenstva řídí činnost. Volí členská schůze. Funkční období dle stanov (celý orgán končí najednou). MUSÍ být člen družstva (na rozdíl od SVJ kde může být kdokoliv). Odpovědnost: péče řádného hospodáře, osobní odpovědnost za škodu.

U malého družstva (<50 členů): může funkci představenstva vykonávat předseda družstva (individuální orgán).

### 3.3 Kontrolní komise
Povinná u BD >50 členů. U menších: povinná jen pokud to určí stanovy (jinak funkci vykonává členská schůze). Min. 3 členové. Kontroluje veškerou činnost BD, projednává stížnosti členů.

---

## 4. Členství v BD

### Družstevní podíl (klíčový koncept)
Člen BD má DRUŽSTEVNÍ PODÍL — souhrn práv a povinností plynoucích z členství. S družstevním podílem je spojen nájem konkrétního bytu.

| Aspekt | Detail |
|--------|--------|
| Vznik členství | Přijetím za člena (splnění podmínek stanov + základní členský vklad) |
| Převod podílu | Písemnou smlouvou, členství přechází na nabyvatele. BD NEMŮŽE převod omezit ani podmínit souhlasem (ZOK §736). |
| Dědění podílu | Podíl přechází na dědice (ne na BD). Pokud dědic nechce → vypořádací podíl. |
| Společné členství manželů | Automaticky pokud podíl nabyt za trvání manželství. 1 hlas dohromady. |
| Zánik členství | Vystoupení, vyloučení (porušení povinností), převod, smrt, zánik BD |
| Vypořádací podíl | Při zániku členství: min. tržní hodnota (u BD zákon výslovně nestanoví minimum jako u obecného družstva) |
| Cena podílu | "Tržní" — v Praze často 50-80% ceny bytu v osobním vlastnictví |
| Hypotéka | Na družstevní podíl (ne na byt!) — banky poskytují, ale hůř než na byt v OV |

### Práva člena:
- Nájem družstevního bytu
- Hlasování na členské schůzi (1 člen = 1 hlas)
- Podíl na zisku (pokud schválí členská schůze)
- Informace o hospodaření BD
- Nahlížet do dokladů BD

### Povinnosti člena:
- Platit nájemné a zálohy na služby
- Dodržovat stanovy a rozhodnutí orgánů
- Přispět na úhradu ztráty (pokud stanovy dovolují)
- Základní členský vklad (jednorázově při vstupu)

---

## 5. Finance BD

### 5.1 Nájemné v BD
Členové platí "nájemné" — ale jen ve výši ÚČELNĚ VYNALOŽENÝCH NÁKLADŮ (ZOK §744). Nájemné BD NENÍ tržní — je to jen pokrytí nákladů na správu, údržbu, fond oprav.

Typicky: 2 000-5 000 Kč/měs (výrazně pod tržní cenou).

### 5.2 DPH specifika BD
BD je ČASTĚJI plátcem DPH než SVJ — má komerční nájmy (nebytové prostory). Nájem bytů členům = osvobozeno od DPH. Nájem nebytových prostor = s DPH. BD s obratem >2 mil Kč = povinně plátce.

### 5.3 Účetnictví BD
Podvojné účetnictví POVINNĚ. Audit povinný pokud: aktiva >40 mil NEBO obrat >80 mil NEBO >50 zaměstnanců. Výroční zpráva pokud audit. Účetní závěrka do sbírky listin OR.

### 5.4 Fond oprav BD
Obdobný jako u SVJ — členové přispívají na opravy a údržbu. Ale: u BD to je součástí nájemného (ne oddělený fond). Plán oprav schvaluje členská schůze.

### 5.5 Předpis platby (člen BD):
```
Byt č. 5 (2+1, 55 m²), člen: Novák Jan

NÁJEMNÉ (účelné náklady):
├── Příspěvek na opravy a údržbu (fond): 1 650 Kč/měs (55m² × 30 Kč)
├── Odměna správci: 250 Kč/měs
├── Pojištění domu: 45 Kč/měs
├── Správní režie BD: 200 Kč/měs
└── Splátka úvěru BD: 800 Kč/měs (pokud BD čerpalo úvěr)

ZÁLOHY NA SLUŽBY:
├── Teplo: 1 800 Kč/měs
├── Teplá voda: 550 Kč/měs
├── Studená voda: 380 Kč/měs
├── Úklid: 180 Kč/měs
├── Výtah: 130 Kč/měs
└── Osvětlení SČ: 65 Kč/měs

CELKEM: 6 050 Kč/měs (srovnej s tržním nájmem ~18 000 Kč)
```

---

## 6. BD vs SVJ — srovnání pro ifmio

| Aspekt | SVJ | BD |
|--------|-----|-----|
| **Zákon** | NOZ §1194-1222 | ZOK §727-757 |
| **Právní forma ARES** | 145 | 110 |
| **Rejstřík** | Rejstřík SVJ | Obchodní rejstřík (oddíl Dr) |
| **Kdo vlastní byty** | Každý vlastník svůj | BD vlastní celý dům |
| **V katastru** | Jednotky s vlastníky (N × LV) | Celý dům na 1 LV (BD = vlastník) |
| **Členové** | Vlastníci jednotek | Členové BD (nájemci) |
| **Převod bytu** | Kupní smlouva + vklad KN | Převod družstevního podílu (bez KN!) |
| **Hypotéka** | Na byt (zástavní právo v KN) | Na členský podíl (složitější) |
| **Hlasování** | Dle podílů na SČ | 1 člen = 1 hlas |
| **Orgány** | Shromáždění + výbor/předseda | Členská schůze + představenstvo + KK |
| **Statutární orgán** | Výbor NEBO předseda SVJ | Představenstvo (NEBO předseda u malých) |
| **Může být nečlen** | Ano (profesionální předseda) | NE — musí být člen BD |
| **Náhradní schůze** | Ne | Ano (usnášeníschopná i s 1 členem!) |
| **Nájemné** | Neexistuje (vlastníci platí zálohy) | Účelné náklady (pod tržní cenou) |
| **DPH** | Většinou neplátce | Často plátce |
| **Účetnictví** | Podvojné | Podvojné + audit (pokud velké) |
| **Pojištění** | Povinné (dle stanov) | Povinné (BD pojišťuje svůj majetek) |

### Co má v ifmio SPOLEČNÉHO:
- Evidence bytů/jednotek
- Předpisy plateb (měsíční)
- Fond oprav / příspěvky na údržbu
- Vyúčtování služeb (teplo, voda, úklid...)
- Bankovní účet + Fio API
- Hlasování (shromáždění / členská schůze)
- Revize a údržba
- HelpDesk (hlášení závad)
- Dlužníci + upomínky
- Dokumentový archiv

### Co se LIŠÍ v ifmio:
- BD: "člen" místo "vlastník", "nájemné" místo "zálohy"
- BD: Převod = převod podílu (ne kupní smlouva)
- BD: 1 člen = 1 hlas (ne dle podílů)
- BD: Představenstvo + kontrolní komise (ne výbor/předseda)
- BD: Statutární orgán MUSÍ být člen (ne profesionální předseda)
- BD: Náhradní členská schůze (SVJ nemá)
- BD: V katastru NEVIDÍŠ jednotlivé byty (jen celý dům na BD)
- BD: Povinné webové stránky (ZOK §636)
- BD: Audit (pokud velké)

---

## 7. Mapování na ifmio modely

| Reálná entita | ifmio model | Poznámka |
|---------------|-------------|----------|
| Bytové družstvo | Property (type: BD) + KbOrganization (orgType: BD) | |
| Budova | Building | Celá na 1 LV |
| Družstevní byt | Unit | V katastru neviditelný |
| Člen BD | Resident / Party | Role: MEMBER (ne OWNER) |
| Družstevní podíl | UnitOwnership (ownershipType: COOPERATIVE_SHARE) | Není v KN |
| Představenstvo | PrincipalOwner (role: BOARD_MEMBER/BOARD_CHAIR) | Musí být člen |
| Kontrolní komise | PrincipalOwner (role: CONTROL_COMMISSION) | |
| Správce (pokud ext.) | Tenant + ManagementContract | |
| Fond oprav | FundRepair | Součást nájemného |
| Nájemné | PaymentPrescription | Typ: RENT (ne ADVANCE) |
| Členská schůze | Assembly (type: MEMBER_MEETING) | |

---

## 8. Kritické zákony
ZOK §727-757 (bytová družstva). ZOK §552-726 (obecná družstva). NOZ §2235-2301 (nájem bytu — členové BD jsou nájemci!). Zákon 67/2013 (služby). Vyhláška 269/2015 (rozúčtování). Zákon 563/1991 (účetnictví). Zákon 586/1992 (DPPO). Zákon 235/2004 (DPH).

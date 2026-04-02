# IFMIO – Design System & UX Rules

> Verze: 1.0
> Vygenerováno: 2026-04-01
> Status: Závazný standard pro veškerou novou implementaci
> Zdroje: UI_ARCHITECTURE.md, FIELD_CATALOG.md, FEATURE_CATALOG.md, AUDIT_REPORT.md

---

## 1. Design Tokens & Visual Foundation

### 1.1 Barevná paleta

#### 🔵 Aktuální stav (z variables.css)

| Token | Hodnota | Použití |
|-------|---------|---------|
| `--primary` | #0D9488 (teal) | Primary buttons, active sidebar, links |
| `--primary-light` | #14B8A6 | Hover |
| `--primary-dark` | #0F766E | Pressed |
| `--primary-50` | #F0FDFA | Active sidebar bg |
| `--success` | #10B981 | Zelené stavy |
| `--warning` | #F59E0B | Varovné stavy |
| `--danger` | #EF4444 | Chyby, destruktivní |
| `--info` | #0D9488 | = primary |
| `--dark` | #0C1222 | Headings |
| `--gray-50` → `--gray-800` | 8 odstínů | Backgrounds, borders, text |

#### 🟢 Cílový stav — sémantické barvy (rozšíření)

| Token | Účel | Hodnota | Příklad použití |
|-------|------|---------|-----------------|
| `--color-surface` | Pozadí karet | var(--white) | Karty, modaly |
| `--color-surface-elevated` | Sticky pozadí | var(--white) + shadow | TopBar, floating panels |
| `--color-border-default` | Ohraničení | var(--gray-200) | Inputy, karty, tabulky |
| `--color-border-strong` | Focus ring | var(--primary) | Focus state, active tab |
| `--color-text-primary` | Hlavní text | var(--dark) | Nadpisy, hodnoty |
| `--color-text-secondary` | Doplňkový | var(--gray-500) | Labels, helptext |
| `--color-text-muted` | Ztlumený | var(--gray-400) | Placeholder, disabled |
| `--color-finance-positive` | Příjem/přeplatek | #10B981 | Konto: kladný zůstatek |
| `--color-finance-negative` | Výdaj/nedoplatek | #EF4444 | Konto: záporný zůstatek |
| `--color-finance-neutral` | Neutrální | var(--gray-400) | Nulový pohyb |
| `--color-pii` | PII indikátor | #F59E0B | Badge u PII polí |
| `--color-sla-ok` | SLA v normě | #10B981 | Tiket v čase |
| `--color-sla-warning` | SLA se blíží | #F59E0B | < 2h do deadline |
| `--color-sla-breach` | SLA porušeno | #EF4444 | Po deadline |

### 1.2 Typografie

#### 🔵 Aktuální stav

| Token | Font | Size | Weight |
|-------|------|------|--------|
| `--font-display` | Plus Jakarta Sans | — | — |
| `--font-body` | DM Sans | — | — |
| h1 | Plus Jakarta Sans | 1.75rem (28px) | 800 |
| h2 | Plus Jakarta Sans | 1.4rem (22px) | 800 |
| h3 | Plus Jakarta Sans | 1.15rem (18px) | 700 |
| body | DM Sans | 0.875rem (14px) | 400 |

#### 🟢 Cílový stav — rozšířená škála

| Úroveň | Font | Size | Weight | Line-height | Použití |
|---------|------|------|--------|-------------|---------|
| display | Plus Jakarta Sans | 28px | 700 | 1.2 | Landing hero |
| h1 | Plus Jakarta Sans | 24px | 700 | 1.3 | Název stránky |
| h2 | Plus Jakarta Sans | 20px | 600 | 1.3 | Sekce |
| h3 | Plus Jakarta Sans | 16px | 600 | 1.4 | Karta header, podsekce |
| body | DM Sans | 14px | 400 | 1.5 | Běžný text |
| body-sm | DM Sans | 13px | 400 | 1.5 | Tabulky, metadata |
| label | DM Sans | 13px | 500 | 1.4 | Formulářové labely |
| caption | DM Sans | 12px | 400 | 1.4 | Help text, timestamps |
| mono | JetBrains Mono | 13px | 400 | 1.5 | VS, IČO, čísla účtů |

**Pravidla:**
- Nadpisy stránek VŽDY h1, nikdy h2
- Nadpisy karet/sekcí VŽDY h3
- Finanční částky VŽDY mono + right-aligned
- VS, IČO, DIČ, čísla účtů VŽDY mono

### 1.3 Spacing, Radius, Shadows

#### 🔵 Aktuální stav

| Token | Hodnota |
|-------|---------|
| `--sp-1` → `--sp-6` | 4, 8, 12, 16, 24, 32 px |
| `--radius-sm/md/lg/xl` | 8, 12, 16, 20 px |
| `--shadow-sm/md/lg/card` | Jemné stíny (max 0.1 opacity) |
| `--sidebar-width` | 240px |

#### 🟢 Pravidla
- **4px grid** — vše musí být násobek 4px
- **Radius:** Karty = lg (16px), Inputy = sm (8px), Buttons = sm (8px), Badges = full (pill)
- **Shadows:** Karty = card, Modaly = lg, Dropdowny = md

### 1.4 Ikony (Lucide React)

| Kontext | Velikost | Barva |
|---------|----------|-------|
| Sidebar menu | 18px | var(--sidebar-text) |
| Buttons (icon + text) | 16px | inherit |
| KPI cards | 24px | var(--color-accent) |
| Inline text | 14px | var(--color-text-secondary) |
| Empty states | 48px | var(--gray-300) |

**Pravidlo:** Ikona VŽDY doprovázena textem (tooltip minimum). Žádné icon-only buttons bez aria-label.

---

## 2. Formulářový systém

### 2.1 Anatomie a pravidla

#### 🔵 Aktuální stav
- 22 formulářů, většina v Modalu
- Pattern: `useState` + inline `validate()` + `set(key, value)` helper
- Pouze ResidentForm používá Zod + react-hook-form
- Všech ~200 polí zobrazeno najednou (žádné sekce/kroky)
- Styling: inline CSS-in-JS `inputStyle()` helper
- Error display: pod polem, červeně

#### 🟢 Cílový stav — závazný standard

**Anatomie:**
```
┌─ FormHeader ──────────────────────────────┐
│ H3: "Nová nemovitost"                     │
│ Subtitle: "Základní údaje o nemovitosti"   │
└────────────────────────────────────────────┘
┌─ FormSections ────────────────────────────┐
│ [Section 1: vždy rozbalená]               │
│ [Section 2: expand/collapse]              │
│ [Section 3: collapsed by default]         │
└────────────────────────────────────────────┘
┌─ FormFooter ──────────────────────────────┐
│            [Zrušit]     [Uložit]          │
└────────────────────────────────────────────┘
```

**Progresivní odhalování:**

| Počet polí | UX strategie |
|------------|-------------|
| 1–6 | Inline formulář, žádné sekce |
| 7–15 | Sekce s expand/collapse |
| 16–30 | Wizard (kroky) NEBO tabs |
| 30+ | Wizard povinně, max 8 polí per krok |

**Validace:**
- INLINE po blur (ne po submit)
- Chybová zpráva: konkrétní ("IČO musí mít 8 číslic", ne "Neplatné")
- Submit: disabled dokud existují chyby
- Úspěch: Toast + redirect/close
- API fail: Toast s chybou, formulář zůstane otevřený

**Povinnost polí:**
- Povinná pole: label BEZ hvězdičky (jsou default)
- Nepovinná pole: `(nepovinné)` suffix v caption barvě

### 2.2 Component mapping

| Datový typ | Komponenta | Varianta |
|-----------|------------|----------|
| String (krátký) | TextInput | default |
| String (dlouhý 100+) | Textarea | autoResize |
| String (email) | TextInput | type="email" + ikona |
| String (telefon) | TextInput | type="tel" + prefix +420 |
| String (IČO) | TextInput | mono, maxLength=8, numeric |
| String (DIČ) | TextInput | mono, prefix CZ |
| String (VS) | TextInput | mono, maxLength=10, numeric |
| String (IBAN/účet) | TextInput | mono, formátovaný |
| String (PSČ) | TextInput | maxLength=6, pattern XXX XX |
| Decimal (finanční) | CurrencyInput | right-aligned, 2 dec, Kč suffix |
| Int/Float | NumberInput | default |
| Boolean | Switch | s labelem |
| Boolean (souhlas) | Checkbox | s textem |
| DateTime | DatePicker | DD.MM.YYYY |
| DateTime (rozsah) | DateRangePicker | od–do |
| Enum (< 5 hodnot) | RadioGroup | horizontal |
| Enum (5–15) | Select | searchable |
| Enum (15+) | ComboBox | autocomplete |
| FK → entita | Select/EntityPicker | live search |
| Adresa | AddressGroup | 3 pole v řádku |
| Soubor | FileUpload | drag & drop + progress |
| JSON | Custom sub-formulář | NIKDY raw JSON |

### 2.3 Aplikace na 22 formulářů

#### PropertyForm (15 polí → sekce)

| Sekce | Pole | Povinné | Poznámka |
|-------|------|---------|----------|
| **Identifikace** (vždy rozbalená) | name, type (RadioGroup), ownership (RadioGroup) | ANO | |
| **Adresa** (vždy rozbalená) | address, city, postalCode (AddressGroup) | ANO | RÚIAN autocomplete |
| **Právní údaje** (collapse) | legalMode, ico (mono+ARES), dic (mono), isVatPayer (Switch) | podmíněně | Zobraz ico/dic jen pro SVJ/BD |
| **Správa** (collapse) | managedFrom, managedTo, accountingSystem | NE | |
| **Katastr** (collapse) | cadastralArea, landRegistrySheet | NE | |
| **Kontakt** (collapse) | contactName, contactEmail, contactPhone | NE | PII pole |

#### UnitForm (18 polí → sekce)

| Sekce | Pole | Poznámka |
|-------|------|----------|
| **Základní** | name, spaceType (RadioGroup 6), floor, area, disposition | Vždy viditelné |
| **Podíly** (collapse) | commonAreaShare (%), heatingArea, tuvArea, personCount | |
| **Koeficienty** (collapse) | heatingCoefficient, hotWaterCoefficient | Default 1.0 |
| **Katastr** (collapse) | knDesignation, ownDesignation, extAllocatorRef | |
| **Platnost** (collapse) | validFrom, validTo | |

#### ResidentForm (16 polí → sekce + conditional)

| Sekce | Pole | Poznámka |
|-------|------|----------|
| **Typ osoby** | isLegalEntity (Switch) | Mění celý formulář |
| **Fyzická osoba** (if !isLegalEntity) | firstName, lastName, birthDate | PII |
| **Právnická osoba** (if isLegalEntity) | companyName, ico (ARES), dic, firstName (kontakt), lastName (kontakt) | |
| **Kontakt** | email, phone | PII |
| **Přiřazení** | role (RadioGroup 4), propertyId, unitId | |
| **Adresa** (collapse) | correspondenceAddress, City, PostalCode | PII |
| **Ostatní** (collapse) | dataBoxId, note | |

#### TicketForm (12 polí → role-based)

| Viditelnost | Pole | Role |
|-------------|------|------|
| **Vždy** | title, description (Textarea), priority (RadioGroup 4) | ALL |
| **Správce** | propertyId, unitId, category (Select 7), assetId | fm, tech |
| **Přiřazení** | assigneeId, requesterUserId, dispatcherUserId | fm |
| **Přílohy** | files (FileUpload multi) | ALL |

#### WorkOrderForm (12 polí → sekce)

| Sekce | Pole |
|-------|------|
| **Základní** | title, description, workType (RadioGroup 4), priority (RadioGroup 4) |
| **Přiřazení** | propertyId, unitId, assetId, assigneeUserId, deadline |
| **Náklady** (collapse) | estimatedHours, laborCost (CurrencyInput), materialCost (CurrencyInput) |

#### InvoiceForm (20+ polí → wizard/tabs)

| Tab/Krok | Pole |
|----------|------|
| **Hlavička** | number (mono), type (RadioGroup 5), propertyId |
| **Dodavatel** | supplierName, supplierIco (ARES), supplierDic |
| **Odběratel** | buyerName, buyerIco (ARES), buyerDic |
| **Částky** | amountBase (CurrencyInput), vatRate (Select 0/12/21), vatAmount (computed), amountTotal (computed) |
| **Datumy** | issueDate, duzp, dueDate, paymentDate |
| **Symboly** | variableSymbol (mono), constantSymbol, specificSymbol, paymentIban (mono) |
| **Řádky** | InvoiceLineEditor (dynamic rows: description, qty, unit, price, vat) |
| **Přílohy** | pdfBase64 (FileUpload), isdocXml |

#### AssetForm (14 polí → sekce)

| Sekce | Pole |
|-------|------|
| **Identifikace** | name, category (RadioGroup 6), assetTypeId |
| **Specifikace** | manufacturer, model, serialNumber (mono), location |
| **Ekonomika** (collapse) | purchaseDate, purchaseValue (CurrencyInput), warrantyUntil, serviceInterval |
| **Poznámky** (collapse) | notes (Textarea) |

#### MeterForm (10 polí)

| Pole | Komponenta | Poznámka |
|------|-----------|----------|
| name | TextInput | Povinné |
| serialNumber | TextInput (mono) | Povinné |
| meterType | RadioGroup 5 | Auto-set unit |
| propertyId, unitId | Select | FK |
| installDate, calibrationDue | DatePicker | |
| manufacturer, location | TextInput | Nepovinné |
| note | Textarea | |

#### LeaseForm (13 polí → sekce)

| Sekce | Pole |
|-------|------|
| **Smluvní strany** | residentId (EntityPicker), propertyId, unitId |
| **Smlouva** | contractType (RadioGroup 4), contractNumber, startDate, endDate, indefinite (Switch) |
| **Finance** | monthlyRent (CurrencyInput), deposit (CurrencyInput) |
| **Podmínky** (collapse) | noticePeriod, renewalType (Select 3) |

#### Menší formuláře (< 7 polí → inline)

| Formulář | Polí | Layout |
|----------|------|--------|
| EventForm | 9 | Inline (title, type, date, time, location, description, attendees) |
| AssemblyForm | 5 | Inline (title, description, scheduledAt, location, notes) |
| AgendaItemForm | 5 | Inline (title, description, requiresVote, majorityType, notes) |
| OccupancyForm | 6 | Inline (residentId, role, startDate, ownershipShare, personCount, note) |
| DocumentForm | 5 | Inline (file, category, name, description, tags) |
| PrescriptionForm | 9 | 2 sekce (základní + platnost) |
| BulkUnitForm | 8 | Inline (prefix, separator, from, to, floor, area, spaceType) |
| PerRollamForm | 5 | Inline (title, description, deadline, notes) |
| PerRollamItemForm | 3 | Inline (title, description, majorityType) |
| RevisionPlanForm | 8 | 2 sekce (základní + nastavení) |
| RecurringPlanForm | 10 | 2 sekce (plán + frekvence) |
| LoginPage | 3+2FA | Page layout, 2 kroky |
| RegisterPage | 10 | 4-step wizard |

---

## 3. Navigační systém

### 🔵 Aktuální stav
- Flat sidebar s 7 sekcemi filtrovanými podle UX role
- PropertyPicker v topbar pro globální kontext
- Breadcrumbs: pouze property name v topbar
- Mobile: sidebar jako overlay

### 🟢 Cílový stav

**Princip: Kontextová navigace**

```
Level 1: Sidebar (globální)
├── Dashboard
├── Nemovitosti (PropertyList)
├── Správa uživatelů
└── Nastavení

Level 2: Property context (po výběru nemovitosti)
├── Přehled
├── Jednotky → detail
├── Osoby → detail
├── Finance (tabs)
├── HelpDesk → detail
├── Technika (Assets, Meters, WO)
├── Dokumenty
├── Shromáždění → detail → hlasování
└── Revize

Level 3: Entity detail (tabs uvnitř)
```

**Breadcrumbs — povinný standard:**
```
[Nemovitosti] > [Bytový dům Korunní 42] > [Jednotky] > [Byt č. 12]
```
- VŽDY zobrazit na chráněných stránkách
- Klikatelné všechny úrovně kromě aktuální
- Max 4 úrovně, prostřední collapse s "..."
- Mobile: jen `← Zpět na [parent]`

**Kontextový header (sticky):**
```
┌──────────────────────────────────────────────────────────┐
│ 🏢 Bytový dům Korunní 42  │  SVJ  │  Praha 2  │  IČ: 12345678  │
└──────────────────────────────────────────────────────────┘
```
Zobrazit vždy když je vybrána nemovitost. Click → PropertyDetail.

---

## 4. Role-based UI

### Matice — klíčové features × role

| Feature | tenant_owner | tenant_admin | finance_mgr | property_mgr | operations | viewer | unit_owner | unit_tenant |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ full | ✅ full | ✅ finance | ✅ ops | ✅ tech | 👁️ | 👁️ portal | 👁️ portal |
| Properties CRUD | ✅ | ✅ | 👁️ | ✅ | 👁️ | 👁️ | ❌ | ❌ |
| Units CRUD | ✅ | ✅ | 👁️ | ✅ | 👁️ | 👁️ | 👁️ own | 👁️ own |
| Residents CRUD | ✅ | ✅ | 👁️ | ✅ | ❌ | 👁️ | ❌ | ❌ |
| Invoices | ✅ | ✅ | ✅ | 👁️ draft | ❌ | ❌ | ❌ | ❌ |
| Invoice approve | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Prescriptions | ✅ | ✅ | ✅ | 👁️ | ❌ | ❌ | 👁️ own | 👁️ own |
| Bank accounts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Matching | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Konto | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 👁️ own | ❌ |
| Settlement | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 👁️ own | ❌ |
| Helpdesk create | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Helpdesk assign | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Helpdesk resolve | ✅ | ✅ | ❌ | ✅ | ✅ own | ❌ | ❌ | ❌ |
| SLA config | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Work Orders | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assets CRUD | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Meters | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | 👁️ own | 👁️ own |
| Meter readings | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ own | ✅ own |
| Documents | ✅ | ✅ | 👁️ | ✅ | 👁️ | 👁️ | 👁️ own | 👁️ own |
| Contracts | ✅ | ✅ | 👁️ | ✅ | ❌ | 👁️ | ❌ | ❌ |
| Assembly | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 👁️ vote | ❌ |
| Per rollam | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ vote | ❌ |
| Revisions | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Protocols | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reminders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar | ✅ | ✅ | ❌ | ✅ | ✅ | 👁️ | ❌ | ❌ |
| Kanban | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reporting | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Mio AI chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mio insights | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| User mgmt | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit log | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GDPR erasure | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| API keys | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Data export | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Legenda: ✅ plný přístup | 👁️ read-only | 🔒 masked PII | ❌ neviditelné

---

## 5. Finanční UX pravidla

### 5.1 Zobrazení částek
- VŽDY `CurrencyInput` / `CurrencyDisplay`
- VŽDY right-aligned, mono font
- VŽDY 2 desetinná místa: `1 234,50 Kč`
- Kladné: `--color-finance-positive` (zelená)
- Záporné: `--color-finance-negative` (červená), prefix `−`
- Nula: `--color-finance-neutral` (šedá)

### 5.2 Explain layer
Každé computed pole musí mít `(i)` ikonu → popover s výpočtem:
```
Celková částka: 12 450,00 Kč
= Fond oprav (8 500,00) + Služby (2 350,00) + Správa (1 600,00)
Podíl: 125/10000 = 1.25%
```

### 5.3 Konto vlastníka
- Aktuální zůstatek nahoře (velké číslo, barva dle +/-)
- Tabulka pohybů: datum, typ, popis, příjem, výdaj, zůstatek
- Filtr: období, typ
- Export: PDF, CSV

### 5.4 Párování plateb
- Transakce vlevo ↔ Předpis/faktura vpravo, spojovací čára
- Stavy: ✅ Spárováno | ⚠️ Návrh | ❌ Nespárováno
- Částečná úhrada: progress bar

### 5.5 What-if preview
Před finanční akcí → preview dialog:
```
"Bude vytvořeno 45 předpisů pro období 01/2025"
"Celková částka: 234 560,00 Kč"
"Dotčení vlastníci: 45"
[Zrušit] [Potvrdit a vytvořit]
```

---

## 6. GDPR & PII UX

### 6.1 PII badge
Každé PII pole z FIELD_CATALOG.md: 🔒 badge vedle labelu → hover: "Osobní údaj (GDPR)"

### 6.2 PII maskování per role

| Typ PII | owner/admin | manager | finance | operations | unit_owner (own) |
|---------|:-----------:|:-------:|:-------:|:----------:|:----------------:|
| Jméno | plné | plné | plné | plné | plné |
| Email | plné | plné | plné | maskované | plné |
| Telefon | plné | plné | maskované | plné | plné |
| Datum narození | plné | maskované | maskované | ❌ | plné |
| Číslo účtu | plné | plné | plné | ❌ | plné |
| Adresa | plné | plné | plné | plné | plné |

### 6.3 GDPR Erasure Wizard
5 kroků: Výběr subjektu → Preview anonymizace → Co NEBUDE smazáno (zákon) → Potvrzení (důvod + jméno) → PDF protokol

---

## 7. Tabulky & Seznamy

### 7.1 DataTable standard
- Server-side pagination (limit/offset)
- Server-side sorting (click header)
- Filter bar nad tabulkou (NE sidebar)
- Aktivní filtry jako chips s ✕
- URL sync (sdílitelný link, back button)
- Loading: skeleton rows (ne spinner)
- Empty state s CTA

### 7.2 Řádek tabulky
- Hover: light bg
- Celý řádek klikatelný → detail
- Akce: … kebab menu na konci řádku
- Status: Badge s barvou

### 7.3 Responsive (< 768px)
- Tabulka → card list
- Karta: identifikátor + status + 2–3 klíčové hodnoty

---

## 8. Modaly, Toasty, Error handling

### 8.1 Modal velikosti

| Typ | Max šířka | Kdy |
|-----|-----------|-----|
| sm (480px) | Inline formulář < 6 polí, confirmation |
| md (640px) | Formulář 6–15 polí |
| lg (800px) | Preview, what-if |
| full-page | Wizard 15+ polí |

### 8.2 Confirmation dialogy
- VŽDY pro: DELETE, bulk, finanční akce, GDPR
- Konkrétní text: "Smazat nemovitost Korunní 42?" (ne "Opravdu smazat?")
- Destruktivní button: červený, text = akce ("Smazat nemovitost")
- NIKDY "OK / Cancel"

### 8.3 Toast

| Typ | Barva | Auto-dismiss | Příklad |
|-----|-------|-------------|---------|
| Success | zelená | 3s | "Nemovitost uložena" |
| Error | červená | manuální | "Nepodařilo se uložit: [důvod]" |
| Warning | oranžová | 5s | "SLA deadline za 2 hodiny" |
| Info | modrá | 3s | "Export připraven" |

### 8.4 Error handling

| Status | UX |
|--------|-----|
| 400 | Inline chyby u polí + toast summary |
| 401 expired | Tichý refresh → fail → redirect login |
| 403 | Toast "Nemáte oprávnění" |
| 404 | Full-page 404 s breadcrumbs |
| 409 | Modal "Záznam upraven" + [Obnovit \| Přepsat] |
| 500 | Toast "Chyba serveru" + Sentry log |
| Network | Banner "Offline" |

---

## 9. Helpdesk & Work Orders UX

### 9.1 Kanban jako primární pohled
Sloupce: Nový | Přiřazený | V řešení | Čeká | Vyřešený
- Drag & drop = změna stavu
- Karta: subject, priority badge, SLA countdown, assignee avatar

### 9.2 Timeline v detailu
```
📩 Vytvořen — 👤 Přiřazen — 💬 Komentář — 📎 Příloha — ✅ Vyřešen
```
Chronologická, s ikonami a timestamps.

### 9.3 Minimální formulář
- OWNER/TENANT: Subject, Description, Priority (3 radio), Attachment
- MANAGER: + Property, Unit, Category, Assignee

---

## 10. Loading, Empty, Error States

Každá stránka MUSÍ mít 4 stavy:
1. **Loading** — Skeleton matching layout
2. **Data** — Normální zobrazení
3. **Empty** — Ilustrace + CTA ("Zatím žádné [entity]. [+ Přidat]")
4. **Error** — ErrorState s retry

**Skeleton:** Tabulka = 5 skeleton řádků. Detail = bloky matching layout. Formulář = NIKDY skeleton.

---

## 11. Jazyková UX abstrakce

### Terminologický slovník

| Technický pojem | UI pojem |
|-----------------|----------|
| Tenant | Organizace |
| Party | Osoba |
| Resident | Osoba / Vlastník / Nájemník (kontextově) |
| Principal | Statutární zástupce |
| OwnerAccount | Konto vlastníka |
| LedgerEntry | Pohyb na kontě |
| Prescription | Předpis plateb |
| PrescriptionComponent | Složka předpisu |
| FundRepair | Fond oprav |
| Tenancy | Nájemní vztah |
| Occupancy | Užívání jednotky |
| BillingPeriod | Zúčtovací období |
| SlaPolicy | Pravidlo SLA |
| WorkOrder | Pracovní příkaz |
| Asset | Zařízení / Vybavení |
| MeterReading | Odečet měřidla |
| Assembly | Shromáždění |
| AuditLog | Historie změn |

### Kontextové pojmy

| Situace | "Osoba" se zobrazí jako |
|---------|------------------------|
| Seznam vlastníků | "Vlastník" |
| Seznam nájemníků | "Nájemník" |
| Kontakty nemovitosti | "Kontaktní osoba" |
| Helpdesk tiket | "Žadatel" / "Řešitel" |
| Work order | "Technik" / "Zadavatel" |
| Protokol | "Dodavatel" / "Objednatel" |

---

## 12. Appendix

### A. Checklist pro nový formulář

Před implementací jakéhokoliv formuláře projdi tento checklist:

- [ ] Kolik polí má model? → Zvol layout (inline / sekce / wizard)
- [ ] Které pole jsou PII? → Přidej 🔒 badge
- [ ] Které pole jsou finanční? → Použij CurrencyInput, mono, right-align
- [ ] Které pole mají enum? → RadioGroup (< 5), Select (5–15), ComboBox (15+)
- [ ] Existuje Zod schema? → Použij zodResolver. Pokud ne → vytvoř ho.
- [ ] Existuje backend DTO? → Ověř že validace frontend = backend
- [ ] Jsou labely v i18n? → Pokud ne, přidej. NIKDY hardcoded strings.
- [ ] Má formulář conditional fields? → Zdokumentuj podmínky
- [ ] Je submit destruktivní? → Přidej ConfirmDialog
- [ ] Jak se zobrazí error z API? → Inline u polí + toast
- [ ] Jak se zobrazí success? → Toast + redirect/close
- [ ] Je formulář v modalu? → Zvol sm/md velikost
- [ ] Funguje na mobile? → Ověř responsive

### B. Checklist pro novou stránku

- [ ] Má 4 stavy? (Loading skeleton, Data, Empty + CTA, Error + retry)
- [ ] Má breadcrumbs?
- [ ] Má page title (h1)?
- [ ] Je v sidebar navigation?
- [ ] Jsou filtry v URL query params?
- [ ] Je tabulka responsive (cards na mobile)?
- [ ] Jsou akce v kebab menu (ne jako sloupce)?
- [ ] Fungují keyboard shortcuts?

---

*DESIGN_SYSTEM.md v1.0 — závazný standard pro ifmio. Aktualizovat při změně design tokenů nebo UX patterns.*

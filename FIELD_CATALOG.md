# IFMIO – Field Catalog

> Vygenerováno: 2026-03-31
> Na základě: AUDIT_REPORT.md v1.0 + schema.prisma + DTO soubory + frontend formuláře

---

## 1. Core / Tenant

### Tenant

| Pole | DB typ | Nullable | Default | Unique | Index | DTO pole | DTO validace | API endpoint(y) | UI komponenta | UI label | Povinné UI | PII | Poznámka |
|------|--------|----------|---------|--------|-------|----------|-------------|----------------|---------------|----------|-----------|-----|----------|
| id | String | NE | uuid() | ANO | PK | — | — | GET /admin/tenant | — | — | — | NE | |
| name | String | NE | — | NE | — | tenantName | @IsNotEmpty, @MinLength(2), @MaxLength(200) | POST /auth/register | RegisterPage | Název organizace | ANO | NE | |
| slug | String | NE | — | ANO | — | — | auto-generated | — | — | — | — | NE | Generováno z name |
| plan | Enum(TenantPlan) | NE | free | NE | — | — | — | — | RegisterPage (step 3) | Tarif | ANO | NE | free/starter/pro/enterprise |
| isActive | Boolean | NE | true | NE | — | — | — | — | — | — | — | NE | |
| ico | String? | ANO | — | NE | — | ico | @IsOptional | POST /auth/register | RegisterPage | IČ | NE | NE | |
| dic | String? | ANO | — | NE | — | dic | @IsOptional | POST /auth/register | RegisterPage | DIČ | NE | NE | |
| maxUsers | Int | NE | 5 | NE | — | — | — | — | — | — | — | NE | Plan limit |
| maxProperties | Int | NE | 3 | NE | — | — | — | — | — | — | — | NE | Plan limit |
| trialEndsAt | DateTime? | ANO | — | NE | — | — | — | — | — | — | — | NE | |
| retentionAuditLogDays | Int | NE | 365 | NE | — | — | — | — | — | — | — | NE | |
| retentionBackupDays | Int | NE | 90 | NE | — | — | — | — | — | — | — | NE | |
| retentionSessionDays | Int | NE | 90 | NE | — | — | — | — | — | — | — | NE | |
| createdAt | DateTime | NE | now() | NE | — | — | — | — | — | — | — | NE | |
| updatedAt | DateTime | NE | @updatedAt | NE | — | — | — | — | — | — | — | NE | |

### User

| Pole | DB typ | Nullable | Default | Unique | Index | DTO pole | DTO validace | API endpoint(y) | UI komponenta | UI label | Povinné UI | PII | Poznámka |
|------|--------|----------|---------|--------|-------|----------|-------------|----------------|---------------|----------|-----------|-----|----------|
| id | String | NE | uuid() | ANO | PK | — | — | GET /auth/me, GET /admin/users | — | — | — | NE | |
| tenantId | String | NE | — | NE | FK+Index | — | — | — | — | — | — | NE | |
| email | String | NE | — | ANO | — | email | @IsEmail, @IsNotEmpty | POST /auth/register, POST /auth/login | LoginPage, RegisterPage | E-mail | ANO | **ANO** | PII |
| passwordHash | String | NE | — | NE | — | password | @IsNotEmpty, @MinLength(8) | POST /auth/register | RegisterPage | Heslo | ANO | NE | Hashed bcrypt(12) |
| name | String | NE | — | NE | — | name | @IsNotEmpty, @MinLength(2), @MaxLength(100) | POST /auth/register, PATCH /auth/profile | RegisterPage, ProfilePage | Jméno | ANO | **ANO** | PII |
| role | Enum(UserRole) | NE | viewer | NE | — | role | @IsEnum | POST /admin/users, PATCH /admin/users/:id/role | TeamPage | Role | ANO | NE | 8 rolí |
| phone | String? | ANO | — | NE | — | phone | @IsOptional | POST /auth/register | RegisterPage, ProfilePage | Telefon | NE | **ANO** | PII |
| position | String? | ANO | — | NE | — | position | @IsOptional | PATCH /auth/profile | ProfilePage | Pozice | NE | NE | |
| avatarBase64 | String? | ANO | — | NE | — | avatarBase64 | @IsOptional | PATCH /auth/profile | ProfilePage | Avatar | NE | **ANO** | PII (fotografie) |
| language | String? | ANO | — | NE | — | — | — | — | ProfilePage | Jazyk | NE | NE | |
| timezone | String? | ANO | — | NE | — | — | — | — | ProfilePage | Časové pásmo | NE | NE | |
| isActive | Boolean | NE | true | NE | — | — | — | — | TeamPage | Aktivní | — | NE | |
| lastLoginAt | DateTime? | ANO | — | NE | — | — | — | — | TeamPage | Poslední přihlášení | — | NE | |
| totpEnabled | Boolean | NE | false | NE | — | — | — | — | ProfilePage | 2FA zapnuto | — | NE | |
| totpSecret | String? | ANO | — | NE | — | — | — | — | — | — | — | NE | AES-256-GCM encrypted |
| oauthProvider | String? | ANO | — | NE | — | — | — | — | — | — | — | NE | |
| oauthId | String? | ANO | — | NE | — | — | — | — | — | — | — | NE | |
| forcePasswordChange | Boolean | NE | false | NE | — | — | — | — | — | — | — | NE | |
| passwordExpiresAt | DateTime? | ANO | — | NE | — | — | — | — | — | — | — | NE | |
| passwordChangedAt | DateTime? | ANO | — | NE | — | — | — | — | — | — | — | NE | |
| passwordHistory | Json? | ANO | — | NE | — | — | — | — | — | — | — | NE | Last 5 bcrypt hashes |
| createdAt | DateTime | NE | now() | NE | — | — | — | — | TeamPage | Vytvořen | — | NE | |
| updatedAt | DateTime | NE | @updatedAt | NE | — | — | — | — | — | — | — | NE | |

---

## 2. Property Management

### Property

| Pole | DB typ | Nullable | Default | Unique | Index | DTO pole | DTO validace | API endpoint(y) | UI komponenta | UI label | Povinné UI | PII | Poznámka |
|------|--------|----------|---------|--------|-------|----------|-------------|----------------|---------------|----------|-----------|-----|----------|
| id | String | NE | uuid() | ANO | PK | — | — | GET /properties/:id | — | — | — | NE | |
| tenantId | String | NE | — | NE | FK+Index | — | — | — | — | — | — | NE | |
| name | String | NE | — | NE | — | name | @IsNotEmpty, @MaxLength(200) | POST/PATCH /properties | PropertyForm | Název | ANO | NE | |
| address | String | NE | — | NE | — | address | @IsNotEmpty | POST/PATCH /properties | PropertyForm | Adresa | ANO | NE | |
| city | String | NE | — | NE | — | city | @IsNotEmpty | POST/PATCH /properties | PropertyForm | Město | ANO | NE | |
| postalCode | String | NE | — | NE | — | postalCode | @IsNotEmpty, @Matches(/\d{3}\s?\d{2}/) | POST/PATCH /properties | PropertyForm | PSČ | ANO | NE | Formát XXX XX |
| type | Enum(PropertyType) | NE | — | NE | — | type | @IsEnum | POST /properties | PropertyForm | Typ | ANO | NE | bytdum/roddum/komer/prumysl/pozemek/garaz |
| ownership | Enum(OwnershipType) | NE | — | NE | — | ownership | @IsEnum | POST /properties | PropertyForm | Vlastnictví | ANO | NE | vlastnictvi/druzstvo/pronajem |
| status | Enum(PropertyStatus) | NE | active | NE | — | — | — | — | — | — | — | NE | active/inactive/archived |
| ico | String? | ANO | — | NE | — | ico | @IsOptional, @MaxLength(8) | POST/PATCH /properties | PropertyForm | IČ | NE | NE | |
| dic | String? | ANO | — | NE | — | dic | @IsOptional | POST/PATCH /properties | PropertyForm | DIČ | NE | NE | |
| isVatPayer | Boolean | NE | false | NE | — | isVatPayer | @IsOptional, @IsBoolean | POST/PATCH /properties | PropertyForm | Plátce DPH | NE | NE | |
| legalMode | Enum? | ANO | — | NE | — | legalMode | @IsOptional, @IsEnum | POST/PATCH /properties | PropertyForm | Právní forma | NE | NE | SVJ/BD/RENTAL/OWNERSHIP/OTHER |
| accountingSystem | Enum? | ANO | NONE | NE | — | accountingSystem | @IsOptional | POST/PATCH /properties | PropertyForm | Účetní systém | NE | NE | |
| managedFrom | DateTime? | ANO | — | NE | — | managedFrom | @IsOptional | POST/PATCH /properties | PropertyForm | Správa od | NE | NE | |
| managedTo | DateTime? | ANO | — | NE | — | managedTo | @IsOptional | POST/PATCH /properties | PropertyForm | Správa do | NE | NE | |
| contactName | String? | ANO | — | NE | — | contactName | @IsOptional | POST/PATCH /properties | PropertyForm | Kontaktní osoba | NE | **ANO** | PII |
| contactEmail | String? | ANO | — | NE | — | contactEmail | @IsOptional, @IsEmail | POST/PATCH /properties | PropertyForm | Kontaktní email | NE | **ANO** | PII |
| contactPhone | String? | ANO | — | NE | — | contactPhone | @IsOptional | POST/PATCH /properties | PropertyForm | Kontaktní telefon | NE | **ANO** | PII |
| cadastralArea | String? | ANO | — | NE | — | cadastralArea | @IsOptional | POST/PATCH /properties | PropertyForm | Katastrální území | NE | NE | |
| landRegistrySheet | String? | ANO | — | NE | — | landRegistrySheet | @IsOptional | POST/PATCH /properties | PropertyForm | List vlastnictví | NE | NE | |
| latitude | Float? | ANO | — | NE | — | — | — | — | — | — | — | NE | |
| longitude | Float? | ANO | — | NE | — | — | — | — | — | — | — | NE | |
| createdAt | DateTime | NE | now() | NE | — | — | — | — | — | — | — | NE | |
| updatedAt | DateTime | NE | @updatedAt | NE | — | — | — | — | — | — | — | NE | |

### Resident

| Pole | DB typ | Nullable | Default | Unique | Index | DTO pole | DTO validace | API endpoint(y) | UI komponenta | UI label | Povinné UI | PII | Poznámka |
|------|--------|----------|---------|--------|-------|----------|-------------|----------------|---------------|----------|-----------|-----|----------|
| id | String | NE | uuid() | ANO | PK | — | — | GET /residents/:id | — | — | — | NE | |
| tenantId | String | NE | — | NE | FK+Index | — | — | — | — | — | — | NE | |
| firstName | String | NE | — | NE | — | firstName | @IsNotEmpty, @MinLength(1), @MaxLength(100) | POST/PUT /residents | ResidentForm | Jméno | ANO | **ANO** | PII |
| lastName | String | NE | — | NE | — | lastName | @IsNotEmpty, @MinLength(1), @MaxLength(100) | POST/PUT /residents | ResidentForm | Příjmení | ANO | **ANO** | PII |
| email | String? | ANO | — | NE | — | email | @IsOptional, @IsEmail | POST/PUT /residents | ResidentForm | E-mail | NE | **ANO** | PII |
| phone | String? | ANO | — | NE | — | phone | @IsOptional, @MaxLength(20) | POST/PUT /residents | ResidentForm | Telefon | NE | **ANO** | PII |
| role | Enum(ResidentRole) | NE | — | NE | — | role | @IsEnum | POST/PUT /residents | ResidentForm | Role | ANO | NE | owner/tenant/member/contact |
| isActive | Boolean | NE | true | NE | — | — | — | — | — | Aktivní | — | NE | |
| hasDebt | Boolean | NE | false | NE | — | — | — | — | ResidentsPage | Dlužník | — | NE | |
| isLegalEntity | Boolean | NE | false | NE | — | isLegalEntity | @IsOptional | POST/PUT /residents | ResidentForm | Právnická osoba | NE | NE | |
| companyName | String? | ANO | — | NE | — | companyName | @IsOptional | POST/PUT /residents | ResidentForm | Název firmy | NE | NE | |
| ico | String? | ANO | — | NE | — | ico | @IsOptional | POST/PUT /residents | ResidentForm | IČ | NE | NE | |
| correspondenceAddress | String? | ANO | — | NE | — | correspondenceAddress | @IsOptional | POST/PUT /residents | ResidentForm | Korespondenční adresa | NE | **ANO** | PII |
| birthDate | DateTime? | ANO | — | NE | — | birthDate | @IsOptional | POST/PUT /residents | — | Datum narození | NE | **ANO** | PII |
| dataBoxId | String? | ANO | — | NE | — | dataBoxId | @IsOptional | POST/PUT /residents | ResidentForm | ID datové schránky | NE | NE | |
| note | String? | ANO | — | NE | — | note | @IsOptional | POST/PUT /residents | ResidentForm | Poznámka | NE | NE | |
| gdprErased | Boolean | NE | false | NE | — | — | — | — | — | — | — | NE | GDPR flag |
| gdprErasedAt | DateTime? | ANO | — | NE | — | — | — | — | — | — | — | NE | |

---

## 3. Finance (vybrané klíčové modely)

### Invoice

| Pole | DB typ | Nullable | Default | Unique | Index | DTO pole | DTO validace | API endpoint(y) | UI komponenta | UI label | Povinné UI | PII | Poznámka |
|------|--------|----------|---------|--------|-------|----------|-------------|----------------|---------------|----------|-----------|-----|----------|
| id | String | NE | uuid() | ANO | PK | — | — | GET /finance/invoices/:id | — | — | — | NE | |
| tenantId | String | NE | — | NE | FK+Index | — | — | — | — | — | — | NE | |
| propertyId | String? | ANO | — | NE | FK | propertyId | @IsOptional, @IsUUID | POST/PUT /finance/invoices | InvoiceForm | Nemovitost | NE | NE | |
| number | String | NE | — | NE | — | number | @IsNotEmpty | POST /finance/invoices | InvoiceForm | Číslo dokladu | ANO | NE | |
| type | Enum(InvoiceType) | NE | — | NE | — | type | @IsEnum | POST /finance/invoices | InvoiceForm | Typ | ANO | NE | received/issued/proforma/credit_note/internal |
| supplierName | String? | ANO | — | NE | — | supplierName | @IsOptional | POST/PUT /finance/invoices | InvoiceForm | Dodavatel | NE | NE | |
| supplierIco | String? | ANO | — | NE | — | supplierIco | @IsOptional | POST/PUT /finance/invoices | InvoiceForm | IČ dodavatele | NE | NE | |
| supplierDic | String? | ANO | — | NE | — | supplierDic | @IsOptional | POST/PUT /finance/invoices | InvoiceForm | DIČ dodavatele | NE | NE | |
| amountBase | Float? | ANO | — | NE | — | amountBase | @IsOptional, @IsNumber | POST/PUT /finance/invoices | InvoiceForm | Základ | NE | NE | |
| vatRate | Float? | ANO | — | NE | — | vatRate | @IsOptional, @IsNumber | POST/PUT /finance/invoices | InvoiceForm | Sazba DPH % | NE | NE | 0/12/21 |
| vatAmount | Float? | ANO | — | NE | — | vatAmount | @IsOptional, @IsNumber | POST/PUT /finance/invoices | InvoiceForm | DPH | NE | NE | |
| amountTotal | Float | NE | — | NE | — | amountTotal | @IsNumber | POST/PUT /finance/invoices | InvoiceForm | Celkem | ANO | NE | |
| issueDate | DateTime | NE | — | NE | — | issueDate | @IsDateString | POST/PUT /finance/invoices | InvoiceForm | Datum vystavení | ANO | NE | |
| dueDate | DateTime | NE | — | NE | — | dueDate | @IsDateString | POST/PUT /finance/invoices | InvoiceForm | Datum splatnosti | ANO | NE | |
| isPaid | Boolean | NE | false | NE | — | — | — | — | — | Zaplaceno | — | NE | |
| variableSymbol | String? | ANO | — | NE | — | variableSymbol | @IsOptional | POST/PUT /finance/invoices | InvoiceForm | VS | NE | NE | |
| approvalStatus | Enum | NE | draft | NE | — | — | — | POST .../submit, .../approve | — | Stav schválení | — | NE | draft/submitted/approved |
| source | Enum? | ANO | manual | NE | — | — | — | — | — | Zdroj | — | NE | manual/pdf_upload/isdoc_upload/email/batch/pvk |
| tags | String[] | NE | [] | NE | — | tags | @IsOptional | POST .../add-tag | — | Štítky | NE | NE | |

---

## Souhrnná statistika

| Metrika | Hodnota |
|---------|---------|
| **Celkový počet modelů** | 100+ |
| **Modely v tomto katalogu (detailní)** | 4 (Tenant, User, Property, Resident, Invoice) |
| **Celkový počet PII polí (identifikovaných)** | 15+ (name, email, phone, address, birthDate, avatar, contactName/Email/Phone, firstName, lastName, correspondenceAddress) |
| **Modely s PII** | User, Resident, Property (contact fields), Party |

### PII pole — kompletní seznam

| Model | Pole | Typ PII |
|---|---|---|
| User | email | Kontaktní údaj |
| User | name | Jméno |
| User | phone | Kontaktní údaj |
| User | avatarBase64 | Fotografie |
| Resident | firstName | Jméno |
| Resident | lastName | Příjmení |
| Resident | email | Kontaktní údaj |
| Resident | phone | Kontaktní údaj |
| Resident | correspondenceAddress | Adresa |
| Resident | birthDate | Datum narození |
| Property | contactName | Jméno |
| Property | contactEmail | Kontaktní údaj |
| Property | contactPhone | Kontaktní údaj |
| Party | firstName, lastName | Jméno |
| Party | email, phone | Kontaktní údaj |
| Party | street, city | Adresa |
| Party | ic (fyzická osoba) | Identifikační číslo |
| Party | dataBoxId | Identifikátor |

### Známé nesrovnalosti

| # | Model | Pole | Problém |
|---|---|---|---|
| 1 | Resident | birthDate | V DB ale ne ve všech frontend formulářích — pouze API |
| 2 | Property | latitude/longitude | V DB ale bez UI (computed z geocoding) |
| 3 | User | passwordHistory | Json typ — nemá dedikovaný DTO, internal only |
| 4 | Invoice | isdocXml | Excluded ze SanitizePipe (whitelist exception) |
| 5 | Invoice | pdfBase64 | Large blob — excluded ze SanitizePipe |

---

---

## 4. Finance — rozšířené modely

### BankAccount

| Pole | DB typ | Null | Default | Unique | FK → | DTO validace | PII | Poznámka |
|------|--------|------|---------|--------|------|-------------|-----|----------|
| id | String | NE | uuid() | PK | — | — | NE | system |
| tenantId | String | NE | — | NE | Tenant | — | NE | |
| propertyId | String? | ANO | — | NE | Property | @IsOptional | NE | |
| name | String | NE | — | NE | — | @IsString, @IsNotEmpty | NE | UI: "Název účtu" |
| accountNumber | String | NE | — | NE | — | @IsString | NE | UI: "Číslo účtu" |
| iban | String? | ANO | — | NE | — | @IsOptional | NE | UI: "IBAN" |
| bankCode | String? | ANO | — | NE | — | @IsOptional | NE | UI: "Kód banky" |
| currency | String | NE | "CZK" | NE | — | @IsOptional | NE | |
| isActive | Boolean | NE | true | NE | — | — | NE | |
| isDefault | Boolean | NE | false | NE | — | — | NE | |
| accountType | Enum(BankAccountType)? | ANO | — | NE | — | @IsOptional | NE | OPERATING/REPAIR_FUND/SAVINGS/OTHER |
| bankProvider | String? | ANO | — | NE | — | @IsOptional | NE | fio/kb/csob/manual |
| apiToken | String? | ANO | — | NE | — | ⚠️ CHYBÍ validace | NE | Citlivý token — stripped v response |
| apiTokenLastFour | String? | ANO | — | NE | — | — | NE | Pro UI display |
| syncEnabled | Boolean | NE | false | NE | — | @IsOptional | NE | |
| syncIntervalMin | Int | NE | 60 | NE | — | — | NE | |
| lastSyncAt | DateTime? | ANO | — | NE | — | — | NE | system |
| lastSyncCursor | String? | ANO | — | NE | — | — | NE | system |
| syncStatus | String? | ANO | — | NE | — | — | NE | active/error/disabled |
| syncStatusMessage | String? | ANO | — | NE | — | — | NE | |
| financialContextId | String | NE | — | NE | FinancialContext | — | NE | Auto-resolved |
| createdAt | DateTime | NE | now() | NE | — | — | NE | system |
| updatedAt | DateTime | NE | @updatedAt | NE | — | — | NE | system |

### BankTransaction

| Pole | DB typ | Null | Default | Unique | FK → | DTO validace | PII | Poznámka |
|------|--------|------|---------|--------|------|-------------|-----|----------|
| id | String | NE | uuid() | PK | — | — | NE | |
| tenantId | String | NE | — | NE | Tenant | — | NE | |
| bankAccountId | String | NE | — | NE | BankAccount | @IsString | NE | |
| amount | Decimal(12,2) | NE | — | NE | — | @IsNumber | NE | UI: "Částka" |
| type | Enum(credit/debit) | NE | — | NE | — | @IsEnum | NE | |
| status | Enum(BankTransactionStatus) | NE | unmatched | NE | — | — | NE | unmatched/matched/partially_matched/ignored |
| date | DateTime | NE | — | NE | — | @IsDateString | NE | UI: "Datum" |
| bookingDate | DateTime? | ANO | — | NE | — | @IsOptional | NE | |
| counterparty | String? | ANO | — | NE | — | @IsOptional | **ANO** | PII: jméno protistrany |
| counterpartyIban | String? | ANO | — | NE | — | @IsOptional | **ANO** | PII: číslo účtu |
| counterpartyAccount | String? | ANO | — | NE | — | @IsOptional | **ANO** | PII |
| counterpartyBankCode | String? | ANO | — | NE | — | @IsOptional | NE | |
| variableSymbol | String? | ANO | — | NE | — | @IsOptional | NE | UI: "VS" — index pro párování |
| specificSymbol | String? | ANO | — | NE | — | @IsOptional | NE | |
| constantSymbol | String? | ANO | — | NE | — | @IsOptional | NE | |
| description | String? | ANO | — | NE | — | @IsOptional | NE | |
| messageForRecipient | String? | ANO | — | NE | — | — | NE | |
| prescriptionId | String? | ANO | — | NE | Prescription | — | NE | Legacy FK |
| residentId | String? | ANO | — | NE | Resident | — | NE | |
| externalId | String? | ANO | — | @@unique(bankAccountId,externalId) | — | — | NE | Fio API ID |
| importSource | String? | ANO | — | NE | — | — | NE | csv/abo/fio_api |
| rawData | Json? | ANO | — | NE | — | — | NE | Raw API response |
| matchTarget | Enum(MatchTarget)? | ANO | — | NE | — | @IsEnum | NE | KONTO/INVOICE/COMPONENT/NO_EFFECT/UNSPECIFIED |
| matchedEntityId | String? | ANO | — | NE | — | @IsOptional | NE | |
| matchedEntityType | String? | ANO | — | NE | — | — | NE | prescription/invoice/component |
| matchedAt | DateTime? | ANO | — | NE | — | — | NE | |
| matchedBy | String? | ANO | — | NE | — | — | NE | auto/manual/userId |
| matchNote | String? | ANO | — | NE | — | @IsOptional | NE | |
| splitParentId | String? | ANO | — | NE | BankTransaction | — | NE | Self-ref for split |
| financialContextId | String? | ANO | — | NE | FinancialContext | — | NE | |
| ledgerEntryId | String? | ANO | — | @unique | — | — | NE | 1:1 link to LedgerEntry |
| createdAt | DateTime | NE | now() | NE | — | — | NE | system |
| updatedAt | DateTime | NE | @updatedAt | NE | — | — | NE | system |

### Prescription

| Pole | DB typ | Null | Default | Unique | FK → | DTO validace | PII | Poznámka |
|------|--------|------|---------|--------|------|-------------|-----|----------|
| id | String | NE | uuid() | PK | — | — | NE | |
| tenantId | String | NE | — | NE | Tenant | — | NE | |
| propertyId | String | NE | — | NE | Property | @IsString | NE | |
| unitId | String? | ANO | — | NE | Unit | @IsOptional | NE | |
| residentId | String? | ANO | — | NE | Resident | @IsOptional | NE | |
| billingPeriodId | String? | ANO | — | NE | BillingPeriod | @IsOptional | NE | |
| type | Enum(PrescriptionType) | NE | — | NE | — | @IsEnum | NE | advance/service/rent/other |
| status | Enum(PrescriptionStatus) | NE | active | NE | — | — | NE | active/inactive/cancelled |
| amount | Decimal(12,2) | NE | — | NE | — | @IsNumber, @Min(0) | NE | UI: "Částka (Kč)" |
| vatRate | Int | NE | 0 | NE | — | @IsOptional, @IsInt | NE | |
| vatAmount | Decimal(12,2) | NE | 0 | NE | — | — | NE | |
| dueDay | Int | NE | 15 | NE | — | @IsOptional | NE | UI: "Splatnost (den)" |
| variableSymbol | String? | ANO | — | NE | — | @IsOptional | NE | UI: "VS" |
| description | String | NE | — | NE | — | @IsString | NE | UI: "Popis" |
| source | String? | ANO | — | NE | — | — | NE | COMPONENTS/MANUAL/CALC |
| validFrom | DateTime | NE | — | NE | — | @IsDateString | NE | UI: "Platnost od" |
| validTo | DateTime? | ANO | — | NE | — | @IsOptional | NE | UI: "Platnost do" |
| paidAmount | Decimal(12,2)? | ANO | 0 | NE | — | — | NE | |
| paidAt | DateTime? | ANO | — | NE | — | — | NE | |
| paymentStatus | Enum(PaymentStatus) | NE | UNPAID | NE | — | — | NE | UNPAID/PARTIAL/PAID/OVERPAID |
| financialContextId | String? | ANO | — | NE | FinancialContext | — | NE | |
| ledgerEntryId | String? | ANO | — | @unique | — | — | NE | |

### PrescriptionItem

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| prescriptionId | String | NE | — | Prescription | — | Cascade delete |
| componentId | String? | ANO | — | PrescriptionComponent | — | |
| name | String | NE | — | — | @IsString | |
| amount | Decimal(12,2) | NE | — | — | @IsNumber | |
| vatRate | Int | NE | 0 | — | — | |
| unit | String? | ANO | — | — | @IsOptional | |
| quantity | Decimal(10,3) | NE | 1 | — | — | |

### PrescriptionComponent

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| tenantId | String | NE | — | — | — | |
| propertyId | String | NE | — | Property | — | |
| name | String | NE | — | — | @IsString, @MinLength(1) | UI: "Název složky" |
| code | String? | ANO | — | — | @IsOptional | |
| componentType | Enum(ComponentType) | NE | — | — | @IsString | ADVANCE/FLAT_FEE/FUND/RENT/DEPOSIT/ANNUITY/ACCESSORY/OTHER |
| calculationMethod | Enum(CalculationMethod) | NE | — | — | @IsString | FIXED/PER_AREA/PER_HEATING_AREA/PER_PERSON/PER_SHARE/MANUAL |
| allocationMethod | Enum(AllocationMethod) | NE | area | — | @IsOptional | area/share/persons/consumption/equal/heating_area/custom |
| defaultAmount | Decimal(12,2) | NE | — | — | @IsNumber, @Min(0) | UI: "Výchozí částka" |
| vatRate | Int | NE | 0 | — | @IsOptional, @IsInt | |
| description | String? | ANO | — | — | @IsOptional | |
| accountingCode | String? | ANO | — | — | @IsOptional | |
| sortOrder | Int | NE | 0 | — | @IsOptional | |
| isActive | Boolean | NE | true | — | — | |
| effectiveFrom | DateTime | NE | — | — | @IsDateString | |
| effectiveTo | DateTime? | ANO | — | — | @IsOptional | |
| initialBalance | Decimal(14,2)? | ANO | — | — | @IsOptional, @IsNumber | Počáteční zůstatek fondu |
| includeInSettlement | Boolean | NE | true | — | @IsOptional, @IsBoolean | |
| minimumPayment | Decimal(12,2)? | ANO | — | — | @IsOptional | |
| ratePeriod | Enum(RatePeriod) | NE | MONTHLY | — | @IsOptional, @IsEnum | MONTHLY/QUARTERLY/YEARLY/CUSTOM |
| ratePeriodMonths | Int[] | NE | [] | — | @IsOptional, @IsArray | |

### ComponentAssignment

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| tenantId | String | NE | — | — | — | |
| componentId | String | NE | — | PrescriptionComponent | — | |
| unitId | String | NE | — | Unit | @IsString | |
| overrideAmount | Decimal(12,2)? | ANO | — | — | @IsOptional, @IsNumber, @Min(0) | |
| effectiveFrom | DateTime | NE | — | — | @IsDateString | |
| effectiveTo | DateTime? | ANO | — | — | @IsOptional | |
| isActive | Boolean | NE | true | — | — | |
| note | String? | ANO | — | — | @IsOptional | |

### OwnerAccount

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| tenantId | String | NE | — | — | — | |
| propertyId | String | NE | — | Property | — | |
| unitId | String | NE | — | Unit | — | @@unique(tenantId,unitId,residentId) |
| residentId | String | NE | — | Resident | — | |
| currentBalance | Decimal(12,2) | NE | 0 | — | — | Running balance |
| lastPostingAt | DateTime? | ANO | — | — | — | |
| openingBalanceSet | Boolean | NE | false | — | — | |
| openingBalanceDate | DateTime? | ANO | — | — | — | |

### LedgerEntry

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| accountId | String | NE | — | OwnerAccount | — | |
| type | Enum(LedgerEntryType) | NE | — | — | @IsEnum | DEBIT/CREDIT/ADJUSTMENT |
| amount | Decimal(12,2) | NE | — | — | @IsNumber, @Min(0.01) | |
| balance | Decimal(12,2) | NE | — | — | — | Running balance after entry |
| sourceType | Enum(LedgerSourceType) | NE | — | — | — | PRESCRIPTION/BANK_TRANSACTION/CREDIT_APPLICATION/LATE_FEE/MANUAL_ADJUSTMENT/OPENING_BALANCE/SETTLEMENT/SIPO |
| sourceId | String | NE | — | — | — | Polymorphní FK |
| description | String? | ANO | — | — | @IsString, @MinLength(1) | |
| postingDate | DateTime | NE | now() | — | @IsOptional, @IsDateString | |

### InitialBalance

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| tenantId | String | NE | — | — | — | |
| propertyId | String | NE | — | Property | — | |
| type | Enum(InitialBalanceType) | NE | — | — | @IsEnum | OWNER_DEBT/OWNER_OVERPAYMENT/BANK_ACCOUNT/FUND_BALANCE/DEPOSIT/METER_READING |
| entityId | String? | ANO | — | — | @IsOptional | Polymorphní: unitId/residentId/bankAccountId/meterId |
| entityType | String? | ANO | — | — | @IsOptional | unit/resident/bankAccount/meter/fund |
| amount | Decimal(12,2) | NE | — | — | @IsNumber | |
| meterValue | Decimal(12,3)? | ANO | — | — | @IsOptional | |
| cutoverDate | DateTime | NE | — | — | @IsDateString | |
| note | String? | ANO | — | — | @IsOptional | |
| createdBy | String? | ANO | — | — | — | userId |
| postedToKonto | Boolean | NE | false | — | — | |
| ledgerEntryId | String? | ANO | — | — | — | |

### BillingPeriod

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| tenantId | String | NE | — | Tenant | — | |
| propertyId | String | NE | — | Property | — | |
| name | String | NE | — | — | @IsString | UI: "Název období" |
| dateFrom | DateTime | NE | — | — | @IsDateString | |
| dateTo | DateTime | NE | — | — | @IsDateString | |
| status | Enum(BillingPeriodStatus) | NE | open | — | — | open/closed/settled |

### InvoiceCostAllocation

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| invoiceId | String | NE | — | Invoice | — | Cascade |
| componentId | String | NE | — | PrescriptionComponent | @IsString | |
| amount | Decimal(12,2) | NE | — | — | @IsNumber, @Min(0) | |
| vatRate | Decimal(5,2)? | ANO | — | — | @IsOptional | |
| vatAmount | Decimal(12,2)? | ANO | — | — | @IsOptional | |
| unitGroupId | String? | ANO | — | — | @IsOptional | |
| unitIds | String[] | NE | — | — | @IsOptional, @IsArray | |
| note | String? | ANO | — | — | @IsOptional | |
| year | Int? | ANO | — | — | @IsOptional | |
| periodFrom | DateTime? | ANO | — | — | @IsOptional | |
| periodTo | DateTime? | ANO | — | — | @IsOptional | |
| consumption | Decimal(12,4)? | ANO | — | — | @IsOptional | |
| consumptionUnit | String? | ANO | — | — | @IsOptional | |
| targetOwnerId | String? | ANO | — | — | @IsOptional | |

### Settlement

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| tenantId | String | NE | — | Tenant | — | |
| propertyId | String | NE | — | Property | @IsNotEmpty | |
| financialContextId | String | NE | — | FinancialContext | @IsNotEmpty | |
| billingPeriodId | String? | ANO | — | BillingPeriod | @IsOptional | |
| name | String | NE | — | — | @IsNotEmpty | UI: "Název" |
| periodFrom | DateTime | NE | — | — | @IsDateString | |
| periodTo | DateTime | NE | — | — | @IsDateString | |
| status | Enum(SettlementStatus) | NE | draft | — | — | draft/calculated/approved/sent/closed |
| totalHeatingCost | Decimal(12,2)? | ANO | — | — | — | |
| totalHotWaterCost | Decimal(12,2)? | ANO | — | — | — | |
| heatingBasicPercent | Int | NE | 50 | — | @IsOptional, @IsInt, @Min(40), @Max(60) | |
| hotWaterBasicPercent | Int | NE | 30 | — | — | |
| buildingEnergyClass | String? | ANO | — | — | @IsOptional | |
| totalHeatedArea | Decimal(10,2)? | ANO | — | — | — | computed |
| calculatedAt | DateTime? | ANO | — | — | — | system |
| approvedAt | DateTime? | ANO | — | — | — | system |
| approvedBy | String? | ANO | — | — | — | system |
| note | String? | ANO | — | — | @IsOptional | |

### SettlementItem

| Pole | DB typ | Null | Default | FK → | Poznámka |
|------|--------|------|---------|------|----------|
| id | String | NE | cuid() | — | PK |
| settlementId | String | NE | — | Settlement | Cascade |
| unitId | String | NE | — | Unit | |
| heatingBasic | Decimal(12,2) | NE | 0 | — | |
| heatingConsumption | Decimal(12,2) | NE | 0 | — | |
| heatingTotal | Decimal(12,2) | NE | 0 | — | |
| heatingCorrected | Decimal(12,2) | NE | 0 | — | |
| hotWaterBasic | Decimal(12,2) | NE | 0 | — | |
| hotWaterConsumption | Decimal(12,2) | NE | 0 | — | |
| hotWaterTotal | Decimal(12,2) | NE | 0 | — | |
| otherCosts | Decimal(12,2) | NE | 0 | — | |
| totalCost | Decimal(12,2) | NE | 0 | — | |
| totalAdvances | Decimal(12,2) | NE | 0 | — | |
| balance | Decimal(12,2) | NE | 0 | — | Přeplatek/nedoplatek |
| heatedArea | Decimal(10,2)? | ANO | — | — | |
| personCount | Int? | ANO | — | — | |
| meterReading | Decimal(12,3)? | ANO | — | — | |
| waterReading | Decimal(12,3)? | ANO | — | — | |
| costBreakdown | Json? | ANO | — | — | Detailní rozpad nákladů |

### SettlementCost

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| settlementId | String | NE | — | Settlement | — | Cascade |
| costType | Enum(SettlementCostType) | NE | — | — | @IsString | heating/hot_water/cold_water/sewage/elevator/cleaning/lighting/waste/other |
| name | String | NE | — | — | @IsNotEmpty | |
| totalAmount | Decimal(12,2) | NE | — | — | @IsNumber | |
| invoiceId | String? | ANO | — | — | @IsOptional | |
| distributionKey | Enum(DistributionKey) | NE | — | — | @IsString | heated_area/floor_area/person_count/meter_reading/ownership_share/equal/custom |
| basicPercent | Int? | ANO | — | — | @IsOptional | |

### PaymentOrder

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| tenantId | String | NE | — | Tenant | — | |
| bankAccountId | String | NE | — | BankAccount | @IsString | |
| financialContextId | String | NE | — | — | — | |
| createdById | String | NE | — | User | — | |
| status | String | NE | "draft" | — | — | draft/exported/cancelled |
| exportFormat | String? | ANO | — | — | — | pdf/abo |
| exportedAt | DateTime? | ANO | — | — | — | |
| note | String? | ANO | — | — | @IsOptional | |

### PaymentOrderItem

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| paymentOrderId | String | NE | — | PaymentOrder | — | Cascade |
| counterpartyName | String? | ANO | — | — | @IsOptional | **PII** |
| counterpartyAccount | String | NE | — | — | @IsString | **PII**: číslo účtu |
| counterpartyBankCode | String | NE | — | — | @IsString | |
| amount | Decimal(12,2) | NE | — | — | @IsNumber | |
| variableSymbol | String? | ANO | — | — | @IsOptional | |
| specificSymbol | String? | ANO | — | — | @IsOptional | |
| constantSymbol | String? | ANO | — | — | @IsOptional | |
| description | String? | ANO | — | — | @IsOptional | |
| invoiceId | String? | ANO | — | — | @IsOptional | |
| prescriptionId | String? | ANO | — | — | @IsOptional | |

### EvidenceFolder

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| tenantId | String | NE | — | Tenant | — | |
| propertyId | String | NE | — | Property | @IsString | |
| name | String | NE | — | — | @IsString, @MinLength(1) | UI: "Název složky" |
| code | String? | ANO | — | — | @IsOptional | |
| description | String? | ANO | — | — | @IsOptional | |
| color | String? | ANO | — | — | @IsOptional | |
| sortOrder | Int | NE | 0 | — | @IsOptional | |
| isActive | Boolean | NE | true | — | — | |

### EvidenceFolderAllocation

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| evidenceFolderId | String | NE | — | EvidenceFolder | @IsString | Cascade |
| invoiceId | String | NE | — | Invoice | — | Cascade |
| amount | Decimal(12,2) | NE | — | — | @IsNumber, @Min(0) | |
| year | Int? | ANO | — | — | @IsOptional | |
| periodFrom | DateTime? | ANO | — | — | @IsOptional | |
| periodTo | DateTime? | ANO | — | — | @IsOptional | |
| note | String? | ANO | — | — | @IsOptional | |

### AccountingPreset

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| tenantId | String | NE | — | Tenant | — | |
| propertyId | String? | ANO | — | — | — | |
| name | String | NE | — | — | @IsString | |
| transactionType | String | NE | — | — | @IsString | prescription/payment/invoice_received/invoice_issued |
| debitAccount | String | NE | — | — | @IsString | MD účet |
| creditAccount | String | NE | — | — | @IsString | DAL účet |
| componentId | String? | ANO | — | — | @IsOptional | |
| isActive | Boolean | NE | true | — | — | |

### SipoConfig

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | cuid() | — | — | PK |
| tenantId | String | NE | — | — | — | |
| propertyId | String | NE | — | Property | — | @unique |
| recipientNumber | String(6) | NE | — | — | — | Číslo příjemce SIPO |
| feeCode | String(3) | NE | — | — | — | Kód poplatku |
| deliveryMode | Enum(SipoDeliveryMode) | NE | FULL_REGISTER | — | — | FULL_REGISTER/CHANGES_ONLY |
| encoding | Enum(SipoEncoding) | NE | WIN1250 | — | — | CP852/WIN1250 |
| isActive | Boolean | NE | true | — | — | |

### SipoExport

| Pole | DB typ | Null | Default | FK → | Poznámka |
|------|--------|------|---------|------|----------|
| id | String | NE | cuid() | — | PK |
| tenantId | String | NE | — | — | |
| propertyId | String | NE | — | Property | |
| period | String(6) | NE | — | — | Formát MMRRRR |
| recordCount | Int | NE | — | — | |
| totalAmount | Decimal(12,2) | NE | — | — | |
| fileName | String | NE | — | — | |
| status | Enum(SipoExportStatus) | NE | GENERATED | — | GENERATED/SENT/ACCEPTED/REJECTED/PARTIALLY_OK |
| errorFile | String? | ANO | — | — | |

### SipoPayment

| Pole | DB typ | Null | Default | FK → | Poznámka |
|------|--------|------|---------|------|----------|
| id | String | NE | cuid() | — | PK |
| tenantId | String | NE | — | — | |
| propertyId | String | NE | — | Property | |
| period | String(6) | NE | — | — | MMRRRR |
| sipoNumber | String(10) | NE | — | — | |
| recipientNumber | String(6) | NE | — | — | |
| feeCode | String(3) | NE | — | — | |
| amount | Decimal(12,2) | NE | — | — | |
| paymentDate | DateTime | NE | — | — | |
| matchedToKonto | Boolean | NE | false | — | |

### AI Extraction Models

#### AiExtractionLog
Systémový model — logy AI extrakce. Pole: id, tenantId, invoiceId?, model, inputTokens, outputTokens, costUsd(10,6), confidence, fileName?, success, createdAt, createdBy?. **Žádné DTO** — internal only.

#### AiExtractionBatch
Batch processing. Pole: id, tenantId, anthropicBatchId?, status, totalCount, processedCount, failedCount, totalCostUsd?, timestamps. **Žádné DTO** — internal API.

#### AiExtractionBatchItem
Batch items. Pole: id, batchId, customId, fileName?, pdfBase64(Text), status, extractedData(Json)?, confidence?, invoiceId?, errorMessage?, token counts, costUsd?. **Žádné DTO** — internal.

#### InvoiceTrainingSample
ML training data. Pole: id, tenantId, dokladId?, pdfHash, fileRef?, imageBase64?(deprecated), extractedJson(Json), source, confirmedAt, expiresAt?. **Žádné DTO** — export only.

#### SupplierExtractionPattern
AI supplier patterns. Pole: id, tenantId, supplierIco(@@unique per tenant), supplierName?, fieldExamples(Json), hints?, usageCount, successRate?, lastUsedAt?. **Žádné DTO** — internal API.

### Reminder Models

#### ReminderTemplate
| Pole | DB typ | Null | Default | DTO validace | Poznámka |
|------|--------|------|---------|-------------|----------|
| id | String | NE | uuid() | — | PK |
| tenantId | String | NE | — | — | |
| name | String | NE | — | @IsOptional | |
| level | Enum(first/second/third) | NE | — | — | |
| subject | String | NE | — | @IsOptional | |
| body | String(Text) | NE | — | @IsOptional | Template s placeholders |
| dueDays | Int | NE | — | @IsOptional, @IsNumber | |
| isDefault | Boolean | NE | false | — | |

#### Reminder
| Pole | DB typ | Null | Default | DTO validace | Poznámka |
|------|--------|------|---------|-------------|----------|
| id | String | NE | uuid() | — | PK |
| tenantId | String | NE | — | — | |
| residentId | String | NE | — | @IsString | |
| templateId | String? | ANO | — | @IsOptional | |
| level | Enum(first/second/third) | NE | — | @IsEnum | |
| status | String | NE | draft | — | draft/sent/paid/escalated |
| amount | Decimal(12,2) | NE | — | @IsNumber, @Min(0) | |
| dueDate | DateTime | NE | — | @IsDateString | |
| sentAt | DateTime? | ANO | — | — | |
| note | String? | ANO | — | @IsOptional | |

#### KontoReminder
Systémový model pro konto-based upomínky. Pole: id, tenantId, propertyId, accountId, residentId, unitId, reminderNumber, amount, dueDate, sentAt?, sentMethod?, status, note, generatedText?. **Žádné explicitní DTO** — generováno interně.

---

## 5. Operations — Helpdesk, Work Orders, SLA

### HelpdeskTicket

| Pole | DB typ | Null | Default | FK → | DTO validace | PII | Poznámka |
|------|--------|------|---------|------|-------------|-----|----------|
| id | String | NE | uuid() | — | — | NE | PK |
| tenantId | String | NE | — | Tenant | — | NE | |
| propertyId | String? | ANO | — | Property | @IsOptional, @IsString | NE | |
| unitId | String? | ANO | — | Unit | @IsOptional | NE | |
| residentId | String? | ANO | — | Resident | @IsOptional | NE | |
| assetId | String? | ANO | — | Asset | @IsOptional | NE | |
| number | Int | NE | — | — | — | NE | Auto-gen, @@unique(tenantId,number) |
| title | String | NE | — | — | @IsNotEmpty | NE | UI: "Název *" |
| description | String?(Text) | ANO | — | — | @IsOptional | NE | UI: "Popis" |
| category | Enum(TicketCategory) | NE | general | — | @IsOptional, @IsEnum | NE | general/plumbing/electrical/hvac/structural/cleaning/other |
| priority | Enum(TicketPriority) | NE | medium | — | @IsOptional, @IsEnum | NE | low/medium/high/urgent |
| status | Enum(TicketStatus) | NE | open | — | — | NE | open/in_progress/resolved/closed |
| assigneeId | String? | ANO | — | User | @IsOptional | NE | |
| requesterUserId | String? | ANO | — | User | @IsOptional | NE | |
| dispatcherUserId | String? | ANO | — | User | @IsOptional | NE | |
| resolvedAt | DateTime? | ANO | — | — | — | NE | system |
| responseDueAt | DateTime? | ANO | — | — | — | NE | SLA computed |
| resolutionDueAt | DateTime? | ANO | — | — | — | NE | SLA computed |
| deadlineManuallySet | Boolean | NE | false | — | — | NE | |
| firstResponseAt | DateTime? | ANO | — | — | — | NE | system |
| escalationLevel | Int | NE | 0 | — | — | NE | |
| escalatedAt | DateTime? | ANO | — | — | — | NE | |
| recurringPlanId | String? | ANO | — | RecurringActivityPlan | — | NE | |
| generationKey | String? | ANO | — | — | — | NE | @unique, idempotence |
| plannedForDate | DateTime? | ANO | — | — | — | NE | |
| requestOrigin | String? | ANO | — | — | — | NE | manual/recurring_plan/revision |
| deletedAt | DateTime? | ANO | — | — | — | NE | Soft delete |

### HelpdeskItem

| Pole | DB typ | Null | Default | FK → | Poznámka |
|------|--------|------|---------|------|----------|
| id | String | NE | uuid() | — | PK |
| ticketId | String | NE | — | HelpdeskTicket | Cascade |
| description | String | NE | — | — | @IsString |
| unit | String? | ANO | — | — | @IsOptional (ks, m, h) |
| quantity | Decimal(10,3) | NE | 1 | — | @IsOptional |
| unitPrice | Decimal(12,2) | NE | 0 | — | @IsOptional |
| totalPrice | Decimal(12,2) | NE | 0 | — | @IsOptional |

### HelpdeskProtocol

| Pole | DB typ | Null | Default | FK → | PII | Poznámka |
|------|--------|------|---------|------|-----|----------|
| id | String | NE | uuid() | — | NE | PK |
| ticketId | String | NE | — | HelpdeskTicket | NE | @unique |
| number | String | NE | — | — | NE | |
| workerName | String? | ANO | — | — | **ANO** | PII: jméno pracovníka |
| workerDate | DateTime? | ANO | — | — | NE | |
| clientName | String? | ANO | — | — | **ANO** | PII: jméno klienta |
| clientSigned | Boolean | NE | false | — | NE | |
| note | String?(Text) | ANO | — | — | NE | |

### SlaPolicy

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| tenantId | String | NE | — | |
| propertyId | String? | ANO | — | @@unique(tenantId,propertyId) |
| lowResponseH | Int | NE | 72 | Hodiny |
| lowResolutionH | Int | NE | 336 | |
| mediumResponseH | Int | NE | 24 | |
| mediumResolutionH | Int | NE | 120 | |
| highResponseH | Int | NE | 8 | |
| highResolutionH | Int | NE | 48 | |
| urgentResponseH | Int | NE | 1 | |
| urgentResolutionH | Int | NE | 8 | |

### WorkOrder

| Pole | DB typ | Null | Default | FK → | DTO validace | PII | Poznámka |
|------|--------|------|---------|------|-------------|-----|----------|
| id | String | NE | uuid() | — | — | NE | PK |
| tenantId | String | NE | — | Tenant | — | NE | |
| propertyId | String? | ANO | — | Property | @IsOptional | NE | |
| unitId | String? | ANO | — | Unit | @IsOptional | NE | |
| assetId | String? | ANO | — | Asset | @IsOptional | NE | |
| helpdeskTicketId | String? | ANO | — | HelpdeskTicket | @IsOptional | NE | |
| title | String | NE | — | — | @IsNotEmpty | NE | UI: "Název úkolu *" |
| description | String?(Text) | ANO | — | — | @IsOptional | NE | |
| workType | Enum(WorkType) | NE | corrective | — | @IsEnum | NE | corrective/preventive/inspection/emergency |
| priority | Enum(WOPriority) | NE | normalni | — | @IsEnum | NE | nizka/normalni/vysoka/kriticka |
| status | Enum(WOStatus) | NE | nova | — | — | NE | nova/v_reseni/vyresena/uzavrena/zrusena |
| assigneeUserId | String? | ANO | — | User | @IsOptional | NE | UI: "Řešitel" |
| requesterUserId | String? | ANO | — | User | @IsOptional | NE | |
| dispatcherUserId | String? | ANO | — | User | @IsOptional | NE | |
| deadline | DateTime? | ANO | — | — | @IsOptional | NE | UI: "Termín realizace" |
| completedAt | DateTime? | ANO | — | — | — | NE | |
| estimatedHours | Decimal(6,2)? | ANO | — | — | @IsOptional | NE | |
| actualHours | Decimal(6,2)? | ANO | — | — | @IsOptional | NE | |
| laborCost | Decimal(12,2)? | ANO | — | — | @IsOptional | NE | |
| materialCost | Decimal(12,2)? | ANO | — | — | @IsOptional | NE | |
| totalCost | Decimal(12,2)? | ANO | — | — | — | NE | computed |
| note | String?(Text) | ANO | — | — | @IsOptional | NE | |
| workSummary | String?(Text) | ANO | — | — | @IsOptional | NE | |
| findings | String?(Text) | ANO | — | — | — | NE | |
| recommendation | String?(Text) | ANO | — | — | — | NE | |
| supplierId | String? | ANO | — | Party | @IsOptional | NE | |
| supplierNote | String? | ANO | — | — | — | NE | |
| csatScore | Int? | ANO | — | — | — | NE | 1-5 |
| csatComment | String? | ANO | — | — | — | NE | |

### WorkOrderComment

| Pole | DB typ | Null | Default | FK → | Poznámka |
|------|--------|------|---------|------|----------|
| id | String | NE | uuid() | — | PK |
| workOrderId | String | NE | — | WorkOrder | Cascade |
| author | String | NE | — | — | |
| text | String(Text) | NE | — | — | @IsString |

### Protocol

| Pole | DB typ | Null | Default | FK → | PII | Poznámka |
|------|--------|------|---------|------|-----|----------|
| id | String | NE | uuid() | — | NE | PK |
| tenantId | String | NE | — | — | NE | |
| propertyId | String? | ANO | — | Property | NE | |
| sourceType | Enum(ProtocolSourceType) | NE | — | — | NE | helpdesk/revision/work_order |
| sourceId | String | NE | — | — | NE | Polymorphní FK |
| protocolType | Enum(ProtocolType) | NE | work_report | — | NE | work_report/handover/revision_report/service_protocol |
| number | String | NE | — | — | NE | |
| status | Enum(ProtocolStatus) | NE | draft | — | NE | draft/completed/confirmed |
| title | String? | ANO | — | — | NE | |
| supplierSnapshot | Json? | ANO | — | — | NE | PDF immutability snapshot |
| customerSnapshot | Json? | ANO | — | — | NE | |
| requesterName | String? | ANO | — | — | **ANO** | PII |
| dispatcherName | String? | ANO | — | — | **ANO** | PII |
| resolverName | String? | ANO | — | — | **ANO** | PII |
| description | String?(Text) | ANO | — | — | NE | |
| publicNote | String?(Text) | ANO | — | — | NE | |
| internalNote | String?(Text) | ANO | — | — | NE | |
| transportKm | Decimal(8,1)? | ANO | — | — | NE | |
| satisfaction | Enum(Satisfaction)? | ANO | — | — | NE | satisfied/partially_satisfied/dissatisfied/neutral |
| supplierSignatureName | String? | ANO | — | — | **ANO** | PII: podpis |
| customerSignatureName | String? | ANO | — | — | **ANO** | PII: podpis |

### ProtocolLine

| Pole | DB typ | Null | Default | FK → | Poznámka |
|------|--------|------|---------|------|----------|
| id | String | NE | uuid() | — | PK |
| protocolId | String | NE | — | Protocol | Cascade |
| lineType | Enum(ProtocolLineType) | NE | — | — | labor/material/transport/other |
| name | String | NE | — | — | |
| unit | String? | ANO | — | — | |
| quantity | Decimal(10,3)? | ANO | — | — | |
| description | String? | ANO | — | — | |
| sortOrder | Int | NE | 0 | — | |

---

## 6. Assets & Revisions

### Asset

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| tenantId | String | NE | — | Tenant | — | |
| propertyId | String | NE | — | Property | @IsString | |
| unitId | String? | ANO | — | Unit | @IsOptional | |
| assetTypeId | String? | ANO | — | AssetType | @IsOptional | |
| name | String | NE | — | — | @IsNotEmpty | UI: "Název zařízení *" |
| category | Enum(AssetCategory) | NE | — | — | @IsEnum | tzb/stroje/vybaveni/vozidla/it/ostatni |
| manufacturer | String? | ANO | — | — | @IsOptional | UI: "Výrobce" |
| model | String? | ANO | — | — | @IsOptional | UI: "Model" |
| serialNumber | String? | ANO | — | — | @IsOptional | UI: "Sériové číslo" |
| location | String? | ANO | — | — | @IsOptional | UI: "Umístění" |
| status | Enum(AssetStatus) | NE | aktivni | — | — | aktivni/servis/vyrazeno/neaktivni |
| purchaseDate | DateTime? | ANO | — | — | @IsOptional | |
| purchaseValue | Decimal(12,2)? | ANO | — | — | @IsOptional | |
| warrantyUntil | DateTime? | ANO | — | — | @IsOptional | |
| serviceInterval | Int? | ANO | — | — | @IsOptional | Měsíce |
| lastServiceDate | DateTime? | ANO | — | — | — | |
| nextServiceDate | DateTime? | ANO | — | — | — | |
| notes | String?(Text) | ANO | — | — | @IsOptional | |
| deletedAt | DateTime? | ANO | — | — | — | Soft delete |

### AssetType, AssetTypeRevisionType, AssetServiceRecord, AssetQrCode, AssetQrScanEvent, AssetFieldCheckExecution, AssetFieldCheckSignal

Systémové a provozní modely — viz detailní definice v schema.prisma (řádky 2687–2990). Klíčová pole:

- **AssetType**: id, tenantId, name, code, category, description, manufacturer, model, isActive
- **AssetServiceRecord**: id, assetId, tenantId, date, type(preventivni/oprava/revize/kalibrace), description, cost, supplier
- **AssetQrCode**: id, tenantId, assetId, token(@unique), humanCode, status(active/replaced/disabled), labelVersion
- **AssetQrScanEvent**: id, tenantId, assetId, userId, outcome, source, latitude?, longitude?, **PII: ipAddress, userAgent**
- **AssetFieldCheckExecution**: id, tenantId, assetId, userId, checkType, status, result, confidenceLevel
- **AssetFieldCheckSignal**: id, fieldCheckExecutionId, signalType, isValid, payloadJson

### RevisionSubject, RevisionType, RevisionPlan, RevisionEvent

Revizní modely — viz schema řádky 1829–1969. Klíčová pole:

- **RevisionSubject**: id, tenantId, propertyId, assetId?, name, category, description, location, serialNumber, isActive
- **RevisionType**: id, tenantId, code(@unique per tenant), name, defaultIntervalDays, defaultReminderDaysBefore, color, requiresProtocol
- **RevisionPlan**: id, tenantId, propertyId, revisionSubjectId, revisionTypeId, assetId?, title, intervalDays, reminderDaysBefore, nextDueAt, status(active/paused/archived), isMandatory
- **RevisionEvent**: id, tenantId, propertyId, revisionPlanId, scheduledAt, performedAt, validUntil, resultStatus(passed/passed_with_notes/failed/cancelled/planned), summary, vendorName, performedBy

### RecurringActivityPlan

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | cuid() | PK |
| tenantId | String | NE | — | |
| propertyId | String | NE | — | FK Property |
| assetId | String? | ANO | — | FK Asset |
| title | String | NE | — | |
| description | String? | ANO | — | |
| category | Enum | NE | — | maintenance/inspection/reading/revision |
| scheduleMode | Enum | NE | — | calendar/from_completion |
| frequencyUnit | Enum | NE | — | day/week/month/year |
| frequencyInterval | Int | NE | — | |
| priority | Enum | NE | medium | low/medium/high/urgent |
| assigneeUserId | String? | ANO | — | |
| isActive | Boolean | NE | true | |
| lastCompletedAt | DateTime? | ANO | — | |
| nextPlannedAt | DateTime? | ANO | — | |

---

## 7. Property Extended — Units, Rooms, Equipment, Ownership

### Unit (detailní rozšíření existujícího)

Viz schema řádky 550–609. 30+ polí včetně: name, floor, area, knDesignation, ownDesignation, spaceType(RESIDENTIAL/NON_RESIDENTIAL/GARAGE/PARKING/CELLAR/LAND), commonAreaShare, heatingArea, tuvArea, heatingCoefficient, hotWaterCoefficient, personCount, disposition, hasElevator, heatingMethod, validFrom, validTo, extAllocatorRef, cadastralData, isGarageUnit, garageVotingRule.

### UnitRoom

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| unitId | String | NE | — | FK Unit |
| tenantId | String | NE | — | |
| name | String | NE | — | UI: "Název místnosti" |
| area | Decimal(8,2) | NE | — | UI: "Plocha (m²)" |
| coefficient | Decimal(5,3) | NE | 1.0 | UI: "Koeficient" |
| calculatedArea | Decimal(8,2)? | ANO | — | computed = area × coefficient |
| roomType | Enum(standard/accessory) | NE | standard | |
| includeTuv | Boolean | NE | true | |

### UnitQuantity

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| unitId | String | NE | — | FK Unit |
| tenantId | String | NE | — | |
| name | String | NE | — | UI: "Název" (Počet osob, etc.) |
| value | Decimal(12,4) | NE | — | UI: "Hodnota" |
| unitLabel | String? | ANO | — | UI: "Jednotka" (os., ks, m²) |

### UnitEquipment

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| unitId | String | NE | — | FK Unit |
| tenantId | String | NE | — | |
| name | String | NE | — | UI: "Název" |
| status | String? | ANO | — | |
| note | String? | ANO | — | |
| quantity | Int | NE | 1 | |
| serialNumber | String? | ANO | — | |
| purchaseDate | DateTime? | ANO | — | |
| purchasePrice | Decimal(12,2)? | ANO | — | |
| warranty | String? | ANO | — | |
| lifetime | Int? | ANO | — | Roky |
| useInPrescription | Boolean | NE | false | |
| validFrom | DateTime? | ANO | — | |
| validTo | DateTime? | ANO | — | |

### UnitManagementFee

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| unitId | String | NE | — | FK Unit |
| tenantId | String | NE | — | |
| amount | Decimal(12,2) | NE | — | UI: "Částka" |
| calculationType | String | NE | flat | flat |
| validFrom | DateTime | NE | — | |
| validTo | DateTime? | ANO | — | |

### Occupancy, PropertyOwnership, UnitOwnership, Tenancy

- **Occupancy**: id, tenantId, unitId, residentId, role(owner/tenant/member), startDate, endDate, isActive, ownershipShare, personCount, isPrimaryPayer, variableSymbol, sipoNumber, note
- **PropertyOwnership**: id, tenantId, propertyId, partyId, role, shareNumerator, shareDenominator, sharePercent, validFrom, validTo, isActive
- **UnitOwnership**: id, tenantId, unitId, partyId, role, shareNumerator, shareDenominator, sharePercent, validFrom, validTo, isActive, variableSymbol
- **Tenancy**: id, tenantId, unitId, partyId, type(lease/sublease/occupancy/short_term), role, contractNo, validFrom, validTo, moveInDate, moveOutDate, rentAmount, serviceAdvanceAmount, depositAmount, isActive, variableSymbol

---

## 8. Governance — Assembly, Voting

### Assembly

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | cuid() | PK |
| tenantId | String | NE | — | |
| propertyId | String | NE | — | FK Property |
| title | String | NE | — | |
| description | String? | ANO | — | |
| assemblyNumber | Int | NE | — | |
| scheduledAt | DateTime | NE | — | |
| location | String | NE | — | |
| status | Enum(AssemblyStatus) | NE | DRAFT | DRAFT/PUBLISHED/IN_PROGRESS/COMPLETED/CANCELLED |
| totalShares | Decimal(12,6)? | ANO | — | |
| presentShares | Decimal(12,6)? | ANO | — | |
| isQuorate | Boolean? | ANO | — | |

### AssemblyAgendaItem

Pole: id, assemblyId, orderNumber, title, description?, requiresVote(true), majorityType(NADPOLOVICNI_PRITOMNYCH/NADPOLOVICNI_VSECH/KVALIFIKOVANA/JEDNOMYSLNA), result?(SCHVALENO/NESCHVALENO/NEUSNASENO), votesFor/Against/Abstain(Decimal 12,6), isCounterProposal, parentItemId?, garageInternalVotes(Json)

### AssemblyAttendee

Pole: id, assemblyId, principalId?, partyId?, **name(PII)**, unitIds[], totalShare(Decimal 12,6), isPresent, hasPowerOfAttorney, powerOfAttorneyFrom?, keypadId?

### AssemblyVote

Pole: id, agendaItemId, attendeeId, choice(ANO/NE/ZDRZET), shareWeight(Decimal 12,6), keypadId?, receivedAt?. @@unique(agendaItemId, attendeeId)

### PerRollamVoting, PerRollamItem, PerRollamBallot, PerRollamResponse

- **PerRollamVoting**: id, tenantId, propertyId, title, votingNumber, deadline, status(DRAFT/PUBLISHED/CLOSED/COMPLETED/CANCELLED), totalShares, respondedShares, isQuorate, documentIds[]
- **PerRollamItem**: id, votingId, orderNumber, title, majorityType, result?, votesFor/Against/Abstain
- **PerRollamBallot**: id, votingId, principalId?, partyId?, **name(PII)**, unitIds[], totalShare, status(PENDING/SUBMITTED/MANUAL_ENTRY), accessToken?(@unique), tokenExpiresAt?
- **PerRollamResponse**: id, itemId, ballotId, choice(ANO/NE/ZDRZET), shareWeight. @@unique(itemId, ballotId)

### HardwareVotingSession, AttendeeKeypadAssignment

Systémové modely pro hardware voting keypads — viz schema řádky 3982–4034.

---

## 9. Communication & Documents

### Notification

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| tenantId | String | NE | — | |
| userId | String | NE | — | FK User |
| type | String | NE | — | reminder_due/new_debtor/ticket_new/etc. |
| title | String | NE | — | |
| body | String? | ANO | — | |
| entityId | String? | ANO | — | |
| entityType | String? | ANO | — | |
| url | String? | ANO | — | |
| isRead | Boolean | NE | false | |
| readAt | DateTime? | ANO | — | |

### OutboxLog

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | cuid() | PK |
| tenantId | String | NE | — | |
| channel | String(20) | NE | — | email/sms/letter/isds/whatsapp |
| recipient | String | NE | — | **PII**: email/phone/address |
| subject | String? | ANO | — | |
| status | String(20) | NE | — | sent/failed/pending |
| externalId | String? | ANO | — | |
| error | String?(Text) | ANO | — | |
| cost | Decimal(8,2)? | ANO | — | |
| metadata | Json? | ANO | — | |

### Document

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| tenantId | String | NE | — | |
| name | String | NE | — | |
| originalName | String | NE | — | |
| mimeType | String | NE | — | |
| size | Int | NE | — | Bytes |
| storageKey | String | NE | — | |
| storageType | String | NE | local | local/s3 |
| category | Enum | NE | other | contract/invoice/protocol/photo/plan/regulation/other |
| description | String? | ANO | — | |
| isPublic | Boolean | NE | false | |
| scanStatus | Enum | NE | pending_scan | pending_scan/quarantined/clean/infected/scan_error/skipped |
| createdById | String? | ANO | — | FK User |

### DocumentTag, DocumentLink

- **DocumentTag**: id, documentId, tag, createdAt
- **DocumentLink**: id, documentId, entityType(property/unit/resident/ticket/...), entityId, createdAt

### ChatMessage, ChatAttachment, ChatMention

- **ChatMessage**: id, tenantId, entityType, entityId, type(USER_MESSAGE/SYSTEM_LOG/EMAIL_INBOUND/EMAIL_OUTBOUND), body(Text), htmlBody?(Text), authorId?, emailFrom?, emailTo?, emailSubject?, emailMsgId?
- **ChatAttachment**: id, messageId, fileName, mimeType, storageKey, sizeBytes?
- **ChatMention**: id, messageId, userId

---

## 10. Metering

### Meter

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| tenantId | String | NE | — | Tenant | — | |
| propertyId | String | NE | — | Property | @IsString | |
| unitId | String? | ANO | — | Unit | @IsOptional | |
| name | String | NE | — | — | @IsNotEmpty | UI: "Název měřidla *" |
| serialNumber | String? | ANO | — | — | @IsOptional | UI: "Výrobní číslo" |
| meterType | Enum(MeterType) | NE | — | — | @IsEnum | elektrina/voda_studena/voda_tepla/plyn/teplo |
| unit | String? | ANO | — | — | @IsOptional | kWh/m³/GJ |
| installDate | DateTime? | ANO | — | — | @IsOptional | |
| calibrationDate | DateTime? | ANO | — | — | @IsOptional | |
| calibrationDue | DateTime? | ANO | — | — | @IsOptional | |
| manufacturer | String? | ANO | — | — | @IsOptional | |
| location | String? | ANO | — | — | @IsOptional | |
| isActive | Boolean | NE | true | — | — | |
| lastReading | Decimal(12,3)? | ANO | — | — | — | computed |
| lastReadingDate | DateTime? | ANO | — | — | — | computed |
| note | String?(Text) | ANO | — | — | @IsOptional | |

### MeterReading

| Pole | DB typ | Null | Default | FK → | DTO validace | Poznámka |
|------|--------|------|---------|------|-------------|----------|
| id | String | NE | uuid() | — | — | PK |
| meterId | String | NE | — | Meter | — | |
| readingDate | DateTime | NE | — | — | @IsDateString | |
| value | Decimal(12,3) | NE | — | — | @IsNumber | |
| consumption | Decimal(12,3)? | ANO | — | — | — | computed: current - previous |
| source | String | NE | manual | — | — | manual |
| isInitial | Boolean | NE | false | — | — | |
| readBy | String? | ANO | — | — | — | |
| note | String? | ANO | — | — | @IsOptional | |

---

## 11. Integration & External

### EmailInboundConfig

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | cuid() | PK |
| tenantId | String | NE | — | @unique |
| slug | String | NE | — | @unique — "svj789" → invoice@svj789.ifmio.com |
| isActive | Boolean | NE | true | |
| autoApprove | Boolean | NE | false | |
| allowedFrom | String[] | NE | [] | Empty = accept all |

### EmailInboundLog

Pole: id, tenantId, messageId?, fromEmail(**PII**), fromName?(**PII**), subject?, attachments(Int), status, errorMessage?, invoicesCreated(Int)

### PvkCredential

Pole: id, tenantId, email(**PII**), passwordEncrypted(AES-256-GCM), lastSyncAt?, lastSyncStatus?

### PvkSyncLog

Pole: id, tenantId, syncedAt, invoices(Int), payments(Int), status, error?, durationMs?

### PvkWaterDeduction

Pole: id, tenantId, pvkPlaceId(Int), placeAddress, dateFrom, dateTo, meterNumber, valueFrom, valueTo, amountM3, avgPerDay, measurementType, intervalDays

---

## 12. AI / Analytics

### MioFinding

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | cuid() | PK |
| tenantId | String | NE | — | |
| propertyId | String? | ANO | — | |
| kind | Enum | NE | — | finding/recommendation |
| code | String | NE | — | |
| title | String | NE | — | |
| description | String(Text) | NE | — | |
| category | Enum | NE | — | efficiency/security/adoption/integration/data_quality |
| severity | Enum | NE | — | info/warning/critical |
| confidence | Enum | NE | — | low/medium/high |
| status | Enum | NE | active | active/resolved/dismissed/snoozed |
| entityType | String? | ANO | — | |
| entityId | String? | ANO | — | |
| fingerprint | String | NE | — | Dedup key |

### MioConversation, MioMessage

- **MioConversation**: id, tenantId, userId, title?, context?, starred(false)
- **MioMessage**: id, conversationId, role(user/assistant/system), content(Text), toolCalls(Json)?, toolResults(Json)?, tokens(Int)?

### MioWebhookSubscription, MioWebhookDeliveryLog, MioWebhookOutbox, MioDigestLog, MioJobRunLog

Systémové modely pro AI pipeline — viz schema řádky 2107–2268.

---

## 13. System & Config

### TenantSettings

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| tenantId | String | NE | — | @unique, FK Tenant |
| orgName | String? | ANO | — | |
| logoBase64 | String?(Text) | ANO | — | |
| timezone | String | NE | "Europe/Prague" | |
| language | String | NE | "cs" | |
| emailFrom | String? | ANO | — | |
| invoicePrefix | String? | ANO | — | |
| mioConfig | Json? | ANO | — | AI config |
| onboardingDismissed | Boolean | NE | false | |

### TenantInvitation

Pole: id, tenantId, email(**PII**), name(**PII**), role, token(@unique), expiresAt, acceptedAt?, propertyId?, unitId?

### RefreshToken

Pole: id, userId, token, expiresAt, **ipAddress(PII)**, **userAgent(PII)**, deviceName?, lastUsedAt?, createdAt

### EmailVerificationToken

Pole: id, userId, token(@unique), expiresAt, createdAt

### RevokedToken

Pole: id, jti(@unique), expiresAt, createdAt

### ApiKey

Pole: id, tenantId, userId, name, keyHash(@unique), keyPrefix, scopes[], expiresAt?, lastUsedAt?, **lastUsedIp(PII)**, isActive

### LoginRiskLog

Pole: id, userId, tenantId?, **ipAddress(PII)**, **userAgent(PII)**, country?, city?, lat?, lon?, riskScore(0-100), riskFactors(Json)?, action(allow/challenge/block), loginSuccess

### AuditLog

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| tenantId | String? | ANO | — | Nullable for system events |
| userId | String? | ANO | — | |
| action | String | NE | — | create/update/delete/LOGIN/LOGOUT/etc. |
| entity | String? | ANO | — | property/invoice/user/etc. |
| entityId | String? | ANO | — | |
| oldData | Json? | ANO | — | Sanitized snapshot |
| newData | Json? | ANO | — | Sanitized snapshot |
| **ipAddress** | String? | ANO | — | **PII** |
| **userAgent** | String? | ANO | — | **PII** (device fingerprint) |
| createdAt | DateTime | NE | now() | |

### ImportLog

Pole: id, tenantId, bankAccountId?, format(csv/abo/mt940/residents), fileName, totalRows, importedRows, skippedRows, errorRows, status(pending/processing/done/failed)

### CalendarEvent

Pole: id, tenantId, propertyId?, title, eventType(schuze/revize/udrzba/predani/prohlidka/ostatni), date, dateTo?, timeFrom?, timeTo?, location?, description?, attendees[]

### KanbanTask

Pole: id, tenantId, propertyId?, title, description?, priority(low/medium/high/urgent), status(backlog/todo/in_progress/review/done), assigneeId?, dueDate?, tags[], sortOrder, createdById

### UserFeature

Pole: id, userId, feature, enabled(true), config(Json)?. @@unique(userId, feature)

### UserPropertyAssignment

Pole: id, userId, propertyId, assignedBy?, assignedAt. @@unique(userId, propertyId)

### ScheduledReportSubscription

Pole: id, tenantId, userId, reportType(daily_digest/mio_digest/operations/assets/protocols), frequency(daily/weekly/monthly), format(xlsx/csv/email_only), propertyId?, isEnabled, lastSentAt?, metadata(Json)?

### Activity, ActivityType

- **ActivityType**: id, tenantId, name, kind(EMAIL/CALL/MEETING/TASK/DOCUMENT_UPLOAD/SIGN_REQUEST/REMINDER), defaultDays?, icon?, color?
- **Activity**: id, tenantId, entityType, entityId, activityTypeId, title, note?, deadline, assignedToId, status(PLANNED/DONE/CANCELLED/OVERDUE), doneAt?, doneById?

### LeaseAgreement

| Pole | DB typ | Null | Default | Poznámka |
|------|--------|------|---------|----------|
| id | String | NE | uuid() | PK |
| tenantId | String | NE | — | |
| propertyId | String | NE | — | FK Property |
| unitId | String? | ANO | — | FK Unit |
| residentId | String? | ANO | — | FK Resident |
| contractNumber | String? | ANO | — | |
| contractType | Enum | NE | — | najem/podnajem/sluzebni/jiny |
| status | Enum | NE | aktivni | aktivni/ukoncena/pozastavena/pripravovana |
| monthlyRent | Decimal(12,2)? | ANO | — | UI: "Měsíční nájem (Kč)" |
| deposit | Decimal(12,2)? | ANO | — | |
| depositPaid | Decimal(12,2)? | ANO | — | |
| startDate | DateTime | NE | — | UI: "Platnost od *" |
| endDate | DateTime? | ANO | — | |
| indefinite | Boolean | NE | false | UI: "Na dobu neurčitou" |
| noticePeriod | Int? | ANO | — | Měsíce |
| renewalType | Enum? | ANO | — | pisemna/automaticka/nevztahuje |
| terminatedAt | DateTime? | ANO | — | |
| terminationNote | String? | ANO | — | |
| note | String?(Text) | ANO | — | |

### Party

| Pole | DB typ | Null | Default | PII | Poznámka |
|------|--------|------|---------|-----|----------|
| id | String | NE | cuid() | NE | PK |
| tenantId | String | NE | — | NE | |
| type | Enum | NE | — | NE | person/company/hoa/organization_unit |
| displayName | String | NE | — | **ANO** | |
| firstName | String? | ANO | — | **ANO** | |
| lastName | String? | ANO | — | **ANO** | |
| companyName | String? | ANO | — | NE | |
| ic | String? | ANO | — | **ANO** | IČ fyzické osoby = PII |
| dic | String? | ANO | — | NE | |
| email | String? | ANO | — | **ANO** | |
| phone | String? | ANO | — | **ANO** | |
| street | String? | ANO | — | **ANO** | |
| city | String? | ANO | — | **ANO** | |
| postalCode | String? | ANO | — | NE | |
| dataBoxId | String? | ANO | — | NE | |
| bankAccount | String? | ANO | — | **ANO** | PII: číslo účtu |
| iban | String? | ANO | — | **ANO** | PII |
| gdprErased | Boolean | NE | false | NE | GDPR flag |
| gdprErasedAt | DateTime? | ANO | — | NE | |

### Principal, PrincipalOwner, ManagementContract, ManagementContractUnit, FinancialContext

Business relationship layer — viz schema řádky 3216–3385. Klíčová pole:
- **Principal**: id, tenantId, partyId, type(hoa/individual_owner/corporate_owner/tenant_client/mixed_client), code, displayName, isActive
- **ManagementContract**: id, tenantId, principalId, propertyId, type(hoa_management/rental_management/...), scope(whole_property/selected_units), contractNo?, isActive
- **FinancialContext**: id, tenantId, principalId?, propertyId?, scopeType(property/principal/manager), code, displayName, currency("CZK"), vatEnabled, vatPayer, invoicePrefix?, accountingSystem?, brandingName/Email/Phone/Website

### FloorPlan, FloorPlanZone

- **FloorPlan**: id, tenantId, propertyId, floor, label?, imageUrl, imageWidth, imageHeight, scaleMetersPerPixel?, sortOrder
- **FloorPlanZone**: id, floorPlanId, unitId?, label?, zoneType(UNIT/COMMON_AREA/TECHNICAL/STORAGE/PARKING/OTHER), polygon(Json), color?

### PortalAccess

Pole: id, tenantId, residentId, **email(PII)**, accessToken, pin, isActive, lastAccessAt?, expiresAt?

### PortalMessage

Pole: id, tenantId, residentId, propertyId, subject, body, direction(inbound/outbound), isRead

### UnitGroup, UnitGroupMembership

- **UnitGroup**: id, tenantId, propertyId, name, type(entrance/floor/custom), sortOrder
- **UnitGroupMembership**: id, unitGroupId, unitId. @@unique(unitGroupId, unitId)

---

## Souhrnná statistika

| Metrika | Hodnota |
|---------|---------|
| **Celkem modelů v schema** | 129 |
| **Celkem modelů v katalogu** | 129 (kompletní) |
| **Enumů v schema** | 100 |
| **Celkem polí (odhad)** | ~1,500+ |
| **PII polí identifikovaných** | 45+ |
| **Polí bez DTO (API only / system)** | ~60% (systémové modely) |
| **Polí s nesrovnalostí** | 8 (viz níže) |

---

## PII registr (GDPR)

| Model | Pole | Typ PII | Šifrováno | Audit log | Právo na výmaz |
|-------|------|---------|-----------|-----------|----------------|
| User | email | Kontaktní | NE | ANO | ANO (gdprErased) |
| User | name | Jméno | NE | ANO | ANO |
| User | phone | Kontaktní | NE | ANO | ANO |
| User | avatarBase64 | Fotografie | NE | NE | ANO |
| Resident | firstName, lastName | Jméno | NE | ANO | ANO (gdprErased) |
| Resident | email, phone | Kontaktní | NE | ANO | ANO |
| Resident | correspondenceAddress | Adresa | NE | NE | ANO |
| Resident | birthDate | Datum narození | NE | NE | ANO |
| Property | contactName/Email/Phone | Kontaktní | NE | ANO | ⚠️ Neumažou se v GDPR erase |
| Party | firstName, lastName | Jméno | NE | ANO | ANO (gdprErased) |
| Party | email, phone | Kontaktní | NE | ANO | ANO |
| Party | street, city | Adresa | NE | NE | ANO |
| Party | ic (fyzická osoba) | ID číslo | NE | NE | ANO |
| Party | bankAccount, iban | Finanční | NE | NE | ANO |
| BankTransaction | counterparty* | Jméno+účet | NE | NE | ⚠️ Bez GDPR erase |
| PaymentOrderItem | counterpartyName/Account | Jméno+účet | NE | NE | ⚠️ Bez GDPR erase |
| HelpdeskProtocol | workerName, clientName | Jméno | NE | ANO | ⚠️ |
| Protocol | requesterName, resolverName, signatureNames | Jméno+podpis | NE | ANO | ⚠️ |
| RefreshToken | ipAddress, userAgent | Device | NE | NE | ANO (cascade) |
| LoginRiskLog | ipAddress, userAgent | Device | NE | NE | Retention 90d |
| AuditLog | ipAddress, userAgent | Device | NE | — | Retention (GDPR_ERASURE preserved) |
| OutboxLog | recipient | Kontaktní | NE | NE | ⚠️ |
| EmailInboundLog | fromEmail, fromName | Kontaktní | NE | NE | ⚠️ |
| PvkCredential | email, passwordEncrypted | Kontaktní+auth | **ANO** (AES) | NE | ⚠️ |
| PortalAccess | email | Kontaktní | NE | NE | ⚠️ |
| AssemblyAttendee | name | Jméno | NE | NE | ⚠️ |
| PerRollamBallot | name | Jméno | NE | NE | ⚠️ |
| TenantInvitation | email, name | Kontaktní | NE | NE | ⚠️ |
| AssetQrScanEvent | ipAddress, userAgent | Device | NE | NE | ⚠️ |

**⚠️ = PII pole bez explicitního GDPR erasure handleru** — potenciální GDPR gap.

---

## Nesrovnalosti

### CRITICAL

| # | Model | Pole | Problém | Dopad |
|---|-------|------|---------|-------|
| 1 | BankTransaction | counterparty, counterpartyIban | PII bez GDPR erase handleru | GDPR čl. 17 riziko |
| 2 | Property | contactName/Email/Phone | PII pole bez zahrnutí v GDPR erase | GDPR gap |
| 3 | Protocol | requesterName, signatureNames | PII v immutable snapshot — nemažou se | GDPR vs. archivní požadavek |

### HIGH

| # | Model | Pole | Problém |
|---|-------|------|---------|
| 4 | BankAccount | apiToken | Citlivý token — DTO nemá explicitní validaci |
| 5 | Invoice | amountTotal | DB je NOT NULL ale DTO má @IsOptional @Min(0) — možný 400 při null |

### MEDIUM

| # | Model | Pole | Problém |
|---|-------|------|---------|
| 6 | InvoiceComment | body vs DTO body | V DTO je `body`, v některých testech se posílá jako `text` — naming confusion |
| 7 | Resident | birthDate | V DB ale ne ve všech frontend formulářích |
| 8 | Invoice | isdocXml, pdfBase64 | Excluded ze SanitizePipe whitelist exception |

---

## Self-review

| Metrika | Hodnota |
|---------|---------|
| Modelů v schema.prisma | 129 |
| Modelů v katalogu (detailní tabulky + kompaktní) | 129 |
| Enumů v schema.prisma | 100 |
| Kompletnost modelů | **100%** |
| PII polí identifikovaných | 45+ |
| GDPR gaps nalezených | 3 CRITICAL, 0 HIGH |
| Chybějící modely | žádné |

---

*Kompletní FIELD_CATALOG.md — všech 129 modelů pokryto. Aktualizováno: 2026-03-31.*

# ifmio — Access Matrix (P5.1a)

> Verze: 1.1 | Datum: 2026-03-12
> Stav: **REVIEWED** — schváleno s úpravami (viz 4.1)

---

## 1. Role

### 1.1 Aktuální stav (v kódu)

| Role         | Úroveň | Popis                              |
| ------------ | ------- | ---------------------------------- |
| `owner`      | 50      | Vlastník tenant účtu               |
| `admin`      | 40      | Administrátor tenant účtu          |
| `manager`    | 30      | Správce nemovitostí                |
| `technician` | 20      | Technik / provozní pracovník       |
| `viewer`     | 10      | Pouze čtení                        |

Skupiny v kódu:
- `ROLES_WRITE` = owner, admin, manager
- `ROLES_MANAGE` = owner, admin

### 1.2 Cílový stav (P5.1)

| Role               | Úroveň | Mapování z aktuální | Popis                                                        |
| ------------------ | ------- | -------------------- | ------------------------------------------------------------ |
| `tenant_owner`     | 50      | owner                | Plná kontrola. Billing, mazání tenantu, přenesení vlastnictví. |
| `tenant_admin`     | 40      | admin                | Správa uživatelů, nastavení tenantu, reporty. Nemůže mazat tenant. |
| `property_manager` | 30      | manager              | Správa přiřazených nemovitostí, jednotek, rezidentů, smluv, financí. Nemůže vytvářet nové nemovitosti. |
| `finance_manager`  | 35      | *(nová role)*        | Finance, bankovní účty, předpisy, upomínky, reporty. Bez správy nemovitostí/rezidentů. |
| `operations`       | 20      | technician           | Helpdesk, work ordery, měřiče, kalendář. Omezený přístup k financím. |
| `viewer`           | 10      | viewer               | Pouze čtení všech dat v rámci scope.                         |

> **Poznámka k `finance_manager`**: Úroveň 35 je mezi admin (40) a property_manager (30), protože má širší přístup k financím, ale nespravuje nemovitosti.

---

## 2. Scope (úrovně oprávnění)

### 2.1 Aktuální stav

- **Tenant-level only** — všechny entity mají `tenantId`, všechny dotazy filtrují po `tenantId` z JWT.
- Žádné property-level ACL neexistuje.

### 2.2 Cílový stav

| Scope      | Popis                                                           | Implementace                                |
| ---------- | --------------------------------------------------------------- | ------------------------------------------- |
| **Tenant** | Přístup ke všem datům v rámci tenantu.                          | Aktuální stav — `tenantId` z JWT.           |
| **Property** | Přístup pouze k přiřazeným nemovitostem (a jejich sub-entitám). | Nová tabulka `UserPropertyAssignment(userId, propertyId)`. |
| **Own**    | Přístup pouze k vlastním záznamům (vytvořil/je přiřazen).      | Filtr `createdById = userId` nebo `assigneeId = userId`. |

### 2.3 Scope per role

| Role               | Default scope | Může mít property-level scope? |
| ------------------ | ------------- | ------------------------------ |
| `tenant_owner`     | Tenant        | Ne (vždy vše)                  |
| `tenant_admin`     | Tenant        | Ne (vždy vše)                  |
| `property_manager` | Property      | Ano — přiřazené nemovitosti    |
| `finance_manager`  | Tenant        | Volitelně — přiřazené nemovitosti |
| `operations`       | Property      | Ano — přiřazené nemovitosti    |
| `viewer`           | Property      | Ano — přiřazené nemovitosti    |

> **Design rule**: `tenant_owner` a `tenant_admin` mají **vždy tenant scope** — vidí a spravují vše v rámci tenantu. Role `property_manager`, `operations`, `viewer` a volitelně `finance_manager` mohou být **property-scoped** — přístup omezen na přiřazené nemovitosti přes `UserPropertyAssignment`. Scope filtr se aplikuje na listing, detail, create i export.

---

## 3. Permission Matrix

Legenda:
- **C** = Create, **R** = Read (list + detail), **U** = Update, **D** = Delete/Archive
- **A** = Approve (specifické akce: schválení faktury, uzavření ticketu apod.)
- **E** = Export (CSV, PDF)
- `*` = v rámci přiřazených nemovitostí (property scope)
- `—` = žádný přístup

### 3.1 Properties (Nemovitosti + Jednotky)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Property — list           | R            | R            | R*               | R*              | R*         | R*     |
| Property — detail         | R            | R            | R*               | R*              | R*         | R*     |
| Property — create         | C            | C            | —                | —               | —          | —      |
| Property — update         | U            | U            | U*               | —               | —          | —      |
| Property — delete         | D            | D            | —                | —               | —          | —      |
| Unit — list               | R            | R            | R*               | R*              | R*         | R*     |
| Unit — create             | C            | C            | C*               | —               | —          | —      |
| Unit — update             | U            | U            | U*               | —               | —          | —      |
| Unit — delete             | D            | D            | —                | —               | —          | —      |
| Unit — assign resident    | U            | U            | U*               | —               | —          | —      |

**Aktuální stav v kódu**: create/update = ROLES_WRITE, delete = ROLES_MANAGE. Žádný property-scope filtr.
**Změna oproti draftu**: property_manager nemůže vytvářet nové nemovitosti (bod 4.1 #2). Vytvoření = tenant_admin+.

### 3.2 Residents (Rezidenti)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Resident — list           | R            | R            | R*               | R*              | R*         | R*     |
| Resident — detail         | R            | R            | R*               | R*              | R*         | R*     |
| Resident — create         | C            | C            | C*               | —               | —          | —      |
| Resident — update         | U            | U            | U*               | —               | —          | —      |
| Resident — delete         | D            | D            | —                | —               | —          | —      |
| Resident — import (CSV)   | C            | C            | C*               | —               | —          | —      |
| Resident — toggle debt    | U            | U            | U*               | U*              | —          | —      |
| Resident — export         | E            | E            | E*               | E*              | —          | —      |

**Aktuální stav v kódu**: create/update/import = ROLES_WRITE, delete/toggleDebt/bulkDelete = ROLES_MANAGE.

### 3.3 Finance (Faktury, Bankovní účty, Předpisy, Upomínky)

| Akce                          | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ----------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Invoice — list                | R            | R            | R*               | R               | —          | R*     |
| Invoice — detail              | R            | R            | R*               | R               | —          | R*     |
| Invoice — create (draft)      | C            | C            | C*               | C               | —          | —      |
| Invoice — update (draft)      | U            | U            | U*               | U               | —          | —      |
| Invoice — delete              | D            | D            | —                | —               | —          | —      |
| Invoice — mark paid           | A            | A            | —                | A               | —          | —      |
| Invoice — ISDOC import        | C            | C            | C*               | C               | —          | —      |
| Invoice — export              | E            | E            | E*               | E               | —          | —      |
| Bank account — list           | R            | R            | R*               | R               | —          | R*     |
| Bank account — create         | C            | C            | —                | C               | —          | —      |
| Bank account — update         | U            | U            | —                | U               | —          | —      |
| Bank account — delete         | D            | D            | —                | —               | —          | —      |
| Bank account — import stmt    | C            | C            | —                | C               | —          | —      |
| Prescription — calculate      | —            | C            | C*               | C               | —          | —      |
| Prescription — approve        | A            | A            | —                | A               | —          | —      |
| Reminder — config             | U            | U            | —                | U               | —          | —      |
| Reminder — send               | A            | A            | —                | A               | —          | —      |
| Reminder — list               | R            | R            | R*               | R               | —          | R*     |
| Reminder — create/update      | C/U          | C/U          | R*               | C/U             | —          | —      |
| Address book (supplier/buyer) | CRUD         | CRUD         | R*               | CRUD            | —          | R*     |

**Aktuální stav v kódu**: všechny write operace = ROLES_WRITE, reminder config = ROLES_MANAGE. Žádné rozlišení finance_manager.

> **Varianta B (schválená)**: property_manager má finance **read + create/update draft**, ale **bez mark paid, bez bank account write, bez prescription approve, bez reminder config/send**. Tím se čistě odděluje provozní příprava podkladů (property_manager) od finanční exekuce (finance_manager). Address book a reminders pro property_manager omezeny na read.

### 3.4 Helpdesk (Tickety)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Ticket — list             | R            | R            | R*               | —               | R*         | R*     |
| Ticket — detail           | R            | R            | R*               | —               | R*         | R*     |
| Ticket — create           | C            | C            | C*               | —               | C*         | —      |
| Ticket — update           | U            | U            | U*               | —               | U*         | —      |
| Ticket — assign           | U            | U            | U*               | —               | —          | —      |
| Ticket — close/resolve    | A            | A            | A*               | —               | A* (own)   | —      |
| Ticket — delete           | D            | D            | —                | —               | —          | —      |

**Aktuální stav v kódu**: všechny operace = ROLES_WRITE (technician = level 20, mimo ROLES_WRITE).

> **Edge case**: operations by měl moci zavírat tickety, které mu jsou přiřazeny (own scope).

### 3.5 Work Orders (Pracovní příkazy)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Work order — list         | R            | R            | R*               | —               | R*         | R*     |
| Work order — detail       | R            | R            | R*               | —               | R*         | R*     |
| Work order — create       | C            | C            | C*               | —               | C*         | —      |
| Work order — update       | U            | U            | U*               | —               | U* (own)   | —      |
| Work order — complete     | A            | A            | A*               | —               | A* (own)   | —      |
| Work order — delete       | D            | D            | —                | —               | —          | —      |

**Aktuální stav v kódu**: všechny operace = ROLES_WRITE.

### 3.6 Meters (Měřiče + Odečty)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Meter — list              | R            | R            | R*               | R*              | R*         | R*     |
| Meter — create            | C            | C            | C*               | —               | C*         | —      |
| Meter — update            | U            | U            | U*               | —               | U*         | —      |
| Meter — delete            | D            | D            | —                | —               | —          | —      |
| Reading — create          | C            | C            | C*               | —               | C*         | —      |
| Reading — import          | C            | C            | C*               | —               | C*         | —      |

**Aktuální stav v kódu**: všechny operace = ROLES_WRITE.

### 3.7 Documents (Dokumenty)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Document — list           | R            | R            | R*               | R*              | R*         | R*     |
| Document — upload         | C            | C            | C*               | C*              | C*         | —      |
| Document — update meta    | U            | U            | U*               | —               | —          | —      |
| Document — download       | R            | R            | R*               | R*              | R*         | R*     |
| Document — delete         | D            | D            | —                | —               | —          | —      |
| Folder — manage           | C/U/D        | C/U/D        | —                | —               | —          | —      |

**Aktuální stav v kódu**: upload/update = ROLES_WRITE, folder manage = ROLES_MANAGE.

### 3.8 Calendar (Kalendář)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Event — list              | R            | R            | R*               | R*              | R*         | R*     |
| Event — create            | C            | C            | C*               | —               | C*         | —      |
| Event — update            | U            | U            | U*               | —               | U*         | —      |
| Event — delete            | D            | D            | —                | —               | —          | —      |

**Aktuální stav v kódu**: všechny write operace = ROLES_WRITE.

### 3.9 Contracts (Smlouvy)

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Contract — list           | R            | R            | R*               | R*              | —          | R*     |
| Contract — create         | C            | C            | C*               | —               | —          | —      |
| Contract — update         | U            | U            | U*               | —               | —          | —      |
| Contract — delete         | D            | D            | —                | —               | —          | —      |

**Aktuální stav v kódu**: všechny write operace = ROLES_WRITE.

### 3.10 Admin & Settings

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Users — list              | R            | R            | —                | —               | —          | —      |
| Users — invite            | C            | C            | —                | —               | —          | —      |
| Users — change role       | U            | U            | —                | —               | —          | —      |
| Users — deactivate        | D            | D            | —                | —               | —          | —      |
| Tenant settings — view    | R            | R            | —                | —               | —          | —      |
| Tenant settings — update  | U            | U            | —                | —               | —          | —      |
| Tenant — delete           | D            | —            | —                | —               | —          | —      |
| Notifications — config    | U            | U            | —                | —               | —          | —      |

**Aktuální stav v kódu**: všechno = ROLES_MANAGE. Tenant delete neexistuje.

> **Edge case**: Pouze `tenant_owner` by měl moci smazat tenant a přenést vlastnictví.

### 3.11 Audit Log

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Audit log — list          | R            | R            | —                | —               | —          | —      |
| Audit log — export        | E            | E            | —                | —               | —          | —      |

**Aktuální stav v kódu**: @Roles('owner', 'admin') — odpovídá cílovému stavu.

### 3.12 Reports

| Akce                      | tenant_owner | tenant_admin | property_manager | finance_manager | operations | viewer |
| ------------------------- | :----------: | :----------: | :--------------: | :-------------: | :--------: | :----: |
| Financial reports         | R/E          | R/E          | R*/E*            | R/E             | —          | —      |
| Occupancy reports         | R/E          | R/E          | R*/E*            | —               | —          | —      |
| Debt reports              | R/E          | R/E          | R*/E*            | R/E             | —          | —      |
| Activity reports          | R/E          | R/E          | —                | —               | —          | —      |

**Aktuální stav v kódu**: @Roles('owner', 'admin') — potřeba rozšířit o property_manager a finance_manager.

---

## 4. Edge Cases & Open Questions

### 4.1 Rozhodnutí ke schválení

| #  | Otázka                                                                                          | Doporučení                                                   |
| -- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1  | **Kdo může přiřadit property_manager k nemovitosti?**                                           | **Schváleno**: pouze tenant_owner a tenant_admin.             |
| 2  | **Může property_manager vytvořit novou nemovitost, nebo jen spravovat přiřazené?**              | **Schváleno**: pouze přiřazené. Vytvoření = tenant_admin+. Matrix 3.1 opravena. |
| 3  | **Má finance_manager vidět helpdesk tickety?**                                                  | **Schváleno**: ne — nemá provozní odpovědnost.               |
| 4  | **Má operations vidět faktury?**                                                                | **Schváleno**: ne — nemá finanční odpovědnost. Vidí work ordery. Později možný omezený read navázaný na WO náklady. |
| 5  | **Kdo schvaluje předpisy (prescriptions)?**                                                     | **Schváleno**: tenant_owner, tenant_admin, finance_manager. Ne property_manager — oddělení odpovědnosti. |
| 6  | **Může tenant_admin mazat nemovitosti?**                                                        | **Schváleno**: ano, ale nikdy hard delete. Pouze archivace/deaktivace + audit log. Blokováno pokud existují aktivní vazby (rezidenti, smlouvy, otevřené tickety). |
| 7  | **Jak se řeší uživatel s property_manager rolí, přiřazený ke 0 nemovitostem?**                  | **Schváleno**: vidí prázdný dashboard. Nelze obejít scope.   |
| 8  | **Má viewer vidět audit log?**                                                                  | **Schváleno**: ne — audit je admin-level.                    |
| 9  | **Jak se řeší eskalace? (operations → property_manager → admin)**                               | **Schváleno**: V1 manuální přiřazení. V2 automatická eskalace po timeout. |
| 10 | **Může property_manager exportovat data nemovitostí mimo svůj scope?**                           | **Schváleno**: ne — export respektuje property scope.        |

### 4.2 Technické edge cases

| #  | Situace                                                          | Řešení                                                        |
| -- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| 1  | Uživatel je `property_manager` s prázdným `UserPropertyAssignment` | Vrací prázdné seznamy, nemůže nic vytvořit. UX upozornění.    |
| 2  | Faktura patří k nemovitosti, ke které `finance_manager` nemá scope | Pokud finance_manager = tenant scope → vidí vše. Pokud property scope → jen přiřazené. |
| 3  | Ticket vytvoří `operations`, pak mu odeberou přiřazení k nemovitosti | Ticket zůstává, ale uživatel ho přestane vidět v listingu.    |
| 4  | Super admin impersonuje uživatele s omezeným scope               | Impersonace přebírá scope cílového uživatele.                |
| 5  | Migrace existujících uživatelů na nové role                      | owner → tenant_owner, admin → tenant_admin, manager → property_manager (přiřazené: všechny nemovitosti), technician → operations, viewer → viewer. |
| 6  | `finance_manager` a `property_manager` na jednom uživateli       | **Změna oproti draftu**: jedna primární role + volitelné capability flagy. Např. `property_manager` + `finance_access` nebo `finance_manager` + `property_ops_read`. Tím se vyhneme zbytečnému povýšení na tenant_admin jen kvůli cross-module přístupu. Viz sekce 4.3. |

### 4.3 Capability Flags (nový koncept — z review bodu 4.2 #6)

Místo vynucování `tenant_admin` pro uživatele, kteří potřebují přístup přes hranice jedné role, zavádíme **capability flagy** — volitelná doplňková oprávnění k primární roli.

| Capability Flag       | Popis                                                      | Typický use case                                |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `finance_access`      | Read + create/update faktury, předpisy, upomínky           | property_manager, který zpracovává i finance     |
| `property_ops_read`   | Read-only přístup k nemovitostem, jednotkám, rezidentům    | finance_manager, který potřebuje kontext          |
| `helpdesk_access`     | CRUD ticketů v rámci svého scope                           | finance_manager, který řeší i provozní záležitosti |

**Pravidla**:
- Capability flag **nikdy nerozšiřuje scope** — respektuje property assignment primární role.
- Capability flag **nikdy nepřidává delete/admin oprávnění** — pouze read + write v rámci modulu.
- Uložení: `UserCapability(userId, capability, grantedBy, grantedAt)` tabulka.
- Guard logika: primární role guards se vyhodnotí první, pak se zkontrolují capability flagy.

**Implementační poznámka**: capability flagy jsou V2 feature. Pro V1 platí jedna role per uživatel.

> **Provozní pravidlo**: Povýšení na `tenant_admin` jako náhrada za chybějící capability flags je **výjimečné** a musí být zdůvodněné v audit logu (kdo schválil, proč, kdy se má přehodnotit). Nesmí se stát běžným vzorem — jinak se role model rozplizne ještě před implementací V2.

---

## 5. Implementační priority

| Priorita | Změna                                          | Effort | Závislosti       |
| --------- | ---------------------------------------------- | ------ | ---------------- |
| P5.1b     | Přejmenování rolí v DB + kódu                  | S      | Migrace, FE enum |
| P5.1c     | Přidání `finance_manager` role                 | M      | P5.1b            |
| P5.2      | `UserPropertyAssignment` tabulka + guard        | L      | P5.1b            |
| P5.3      | Property-scope filtr v servisních vrstvách      | L      | P5.2             |
| P5.4      | FE: UI pro přiřazení nemovitostí k uživatelům  | M      | P5.2             |
| P5.5      | FE: skrytí/zobrazení menu položek podle role    | M      | P5.1c            |
| P5.6      | `UserCapability` tabulka + guard rozšíření      | M      | P5.3 (V2)       |
| P5.7      | FE: UI pro capability flagy v user managementu  | S      | P5.6 (V2)       |

**Effort**: S = < 1 den, M = 1–2 dny, L = 3–5 dní

---

## 6. Porovnání: aktuální vs. cílový stav

| Oblast         | Aktuální stav                        | Cílový stav                               | Gap              |
| -------------- | ------------------------------------ | ----------------------------------------- | ---------------- |
| Role           | 5 rolí (owner→viewer)                | 6 rolí (+ finance_manager, rename 2)      | Enum + migrace   |
| Scope          | Tenant-only                          | Tenant + Property + Own                    | Nová tabulka     |
| Finance access | Sdílený s property_manager (WRITE)   | Dedikovaná finance_manager role            | Guard úpravy     |
| Helpdesk       | technician nemá přístup (mimo WRITE) | operations má CRUD* na tickety/WO          | Guard úpravy     |
| Reports        | Jen owner/admin                      | + property_manager (scope), finance_manager | Controller úpravy |
| Delete         | ROLES_MANAGE (owner/admin)           | Beze změny — owner/admin zachováno         | OK               |
| Audit          | owner/admin                          | Beze změny                                 | OK               |

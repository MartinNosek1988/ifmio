# IFMIO – UI Architecture

> Vygenerováno: 2026-04-01
> Na základě: AUDIT_REPORT.md, FEATURE_CATALOG.md, FIELD_CATALOG.md + apps/web/src/

---

## 1. Tech Stack & Conventions (U1)

| Nástroj | Verze | Konfigurace | Poznámka |
|---------|-------|-------------|----------|
| React | 19.2.0 | StrictMode, react-jsx transform | React 19 |
| Vite | 7.3.1 | 5 manual vendor chunks, @tailwindcss/vite | Žádné path aliasy |
| TypeScript | ~5.9.3 | strict, noUnusedLocals/Params, verbatimModuleSyntax | Nejpřísnější konfigurace |
| Tailwind CSS | 4.2.1 | @tailwindcss/vite (NE PostCSS), custom CSS variables | V4 architektura |
| TanStack Query | 5.90.21 | staleTime: 5min, retry: 1 | Server state |
| Zustand | 5.0.11 | 4 stores (auth, propertyPicker, tenant, tenantUser) | Client state |
| React Hook Form | 7.71.2 | + @hookform/resolvers 5.2.2 | Formuláře |
| Zod | 4.3.6 | ⚠️ V4 (web) vs V3 (API) | Validace |
| i18next | 25.8.18 | 5 jazyků (cs/en/sk/de/uk), LanguageDetector | i18n |
| React Router | 7.13.1 | createBrowserRouter, lazy loading | Routing |
| Axios | 1.13.6 | 15s timeout, Bearer interceptor, refresh queue | HTTP |
| Lucide React | 0.577.0 | — | Ikony |
| TanStack Table | 8.21.3 | — | Tabulky |
| Socket.io Client | 4.8.3 | — | WebSockets |
| Sentry | 10.43.0 | — | Error tracking |
| date-fns | 4.1.0 | — | Datumy |
| pdfjs-dist | 5.5.207 | — | PDF viewer |

### Vendor chunk strategie
```
vendor-react:  react, react-dom, react-router-dom
vendor-query:  @tanstack/react-query
vendor-ui:     lucide-react
vendor-utils:  axios, zod, date-fns, zustand
vendor-i18n:   i18next, react-i18next, language-detector
```

### Konvence
- **Soubory:** PascalCase pro komponenty (`PropertyForm.tsx`), kebab-case pro hooks/utility (`use-properties.ts`)
- **Složky:** Domain-based: `modules/{domain}/` s `api/`, `schemas/`, `__tests__/` podsložkami
- **Exporty:** Named exports pro hooks a utility, default pro page komponenty
- **Module pattern:** `api/{domain}.api.ts` (endpoints) + `api/{domain}.queries.ts` (React Query hooks)

---

## 2. Routing & Navigation (U2)

### Provider stack
```
StrictMode
  → HelmetProvider (document head)
    → QueryClientProvider (staleTime: 5min, retry: 1)
      → ToastProvider (4s auto-dismiss)
        → ConfirmDialogProvider (Promise-based)
          → RouterProvider (createBrowserRouter)
```

### Route přehled

| Kategorie | Routes | Layout | Lazy | Guard |
|-----------|--------|--------|------|-------|
| Locale public | 13 CS + 10 EN | I18nProvider | ANO | — |
| Auth | 10 | Standalone | ANO | — |
| Protected | 50+ | AppShell | ANO | useAuthStore.isLoggedIn |
| Portal | 8 | AppShell (client nav) | ANO | role: unit_owner/unit_tenant |
| **Celkem** | **80+** | | **100% lazy** | |

### Klíčové chráněné routes

| Path | Komponenta | UX Role | Popis |
|------|------------|---------|-------|
| `/dashboard` | DashboardPage | ALL | Role-aware KPI dashboard |
| `/properties` | PropertiesPage | fm, owner | Seznam nemovitostí |
| `/properties/:id` | PropertyDetailPage | fm, owner | Detail s taby |
| `/properties/:id/units/:unitId` | UnitDetailPage | fm, owner | Rooms, equipment, fees |
| `/finance` | FinancePage | fm, owner | 14 tabů (components, prescriptions, bank, doklady, parovani, konto, debtors, reminders, accounts, initial, settlement, payment-orders, export, sipo) |
| `/helpdesk` | HelpdeskPage | ALL | Tickety + SLA |
| `/workorders` | WorkOrdersPage | fm, tech, owner | Pracovní příkazy |
| `/assets` | AssetListPage | fm, tech, owner | Pasportizace |
| `/mio` | MioChatPage | ALL | AI asistent |
| `/team` | TeamPage | fm | Správa uživatelů |

### Route guards
- **Auth check:** `AppShell` → `useAuthStore.isLoggedIn` → redirect `/login`
- **Role visibility:** Sidebar items filtered by `useRoleUX()` (fm/tech/owner/client)
- **Client redirect:** `role === 'client'` → auto-redirect `/dashboard` → `/portal`
- **Code splitting:** 100% routes via `React.lazy()` + `withBoundary(moduleName, Component)`

### Sidebar navigace (7 sekcí)

| Sekce | UX Role | Položky | Badge |
|-------|---------|---------|-------|
| Přehled | ALL | Dashboard | — |
| Provoz | fm, tech, owner | Helpdesk, Pipeline, Agenda, WO, Assets, Revize, Protokoly, Dokumenty | Helpdesk (open+inProgress), WO (open) |
| Správa | fm, owner | Nemovitosti, Klienti, Adresář, Smlouvy, Bydlící, Měřidla, Kalendář | Contracts (expiringSoon) |
| Finance | fm, owner | Finance, Konto, Dlužníci, Výnosy SVJ, Vyúčtování | — |
| Komunikace | fm, owner | Komunikace, Pošta | — |
| Systém | fm | Reporting, Výkazy, Team, Typy zařízení, Mio AI, Insights, Audit, Nastavení | — |
| Portál | client | Přehled, Jednotky, Předpisy, Vyúčtování, Požadavky, Měřiče, Dokumenty, Konto | — |

---

## 3. Layout & Component Architecture (U3)

### Layout hierarchie

```
RootLayout (main.tsx — Providers)
├── I18nProvider → PublicLayout (landing, pricing, blog, ...)
├── AuthLayout (login, register, reset — centered card)
├── AppShell (chráněné — sidebar + topbar + content)
│   ├── Sidebar (240px, mobile overlay)
│   ├── TopBar (property picker, search, notifications, user menu)
│   ├── OnboardingBanner (dismissible)
│   ├── MioPanel (AI chat slide-out)
│   └── MainContent (Suspense → Outlet)
└── Standalone (QR, ballot, legal pages)
```

### UI Primitiva

| Komponenta | Props | Použití |
|------------|-------|---------|
| Badge | variant(6), children | Statusy, kategorie, severity |
| Button | variant(3), size(2), icon, loading | Akce, submit, navigace |
| Modal | open, onClose, title, wide/extraWide, footer | Formuláře, detaily |
| KpiCard | label, value, sub, color, icon, onClick | Dashboard metriky |
| Table\<T\> | data, columns, rowKey, onRowClick, onSort | Seznamy entit (mobile priority) |
| SearchBar | placeholder, onSearch | Real-time filtrování |
| EmptyState | title, description, variant(4), action | Prázdné seznamy |
| LoadingSpinner / LoadingState | text?, size?, inline? | Loading indikátory |
| ErrorBoundary | moduleName, fallback | Sentry logging, recovery |
| ErrorState | title, message, onRetry | Chybové stránky |
| Skeleton / SkeletonText/Card/Table | width, height | Loading placeholder |
| ConfirmDialog | title, message, variant(3), isLoading | Destruktivní akce (useConfirm hook) |
| Toast | — | success/error/warning/info (useToast hook) |
| SlaCountdown | deadline, status, compact | SLA timer s auto-refresh 60s |
| OAuthButtons | mode, invitationToken | Google, Microsoft, Facebook |
| PasswordStrength | password | Strength meter (length, upper, digit, special) |
| GenericChatter | entityType, entityId, showActivities | Komentáře + aktivity na entity |

### Custom hooks

| Hook | Účel |
|------|------|
| `useRoleUX()` | Backend role → UX role (fm/tech/owner/client/resident) |
| `useKeyboardShortcuts()` | Global: `g d`→dashboard, `g p`→properties, `g f`→finance, ... |
| `useIsMobile()` / `useIsTablet()` / `useIsDesktop()` | Responsive breakpoints |
| `useApiError()` | AxiosError → české chybové zprávy |

---

## 4. State Management (U4)

### Zustand Stores

| Store | Persist | State | Actions |
|-------|---------|-------|---------|
| `useAuthStore` | sessionStorage (`ifmio:access_token`, `ifmio:refresh_token`, `ifmio:user`) | user, isLoggedIn, isLoading, passwordExpired | login, register, logout, restoreSession |
| `usePropertyPickerStore` | localStorage (`ifmio-property-picker`) | selectedPropertyId, selectedFinancialContextId | setProperty, setFinancialContext, clear |
| `useTenantStore` | NE | currentTenant | setTenant |
| `useTenantUserStore` | localStorage (`estateos_tenant_users`) | tenantUsers[], permissions | load, hasPermission, invite, remove |

### React Query — globální

```typescript
staleTime: 5 * 60 * 1000  // 5 minut
retry: 1
```

### Query Key konvence
```
['domain']                        → all keys pro invalidaci
['domain', 'list', { filters }]   → list s filtry
['domain', 'detail', id]          → single entity
['domain', 'stats']               → aggregace
```

### Klíčové queries (s custom staleTime)

| Query Key | staleTime | Refresh | Popis |
|-----------|-----------|---------|-------|
| `['dashboard', 'badges']` | 60s | refetchInterval: 60s | Sidebar badge counts |
| `['dashboard', 'overview']` | 60s | refetchInterval: 60s | Dashboard KPIs |
| `['auth', 'me']` | 5min | — | Current user |
| `['auth', 'avatar']` | Infinity | — | User avatar |
| `['super-admin', 'check']` | Infinity | — | Super admin status |
| `['finance', 'invoices', 'stats']` | 30s | — | Invoice statistiky |
| `['admin', 'mioMeta']` | 1h | — | Mio config metadata |
| `['calendar', 'stats']` | 30s | — | Calendar stats |

### Invalidation pattern (Finance matching)
Jedno párování invaliduje 7 keys: transactions, prescriptions, summary, invoices, debtors, konto, konto-reminders.

### React Contexts

| Context | Soubor | Scope |
|---------|--------|-------|
| ToastContext | `shared/components/toast/Toast.tsx` | Root (main.tsx) |
| ConfirmDialogContext | `shared/components/ConfirmDialog.tsx` | Root (main.tsx) |
| AuthProvider | `core/auth/AuthProvider.tsx` | Root — restores session on mount |
| i18n | `core/i18n.ts` | Root — i18next + LanguageDetector |

---

## 5. Form Architecture (U5)

### Pattern
- **Library:** React Hook Form + Zod resolver (kde schema existuje)
- **Error display:** Pod polem (`<p className="text-red-500">`)
- **Submit:** `isSubmitting` → disabled button
- **Layout:** Většina v Modal, některé full-page (Register 4-step)
- **Create + Edit:** Unified komponenta s `initialData?` prop

### Formulářový inventář

| Formulář | Soubor | Polí | Zod | Modal | Endpoint |
|----------|--------|------|-----|-------|----------|
| PropertyForm | `modules/properties/PropertyForm.tsx` | 15 | NE (inline) | ANO | POST/PATCH /properties |
| UnitForm | `modules/properties/UnitForm.tsx` | 18 | NE | ANO | POST/PUT /units |
| BulkUnitForm | `modules/properties/BulkUnitForm.tsx` | 8 | NE | ANO | POST /units (bulk) |
| ResidentForm | `modules/residents/ResidentForm.tsx` | 16 | **ANO** (`resident.schema.ts`) | ANO | POST/PUT /residents |
| TicketForm | `modules/helpdesk/TicketForm.tsx` | 12 | NE | ANO | POST /helpdesk |
| WorkOrderForm | `modules/workorders/WorkOrderForm.tsx` | 12 | NE | ANO | POST /work-orders |
| AssetForm | `modules/assets/AssetForm.tsx` | 14 | NE | ANO | POST/PATCH /assets |
| MeterForm | `modules/meters/MeterForm.tsx` | 10 | NE | ANO | POST/PUT /meters |
| LeaseForm | `modules/contracts/LeaseForm.tsx` | 13 | NE | ANO | POST/PUT /contracts |
| EventForm | `modules/calendar/EventForm.tsx` | 9 | NE | ANO | POST/PATCH /calendar/events |
| InvoiceForm | `modules/finance/components/InvoiceForm.tsx` | 20+ | NE | ANO | POST/PUT /finance/invoices |
| PrescriptionForm | `modules/finance/components/PrescriptionForm.tsx` | 9 | NE | ANO | POST /finance/prescriptions |
| OccupancyForm | `modules/properties/OccupancyForm.tsx` | 6 | NE | ANO | POST /occupancies |
| DocumentForm | `modules/documents/DocumentForm.tsx` | 5 | NE | ANO | POST /documents/upload |
| AssemblyForm | `modules/assemblies/AssemblyForm.tsx` | 5 | NE | ANO | POST /assemblies |
| AgendaItemForm | `modules/assemblies/AgendaItemForm.tsx` | 5 | NE | ANO | POST /agenda-items |
| PerRollamForm | `modules/assemblies/per-rollam/PerRollamForm.tsx` | 5 | NE | ANO | POST (per rollam) |
| RevisionPlanForm | `modules/revisions/RevisionPlanForm.tsx` | 8 | NE | ANO | POST /revisions |
| RecurringPlanForm | `modules/recurring-plans/RecurringPlanForm.tsx` | 10 | NE | ANO | POST /recurring |
| LoginPage | `modules/auth/LoginPage.tsx` | 3+2FA | i18n labels | PAGE | POST /auth/login |
| RegisterPage | `modules/auth/RegisterPage.tsx` | 10 (4 steps) | NE | PAGE | POST /auth/register |

### Zod Schemas

| Schema | Soubor | Pole | Validace |
|--------|--------|------|----------|
| residentSchema | `modules/residents/schemas/resident.schema.ts` | 16 | firstName min(1)/max(50), lastName min(1)/max(50), email(), phone regex, role enum, ico max(8), dic max(12), note max(500) |

**Form state pattern (většina formulářů):**
```typescript
const [form, setForm] = useState({ /* initial */ })
const [errors, setErrors] = useState<Record<string, string>>({})
const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))
const validate = () => { /* manual checks */ }
```

**⚠️ Nález:** Pouze 1 z 22 formulářů používá Zod schema (ResidentForm). Ostatní používají inline useState + validate pattern (ne react-hook-form).

### Validační konzistence (FIELD_CATALOG.md cross-ref)

| Model | Pole | DB | Backend DTO | Frontend | GAP |
|-------|------|----|-------------|----------|-----|
| Property | name | NOT NULL | @IsNotEmpty, @MaxLength(200) | required (inline) | ⚠️ Frontend chybí maxLength |
| Property | postalCode | NOT NULL | @Matches(/\d{3}\s?\d{2}/) | required (inline) | ⚠️ Frontend chybí regex |
| Resident | firstName | NOT NULL | @IsNotEmpty, @MaxLength(100) | z.string().min(1).max(50) | ⚠️ Max 50 vs 100 |
| Resident | email | nullable | @IsOptional, @IsEmail | z.string().email().optional() | ✅ OK |
| Invoice | number | NOT NULL | @IsNotEmpty | required (inline) | ✅ OK |

---

## 6. Design System (U6)

### Design Tokens (CSS Variables)

#### Barvy

| Token | Hodnota | Použití |
|-------|---------|---------|
| `--primary` | #0D9488 (teal) | Akční barva, active sidebar, links |
| `--primary-light` | #14B8A6 | Hover states |
| `--primary-dark` | #0F766E | Pressed states |
| `--primary-50` | #F0FDFA | Active sidebar bg |
| `--success` | #10B981 | Zelené stavy, badges |
| `--warning` | #F59E0B | Varovné stavy |
| `--danger` | #EF4444 | Chyby, destruktivní akce |
| `--info` | #0D9488 | Informační (= primary) |
| `--dark` | #0C1222 | Tmavý text, headings |
| `--gray-50` → `--gray-800` | 8 odstínů | Odstíny šedé |

#### Typografie

| Token | Font | Použití |
|-------|------|---------|
| `--font-display` | Plus Jakarta Sans | Headings, nadpisy |
| `--font-body` | DM Sans | Tělo textu, labely |

#### Spacing & Radius

| Token | Hodnota |
|-------|---------|
| `--sp-1` → `--sp-6` | 4px, 8px, 12px, 16px, 24px, 32px |
| `--radius-sm` → `--radius-full` | 8px, 12px, 16px, 20px, 9999px |
| `--shadow-sm/md/lg/card` | Jemné stíny (max opacity 0.1) |

#### Sidebar

| Token | Hodnota |
|-------|---------|
| `--sidebar-width` | 240px |
| `--sidebar-bg` | white |
| `--sidebar-text-active` | var(--primary) teal |
| `--sidebar-active` | var(--primary-50) |

### Ikonografie
- **Knihovna:** Lucide React
- **Konzistence:** 18-20px v sidebar, 16px v buttons, 24px v KPI cards
- **Pattern:** `<Icon size={18} />` inline

### Dark mode
- **⚠️ Nepodporován.** Žádný dark: prefix v Tailwind, žádný theme toggle, light-only CSS variables.

### Animace
- **Minimální.** CSS transitions na hover/focus (0.15s ease). Žádný framer-motion. Toast fade-in/out. Modal overlay transition.

---

## 7. Data Flow & API Integration (U7)

### API Client (`core/api/client.ts`)

```
Axios instance
├── baseURL: VITE_API_URL ?? 'http://localhost:3000/api/v1'
├── timeout: 15_000ms
├── headers: { 'Content-Type': 'application/json' }
├── Request interceptor: Bearer token z sessionStorage
└── Response interceptor:
    ├── 401 → Refresh token queue → retry
    ├── Refresh fail → force logout → /login
    └── Skip refresh pro: /auth/login, /auth/refresh, /auth/register
```

### Data flow

```
Component → useQuery hook → API service → Axios client → REST API
                                    ↓
                             TanStack Query Cache
                                    ↓
Component → useMutation hook → API service → Axios client → REST API
                                    ↓
                         invalidateQueries (cache bust)
```

### Error handling

| Situace | Reakce |
|---------|--------|
| 401 (expired token) | Auto-refresh + retry. Fail → redirect /login |
| 401 (no token) | Redirect /login |
| 403 | Toast error + zůstane na stránce |
| 404 | Toast nebo ErrorState |
| 422/400 | Form field errors (kde je mapping) |
| 500 | Toast "Chyba serveru" |
| Network error | Toast "Nelze se připojit" |

### WebSocket
- **Socket.io Client** nainstalován (`socket.io-client@4.8.3`)
- Použito pro real-time notifikace a live voting dashboard

### File upload
- **FormData** přes Axios
- **Max 25MB** (Caddy limit)
- **Drag & drop:** Ne (standardní file input)
- **Progress:** Ne (TODO)

---

## 8. i18n & Localization (U8)

### Konfigurace

```typescript
i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { cs, en, sk, de, uk },
  fallbackLng: 'cs',
  detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'ifmio_lang' },
})
```

### Podporované jazyky

| Jazyk | Kód | Stav |
|-------|-----|------|
| Čeština | cs | ✅ Plně přeloženo (400+ klíčů) |
| Angličtina | en | ⚠️ Částečně (landing + auth) |
| Slovenština | sk | ⚠️ Částečně |
| Němčina | de | ⚠️ Částečně |
| Ukrajinština | uk | ⚠️ Částečně |

### Namespace struktura

| Namespace | Soubor | Obsah |
|-----------|--------|-------|
| cs.json (primary) | `locales/cs.json` | common, auth.login, auth.register, auth.forgotPassword, auth.acceptInvitation, auth.resetPassword, legal, language |
| cs.ts (extended) | `i18n/locales/cs.ts` | nav, hero, trust, features, stats, platform, cases, chat, seo, security, footer |

### Pattern v komponentách
```typescript
const { t } = useTranslation()
// Použití: t('auth.login.email'), t('common.save'), t('common.cancel')
```

### Formátování
- **Datumy:** `date-fns` + custom `formatCzDate()` → `dd.mm.yyyy`
- **Měna:** Custom `formatKc(amount)` → `1 234,56 Kč`
- **Čísla:** `Intl.NumberFormat('cs-CZ')`

### ⚠️ Hardcoded strings
Mnoho formulářových labelů je hardcoded v JSX (ne v i18n):
- PropertyForm: "Název *", "Adresa *", "Město *", "PSČ *", "Typ nemovitosti"
- TicketForm: "Název *", "Popis", "Priorita", "Kategorie"
- AssetForm: "Název zařízení *", "Kategorie", "Výrobce"
- WorkOrderForm: "Název úkolu *", "Priorita", "Termín realizace"

**Dopad:** Formuláře budou česky i pro EN/SK/DE/UK uživatele.

---

## 9. Performance & Loading (U9)

### Code splitting
- **100% routes** lazy loaded via `React.lazy()` + `withBoundary()`
- **5 vendor chunks** (react, query, ui, utils, i18n)
- **Žádný Suspense boundary** v AppShell pro celou stránku — každá route má vlastní ErrorBoundary

### Loading states
- **Skeleton:** `SkeletonText`, `SkeletonCard`, `SkeletonTable` — existují, ale ⚠️ nejsou konzistentně použity
- **LoadingSpinner/LoadingState:** Inline v komponentách
- **Suspense fallback:** `LoadingSpinner` v AppShell Outlet

### Pagination
- **Offset/limit pattern** — `?page=1&limit=20`
- **Žádný infinite scroll** — všude klasická paginace
- **Server-side sorting/filtering** — query params mapované na API

### Caching
- **Default staleTime: 5min** — dostatečné pro většinu dat
- **Dashboard badges:** 60s refresh (live badge counts)
- **Avatar:** Infinity (nikdy se nemění automaticky)
- **Optimistic updates:** ⚠️ Žádné (vše čeká na server response)

---

## 10. Accessibility & UX Patterns (U10)

### a11y
- **Semantic HTML:** Částečné — sidebar je `<div>`, ne `<nav>`. Main content nemá `<main>` tag explicitně.
- **ARIA:** `data-testid` atributy pro testování. Modaly mají role="dialog". ⚠️ Chybí aria-label na ikonových buttonech.
- **Keyboard:** Tab order funguje v modálech. ESC zavírá modal/dialog. ⚠️ Skip-to-content link chybí.
- **Kontrast:** Primary teal (#0D9488) na bílém — WCAG AA pass (4.5:1 ratio).

### UX patterns

| Pattern | Implementace |
|---------|-------------|
| Confirmation dialog | `useConfirm()` hook → Promise-based dialog (danger/warning/info) |
| Undo | ⚠️ Neexistuje |
| Bulk operace | Residents: bulk deactivate/activate/assign/mark-debtors |
| Search | Real-time (SearchBar), debounce v query params |
| URL sync | Filtry v URL query params (tab, search, status, priority) |
| Table sorting | Server-side (onSort → API query param) |
| Responsive | Mobile-first sidebar collapse, Table priority columns |
| Empty states | `EmptyState` komponenta s 4 variantami (default/search/error/filtered) |
| Error states | `ErrorState` s retry button, `ErrorBoundary` per-route |
| Dvojklik prevention | `isSubmitting` disabled button z React Hook Form |

---

## 11. Findings & Recommendations

### ⚠️ Nálezy

| # | Kategorie | Popis | Dopad |
|---|-----------|-------|-------|
| 1 | i18n | Formulářové labely hardcoded v JSX (PropertyForm, TicketForm, AssetForm, ...) | Multi-language broken |
| 2 | Validace | Pouze 1/14 formulářů má Zod schema. Ostatní inline `required` | Nekonzistentní validace |
| 3 | Validace | Frontend/Backend maxLength mismatch: Resident firstName 50 vs 100 | Uživatel dostane server error |
| 4 | a11y | Chybí skip-to-content link, aria-labels na icon buttons | Screen reader UX |
| 5 | a11y | Sidebar je `<div>` ne `<nav>`, content nemá `<main>` | Semantic HTML |
| 6 | UX | Žádné optimistic updates — vše čeká na server | Pomalejší perceived UX |
| 7 | UX | Žádné undo pro destruktivní akce (delete) | Data loss risk |
| 8 | Skeleton | SkeletonText/Card/Table existují ale nejsou konzistentně použity | Nekonzistentní loading UX |
| 9 | Dark mode | Nepodporován — light-only CSS variables | User preference |
| 10 | Zod | Version mismatch: V4 (web) vs V3 (API/validation package) | Potenciální runtime inkompatibilita |

### Doporučení

**Short-term:**
1. Přesunout formulářové labely do i18n souborů (15+ formulářů)
2. Přidat Zod schemas pro zbývajících 13 formulářů
3. Sjednotit maxLength validace frontend ↔ backend

**Medium-term:**
4. Přidat aria-labels, `<nav>`, `<main>`, skip-to-content
5. Implementovat optimistic updates pro CRUD operace
6. Konzistentně použít Skeleton loading ve všech list stránkách

**Long-term:**
7. Dark mode support
8. Sjednotit Zod verze (V3 nebo V4 — ne mix)
9. Přidat undo pattern pro delete operace

---

## 12. Appendix

### A. Kompletní Zustand store list

1. `useAuthStore` (core/auth/auth.store.ts) — session auth
2. `usePropertyPickerStore` (core/stores/property-picker.store.ts) — global property filter
3. `useTenantStore` (core/tenant-store.ts) — current tenant
4. `useTenantUserStore` (core/tenant-user-store.ts) — user permissions

### B. Kompletní Context list

1. `ToastContext` (shared/components/toast/) — notifications
2. `ConfirmDialogContext` (shared/components/ConfirmDialog.tsx) — confirm dialogs
3. `AuthProvider` (core/auth/AuthProvider.tsx) — session restore
4. `i18n` (core/i18n.ts) — internationalization

### C. Keyboard Shortcuts

| Shortcut | Navigace |
|----------|----------|
| `g d` | /dashboard |
| `g r` | /residents |
| `g f` | /finance |
| `g h` | /helpdesk |
| `g p` | /properties |
| `g x` | /reports |
| `g a` | /audit |
| `g w` | /workorders |

### D. UX Role Mapping

| Backend Role | UX Role | Nav Sections |
|---|---|---|
| tenant_owner, tenant_admin, property_manager | fm | Vše |
| operations | tech | Provoz |
| viewer, finance_manager | owner | Správa + Finance |
| unit_owner, unit_tenant | client | Portál |

---

*Vygenerováno: 2026-04-01. Self-review: 80+ routes pokryto, 4 stores, 4 contexts, 22 formulářů, 10 findings.*

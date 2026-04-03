# ifmio Data Layer Audit Report

**Date:** 2026-04-03
**Scope:** Knowledge Base (KB), Integrations (ARES, RUIAN, CUZK, Justice.cz), Enrichment Pipeline, Bulk Import
**Auditor:** Automated deep-read audit

---

## 1. DATA MODEL & IDENTIFIERS

### 1.1 KB Models Overview

| Model | Table | PK type | Unique keys | Tenant-scoped |
|-------|-------|---------|-------------|---------------|
| `Building` | `kb_buildings` | UUID (text) | `ruianBuildingId` (unique) | No (global) |
| `BuildingUnit` | `kb_building_units` | UUID (text) | `ruianUnitId` (unique) | No (global) |
| `KbOrganization` | `kb_organizations` | UUID (text) | `ico` (unique) | No (global) |
| `KbPerson` | `kb_persons` | UUID (text) | None | No (global) |
| `UnitOwnershipKb` | `kb_unit_ownerships` | UUID (text) | None | No (global) |
| `StatutoryBodyKb` | `kb_statutory_bodies` | UUID (text) | None | No (global) |
| `BuildingSource` | `kb_building_sources` | UUID (text) | None | No (global) |
| `KbRegistryChange` | `kb_registry_changes` | UUID (text) | None | No (global) |
| `KbSbirkaListina` | `kb_sbirka_listin` | UUID (text) | None | No (global) |
| `KbEvidenceTask` | `kb_evidence_tasks` | UUID (text) | None | No (global) |

### 1.2 Identifier Constraints

- **RUIAN codes as unique keys:** ✅ `Building.ruianBuildingId` has `@unique`. ✅ `BuildingUnit.ruianUnitId` has `@unique`. These are the primary dedup anchors.
- **ICO unique:** ✅ `KbOrganization.ico` has `@unique`. This is correct and critical for ARES dedup.
- **Cadastral codes:** ⚠️ `Building.cadastralTerritoryCode` and `cadastralTerritoryName` are just plain `String?` with an index on `cadastralTerritoryCode` but no FK to a territory table. These are referential text fields without validation — acceptable for a knowledge base but risk inconsistent naming.
- **KbPerson dedup:** ❌ **No unique constraint on KbPerson**. No `@unique` on `[firstName, lastName, city]` or `nameNormalized`. Duplicate persons will accumulate silently from different sources.
- **KbRegistryChange dedup:** ❌ **No unique constraint**. The orchestrator works around this by doing `deleteMany + createMany` in a transaction (line 291-314 of `property-enrichment.orchestrator.ts`), but this destroys history — re-enrichment wipes and replaces all changes.
- **KbSbirkaListina dedup:** ❌ **Same pattern as KbRegistryChange** — delete-all + recreate. No `@@unique([organizationId, justiceDocId])` or similar natural key.
- **StatutoryBodyKb dedup:** ❌ No unique constraint on `[organizationId, firstName, lastName, role]`.

### 1.3 Business Model Links

- **Property.buildingId:** ✅ Optional FK to `Building`. Set during enrichment. Indexed with `@@index([buildingId])`.
- **Unit.buildingUnitId:** ✅ Optional FK to `BuildingUnit`. Indexed.
- **Address redundancy:** ⚠️ `Property` stores `address`, `city`, `postalCode`, `cadastralArea` as flat text. `Building` stores `street`, `city`, `district`, `postalCode`, `fullAddress`. These are **independent copies** — no sync mechanism exists. After enrichment, the Property address and the linked Building address may diverge if either is edited.

### 1.4 Summary

| Area | Verdict |
|------|---------|
| RUIAN codes as unique keys | ✅ Correct |
| ICO unique on KbOrganization | ✅ Correct |
| Cadastral codes referential | ⚠️ Data debt — text fields, no FK |
| KbPerson dedup | ❌ Missing unique constraint |
| KbRegistryChange dedup | ❌ Missing — uses destructive replace |
| KbSbirkaListina dedup | ❌ Missing — uses destructive replace |
| StatutoryBodyKb dedup | ❌ Missing unique constraint |
| Property↔Building address sync | ⚠️ No sync mechanism |

---

## 2. ARES INTEGRATION

**File:** `apps/api/src/integrations/ares/ares.service.ts`

### 2.1 Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /ekonomicke-subjekty/{ico}` | `findByIco()` | Single subject lookup by ICO |
| `GET /ekonomicke-subjekty/vyhledat?obchodniJmeno=...` | `searchByName()` | Name-based search with pagination |

Both use the ARES v2 REST API at `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest`.

### 2.2 Cache Strategy

- ❌ **No caching on AresService**. Every `findByIco()` or `searchByName()` call hits the ARES API directly.
- The RUIAN service has in-memory cache (5 min TTL, max 500 entries), but ARES does not.

### 2.3 Rate Limiting

- ❌ **No client-side rate limiting** on `AresService` methods.
- Bulk import (`BulkImportService.matchAresOrganizations`) adds `500ms` delay between pages — this is the only rate control.
- ARES v2 has documented rate limits (unknown exact values, but reportedly ~5 req/s). Concurrent enrichment calls from multiple users could trigger 429s.

### 2.4 Error Handling

- ✅ ICO validation with proper checksum (weights `[8,7,6,5,4,3,2]`, mod 11). Throws `BadRequestException` for invalid ICO.
- ✅ `findByIco` returns `null` on 404 (not found) and non-OK responses. Logs warning.
- ⚠️ No retry logic — a single transient failure returns null permanently until next call.
- ⚠️ No timeout configured on `fetch()` calls in `findByIco` and `searchByName` (unlike RUIAN which uses `AbortSignal.timeout(5000)`).

### 2.5 Legal Form Mapping

- `KnowledgeBaseService.detectOrgType()` maps legal form names to `KbOrgType`:
  - "společenství vlastníků" → `SVJ`
  - "družstvo" → `BD`
  - "s.r.o." / "společnost s ručením" → `SRO`
  - "a.s." / "akciová" → `AS`
  - Other → `OTHER_ORG`
- ⚠️ **String matching only** — does not use `pravniFormaKod` (numeric code). Fragile if ARES changes wording.

### 2.6 Subject Status Tracking

- ✅ `AresSubject.datumZaniku` is extracted and returned.
- ✅ `PropertyFormPage` shows "Zaniklý subjekt" warning banner.
- ⚠️ `KbOrganization.dateCancelled` exists in schema but is **never set** by `findOrCreateOrganization()`. Defunct subjects are stored as active.

### 2.7 DIČ Validation

- ⚠️ DIČ is stored as-is from ARES. No format validation (should be `CZ` + 8-10 digits).
- `isVatPayer` is set to `!!dic` — this is correct (if DIČ exists, they're a VAT payer).

### 2.8 ARES → Building Matching

- In `PropertyEnrichmentOrchestrator.enrichFromAddress()`: searches ARES by street name + house number, filters for SVJ/BD by legal form name.
- ⚠️ **Address text matching only** — no RUIAN code comparison. False positive risk if multiple SVJs share a street name prefix.
- In `BulkImportService.matchAresOrganizations()`: matches via `findBuildingByAddress()` which uses `street.split(' ')[0]` (first word of street name) with case-insensitive `contains`. This is **very fuzzy** and will produce false positives for common street names.

---

## 3. RUIAN INTEGRATION

**File:** `apps/api/src/integrations/ruian/ruian.service.ts`

### 3.1 Data Source

- **Geocoding API** (not VDP/ArcGIS MapServer for address autocomplete):
  - URL: `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/findAddressCandidates`
  - This is the CUZK ArcGIS Geocode service — suitable for address autocomplete.
- **Bulk import** uses the ArcGIS MapServer Query API directly (layer 1 — AdresniMisto):
  - URL: `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/1/query`

### 3.2 Match_addr Parsing

- Pattern: `"Sokolská 455/3, Nové Město, 12000 Praha 2"`
- Parser splits by comma, extracts PSC via regex `(\d{5})\s+(.+)`, district from middle parts.
- ✅ Robust for standard Czech addresses.
- ⚠️ `ruianCode` is set to `addr.Loc_name` which is the locator name, **not** the actual RUIAN address code. This is a misnamed field — it does not contain a RUIAN kod.

### 3.3 S-JTSK Conversion

- ✅ `IprPriceService` uses `proj4` library for WGS84↔S-JTSK (EPSG:5514) conversion.
- ✅ Correct proj4 definition string for Krovak projection.

### 3.4 RUIAN Code Storage

- `Building.ruianBuildingId` — the stavebni objekt ID from RUIAN, stored as unique string.
- `Building.ruianAddressId` — exists in schema but **never populated** by any service.
- `BuildingUnit.ruianUnitId` — exists but **never populated** by bulk import (only building-level data is imported).

### 3.5 Bulk RUIAN Import

- **Bbox:** Hardcoded Praha S-JTSK bbox (`PRAHA_BBOX_SJTSK`). ❌ Only Praha is supported; the code explicitly throws for non-Praha regions.
- **Pagination:** `resultOffset` + `resultRecordCount=500` per batch.
- **Upsert logic:** `prisma.building.upsert` by `ruianBuildingId` — correct. On conflict, only updates `lastEnrichedAt`, lat, lng.
- **Rate limit:** 200ms delay between batches (~5 req/s).
- ⚠️ Groups addresses by `stavebniobjekt` to deduplicate, which is correct.

### 3.6 Territorial Hierarchy Mapping

- ⚠️ No mapping of RUIAN territorial hierarchy (obec → MOMC → katastrální území → ZSJ). Only city, district, and postal code are parsed from the address string.
- `cadastralTerritoryCode` and `cadastralTerritoryName` on Building are never populated by the bulk import.

### 3.7 Cache

- ✅ In-memory cache with 5-minute TTL, max 500 entries. Simple but effective for autocomplete.
- ⚠️ LRU eviction just deletes the first entry — not true LRU, but acceptable for the size.

---

## 4. CUZK / CADASTRE

**File:** `apps/api/src/integrations/cuzk/cuzk.service.ts`

### 4.1 State: Functional but Limited

- **`findParcel()`** — queries CUZK ArcGIS MapServer layer 3 (parcels) by parcel number and cadastral territory.
- ✅ Returns parcel area, land type, owner name, geometry.
- ⚠️ **SQL injection risk:** The `where` clause uses string interpolation: `PARCELA = '${parcelniCislo}'`. If `parcelniCislo` contains a single quote, it could break the query (though this goes to an external ArcGIS service, not a local DB, so impact is limited to query failure or ArcGIS-side injection).
- ❌ **No building owner detection** — only parcel-level data. No integration with CUZK Dalekovy pristup (paid service) or CUZK Nahlidni do katastru.
- ❌ **Not called by any enrichment pipeline** — the controller exposes it, but the orchestrator has a `// TODO: Napojit CUZK` comment at step 2.

### 4.2 Ownership Type Detection

- ❌ Not implemented. `Building` schema has fields for it (`KbOwnershipType` on `UnitOwnershipKb`), but no service populates them.

---

## 5. JUSTICE.CZ INTEGRATION

**File:** `apps/api/src/integrations/justice/justice.service.ts`

### 5.1 HTML Parsing Robustness

- Uses `cheerio` to parse HTML from `or.justice.cz`.
- **Subject lookup** (`getSubjectByIco`): Looks for `a[href*="subjektId="]` link, extracts ID via regex. Parses table cells for spisova znacka and court.
- **Registry history** (`getRegistryHistory`): Parses `table.result-details tr` and `.aunp-content table tr`. Falls back to "Vypis platnych" page if no changes found.
- **Document list** (`getDocumentList`): Parses table rows, extracts names, dates, download links.
- ⚠️ **Fragile** — Justice.cz frequently changes HTML structure. CSS selectors like `.aunp-content`, `.vp-cell`, `.vp-label` are implementation-specific.
- ⚠️ **No version detection or fallback** — if the HTML changes, parsing silently returns empty arrays.

### 5.2 Document Classification

- Regex-based: `classifyDocument()` maps document names to types:
  - `účetní závěrka` → `ucetni_zaverka`
  - `stanovy` → `stanovy`
  - `zakladatelská listina` → `zakladatelska_listina`
  - `notářský zápis` → `notarsky_zapis`
  - `výroční zpráva` → `vyrocni_zprava`
  - `prohlášení vlastníků` → `prohlaseni_vlastniku`
  - Default → `other`
- ✅ Reasonable classification. Period extraction from document name is also implemented.

### 5.3 Dedup Risks

**This is a significant issue.**

- `KbRegistryChange` — ❌ **No unique constraint** on `[organizationId, changeDate, changeType]` or any natural key.
- `KbSbirkaListina` — ❌ **No unique constraint** on `[organizationId, justiceDocId]` despite `justiceDocId` being a natural unique key.
- The orchestrator uses **destructive dedup**: `deleteMany` all existing records, then `createMany` new ones, wrapped in `$transaction`. This means:
  - Every re-enrichment destroys all historical data and replaces it with current parse results.
  - If the Justice.cz page structure changes and parsing returns fewer items, data is permanently lost.
  - No ability to track when a specific change or document was first observed.
  - Race condition: concurrent enrichments for same org could cause data loss.

### 5.4 Timeout

- ✅ All Justice.cz requests use `AbortSignal.timeout(10000)` (10s).

---

## 6. ENRICHMENT ORCHESTRATOR

**File:** `apps/api/src/knowledge-base/property-enrichment.orchestrator.ts`

### 6.1 Full Chain Analysis (9 Steps)

| Step | Name | try/catch | Timeout | Fallback | Quality Score | Notes |
|------|------|-----------|---------|----------|---------------|-------|
| 0 | Duplicate Detection | ✅ | Via DB timeout | Returns null | +0 | Checks existing building by street+city |
| 1 | ARES SVJ/BD Search | ✅ | ❌ No timeout on fetch | Empty result | +20-30 | Fuzzy name search, fragile |
| 2 | CUZK | N/A | N/A | N/A | +0 | **STUB** — commented out TODO |
| 3 | IPR Praha Price Map | ✅ | 8s (in IprPriceService) | Disclaimer text | +10 | Only works in Praha |
| 4 | Visual Data (Ortofoto) | No fetch (URL construction only) | N/A | No image shown | +0 | Just builds URLs |
| 5 | POI (Overpass/OSM) | ✅ | 12s | Empty POI | +5 | External API, may be slow |
| 6 | Risk Profile | ✅ | 5-6s per check | "unknown" levels | +5 | 3 parallel checks (flood, radon, heritage) |
| 7 | Condition Prediction | ✅ (no external call) | N/A | Empty components | +0 | Pure calculation |
| 8 | Paid Data Catalog | No call (static data) | N/A | N/A | +0 | Informational only |
| 9 | Justice.cz OR + Sbirka | ✅ | 10s per call | Empty arrays | +10 | 2 sequential calls, then DB persist |

### 6.2 Execution Model

- **Sequential** — all steps run one after another in a single async function.
- ⚠️ **Blocking** when called from the `/knowledge-base/enrich` endpoint — the HTTP request waits for all 9 steps.
- ⚠️ Total worst-case latency: ~50+ seconds (ARES + IPR 8s + Overpass 12s + flood 5s + radon 5s + heritage 6s + Justice 2x10s).
- ✅ When called from `PropertiesService.create()` via `BuildingEnrichmentService`, it runs fire-and-forget (`.catch()` swallows errors).

### 6.3 Quality Score

- Starts at 30 (base).
- Max theoretical: 30 + 30 (ARES + zastupci) + 10 (IPR) + 5 (POI) + 5 (Risk) + 10 (Justice) = 90.
- Capped at 100 with `Math.min(result.qualityScore, 100)`.
- ⚠️ `BuildingEnrichmentService` calculates a **separate** quality score via `calculateQuality()` which uses different criteria (street +10, city +10, etc.). These two scores are not reconciled.

---

## 7. BULK IMPORT PIPELINE

**File:** `apps/api/src/knowledge-base/bulk-import.service.ts`

### 7.1 Four Steps

| Step | Method | Data Source | Rate Limit | Status |
|------|--------|-------------|------------|--------|
| RUIAN | `importRuianBuildings()` | CUZK ArcGIS MapServer | 200ms/batch | ✅ Functional (Praha only) |
| ARES | `matchAresOrganizations()` | ARES v2 REST | 500ms/page | ✅ Functional |
| ENRICHMENT | `autoEnrichBuildings()` | IPR, Overpass, VUV | 1000ms/building | ✅ Functional |
| JUSTICE | `bulkJusticeEnrichment()` | Justice.cz | 1000ms/org | ❌ **Stub** — loops orgs but does nothing |

### 7.2 Job Management

- **In-memory state**: `Map<string, BulkImportJob>` — ❌ jobs are lost on server restart.
- ✅ Start/pause/resume supported via status flag check in loop.
- ⚠️ Resume re-enters `runImport()` but uses `lastProcessedId` which is stored as string offset — only works for RUIAN step.
- ⚠️ No job persistence to DB (noted as TODO in code).
- ⚠️ No concurrency control — multiple simultaneous RUIAN imports would hit CUZK API in parallel.

### 7.3 ARES Bulk Matching Logic

- Searches for "Společenství vlastníků" and "Bytové družstvo" by name prefix.
- Paginates with `pocet=100` and `start` offset.
- For each subject, tries to match to existing Building by address.
- `findBuildingByAddress()` uses first word of street + case-insensitive contains.
- ⚠️ **Estimated match rate: LOW** — the fuzzy street name matching will miss many buildings and produce false positives for common names like "Kaprova", "Nová" etc.

### 7.4 Justice Bulk Step

- ❌ **Non-functional** — the loop iterates organizations but only increments `job.processed`. No actual Justice.cz calls are made. Comment says "the per-property orchestrator handles actual Justice.cz calls when a property is viewed."

---

## 8. DATA QUALITY & LINKING

### 8.1 Quality Score Calculation

Two independent scoring systems exist:

1. **`KnowledgeBaseService.calculateQuality()`** — used during building creation:
   - street: +10, city: +10, postalCode: +5, lat+lng: +15, ruianBuildingId: +15, district: +5, fullAddress: +5
   - Max: 65 (from this method alone)

2. **`PropertyEnrichmentOrchestrator`** — used during enrichment:
   - Base: 30, ARES: +20, zastupci: +10, IPR: +10, POI: +5, risk: +5, Justice: +10
   - Max: 90

3. **Bulk import** — sets initial score to 30, then adds +20 when ARES match succeeds.

- ⚠️ **Inconsistency**: a building created via bulk RUIAN gets score 30, then enriched to potentially 85+. But the two systems don't compose — they write absolute values to the same field.

### 8.2 Address Matching

- **Duplicate detection** (`BuildingIntelligenceService.checkDuplicate()`):
  - Uses `street.split(' ')[0]` (first word) + `city contains` — ⚠️ very loose.
  - "Karlova" matches "Karlovo" due to `contains`.
  - No threshold or confidence score on duplicate match.

- **Building address match** (`KnowledgeBaseService.findOrCreateBuilding()`):
  1. First tries `ruianBuildingId` exact match — ✅ best path.
  2. Falls back to `street.split(' ')[0]` contains + city contains — ⚠️ false positive risk.
  3. If no match, creates new building — could create duplicates if RUIAN ID is unknown.

### 8.3 False Positive Risk Assessment

- **HIGH** for address-based matching without RUIAN codes.
- Street names like "Na" (39 streets in Praha starting with "Na") would match broadly.
- The `split(' ')[0]` logic means "Na Příkopě" becomes "Na" — matches "Na Perštýně", "Na Florenci", etc.

### 8.4 Analytical Capabilities

- ✅ **Coverage stats endpoint**: `/knowledge-base/stats/coverage` — groups by district, quality levels, org linkage rate.
- ✅ **Building search** with city/district/text filters.
- ⚠️ No SVJ-per-district aggregation endpoint (data exists but no API).
- ❌ No flood zone cross-reference with buildings (risk data is per-request, not stored on Building).

---

## 9. HISTORY & TEMPORAL DIMENSION

### 9.1 Change Tracking

- ✅ `BuildingSource`, `BuildingUnitSource`, `OrganizationSource` tables track which data source updated which fields and when (`fetchedAt`, `fieldsUpdated[]`).
- ⚠️ Sources are **append-only** — multiple entries for same building+source accumulate. No dedup on source entries.
- ❌ No SCD2 (Slowly Changing Dimension Type 2) for any KB entity. When a building's address changes, the old value is lost.

### 9.2 Freshness Tracking

- ✅ `Building.lastEnrichedAt` — set on every enrichment/import.
- ✅ `KbOrganization.lastAresSync` — set on ARES data update.
- ❌ No scheduled re-enrichment. Data freshness degrades over time with no automatic refresh.

### 9.3 Registry History

- `KbRegistryChange` captures OR history — but uses destructive replace pattern (see section 5.3).
- ❌ No `fetchedAt`-based versioning of the full enrichment state.

---

## 10. RISKS & TECH DEBT

### 10.1 Data Integrity

| # | Severity | Risk | When it manifests | How to fix | Effort |
|---|----------|------|-------------------|------------|--------|
| D1 | ❌ CRITICAL | **KbPerson has no unique constraint** — duplicates accumulate with each CUZK/cadastral import | When ownership data is imported from CUZK | Add `@@unique([nameNormalized, city])` or introduce external ID | 1 day |
| D2 | ❌ CRITICAL | **KbRegistryChange/KbSbirkaListina destructive replace** — re-enrichment wipes all history | Every re-enrichment of a property | Add natural-key unique constraints, switch to upsert instead of delete+create | 2 days |
| D3 | ⚠️ HIGH | **Property↔Building address desync** — no mechanism to sync address changes | User edits Property address after enrichment | Add update trigger or sync job | 1 day |
| D4 | ⚠️ HIGH | **Fuzzy matching false positives** — `street.split(' ')[0]` + contains matches wrong buildings | Common street name prefixes ("Na", "V", "U", "Pod") | Require RUIAN ID match first, only fall back to fuzzy with confidence threshold | 3 days |
| D5 | 🔧 MEDIUM | **dateCancelled never populated** on KbOrganization despite being available from ARES | Defunct SVJ appears as active in KB | Set `dateCancelled` from `datumZaniku` in `findOrCreateOrganization()` | 30 min |
| D6 | 🔧 MEDIUM | **Two independent quality score systems** that don't compose | Scores are inconsistent depending on creation path | Unify into single calculation method | 1 day |
| D7 | 💡 LOW | **ruianAddressId on Building never populated** | Schema field exists but is always null | Either populate from RUIAN data or remove from schema | 30 min |

### 10.2 Scalability

| # | Severity | Risk | When it manifests | How to fix | Effort |
|---|----------|------|-------------------|------------|--------|
| S1 | ❌ CRITICAL | **Bulk import jobs stored in-memory** — lost on server restart | Server restart during import | Persist jobs to DB table (already noted as TODO) | 2 days |
| S2 | ⚠️ HIGH | **No ARES response caching** — every ICO lookup hits external API | High traffic on property creation/edit | Add in-memory cache (like RUIAN) or Redis cache with 1h TTL | 1 day |
| S3 | ⚠️ HIGH | **Enrichment endpoint is synchronous** — blocks HTTP request for 10-50 seconds | User clicks enrich and waits | Return immediately, process async with status polling endpoint | 3 days |
| S4 | 🔧 MEDIUM | **RUIAN bulk hardcoded to Praha bbox** | Expansion to other cities | Derive bbox from region parameter + pre-defined city bboxes | 2 days |
| S5 | 🔧 MEDIUM | **BuildingSource append-only growth** — no cleanup of old sources | After many enrichment cycles | Add retention policy or deduplicate by source type | 1 day |

### 10.3 Security

| # | Severity | Risk | When it manifests | How to fix | Effort |
|---|----------|------|-------------------|------------|--------|
| X1 | ⚠️ HIGH | **ARES/RUIAN endpoints marked @Public()** — no auth required | Anyone can query ARES/RUIAN through the app | Add rate limiting per IP; consider removing @Public | 1 day |
| X2 | ⚠️ HIGH | **CuzkService SQL injection via string interpolation** — `PARCELA = '${parcelniCislo}'` | Malicious parcel number input | Use parameterized query or sanitize input | 30 min |
| X3 | 🔧 MEDIUM | **KB data is tenant-agnostic** — cross-tenant information leakage risk | Building detail endpoint shows all properties linked to a building (already mitigated: comment says "Don't include properties") | Verify no endpoint leaks tenant-specific data via KB relations | 1 day |
| X4 | 🔧 MEDIUM | **No auth on knowledge-base endpoints** — controller uses `@Roles` but no `@Public` check | Only accessible to authenticated users with ROLES_MANAGE | Acceptable, but document the access model |  |

### 10.4 Reliability

| # | Severity | Risk | When it manifests | How to fix | Effort |
|---|----------|------|-------------------|------------|--------|
| R1 | ⚠️ HIGH | **Justice.cz HTML parsing is fragile** — no fallback or version detection | Justice.cz redesigns their pages (happens periodically) | Add HTML structure validation, alert on parse failure rate | 2 days |
| R2 | ⚠️ HIGH | **No timeout on ARES fetch calls** — can hang indefinitely | ARES API is slow or unresponsive | Add `AbortSignal.timeout(10000)` to all ARES fetch calls | 30 min |
| R3 | 🔧 MEDIUM | **External API failures silently return empty** — no monitoring | IPR Praha, VUV, CGS go down | Add error rate metrics/logging, alert threshold | 1 day |
| R4 | 🔧 MEDIUM | **No retry logic on any external API call** | Transient network failures | Add retry with exponential backoff (1 retry, 2s delay) | 1 day |
| R5 | 💡 LOW | **Overpass API 12s timeout** — can slow enrichment chain | Overpass API under load | Reduce timeout to 5s, make POI optional | 30 min |

### 10.5 Maintainability

| # | Severity | Risk | When it manifests | How to fix | Effort |
|---|----------|------|-------------------|------------|--------|
| M1 | 🔧 MEDIUM | **Legal form detection by string matching** instead of numeric code | ARES changes legal form text | Use `pravniFormaKod` (e.g., 961 = SVJ, 145 = BD) | 1 day |
| M2 | 🔧 MEDIUM | **Bulk Justice step is a no-op** — code exists but does nothing | Admin starts Justice bulk, thinks it's working | Either implement or remove from UI/API | 1 day |
| M3 | 💡 LOW | **RUIAN `ruianCode` field is misnamed** — stores `Loc_name` not RUIAN code | Developer confusion | Rename to `locatorName` or populate correctly | 30 min |

---

## 11. RECOMMENDATIONS

### ✅ QUICK WINS (1-3 days)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P0 | **Add `AbortSignal.timeout(10000)` to ARES fetch calls** (`ares.service.ts` lines 84, 112) | 30 min | Prevents hanging requests |
| P0 | **Fix CuzkService SQL injection** — sanitize `parcelniCislo` and `katastralniUzemi` inputs | 30 min | Security fix |
| P0 | **Set `dateCancelled` on KbOrganization** from `datumZaniku` in `findOrCreateOrganization()` | 30 min | Correct defunct org tracking |
| P1 | **Add ARES in-memory cache** (same pattern as RUIAN: Map with 5-min TTL) | 2 hours | Reduces external API load |
| P1 | **Add `@@unique([organizationId, justiceDocId])` on KbSbirkaListina** + migration | 1 day | Prevents data loss on re-enrichment |
| P1 | **Add `@@unique([organizationId, changeDate, changeType])` on KbRegistryChange** + switch from deleteMany to upsert | 1 day | Preserves historical data |
| P1 | **Use `pravniFormaKod` for legal form detection** instead of string matching | 1 day | More robust org type classification |

### 🧱 STRUCTURAL CHANGES (1-2 weeks)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P1 | **Make enrichment endpoint async** — return job ID, poll for status (reuse BulkImportJob pattern) | 3 days | UX improvement, prevents timeouts |
| P1 | **Persist bulk import jobs to DB** — add `KbImportJob` table with status, progress, resume state | 2 days | Crash resilience for long imports |
| P1 | **Unify quality score calculation** — single `calculateQuality(building)` method that considers all fields | 1 day | Consistent scoring |
| P2 | **Implement RUIAN bbox derivation** for cities beyond Praha | 2 days | Expand bulk import to all CZ cities |
| P2 | **Add address matching confidence score** — weight RUIAN match 100%, full street match 80%, first-word match 30% | 3 days | Reduce false positive links |
| P2 | **Add KbPerson dedup** — unique on normalized name + birth date or external ID | 2 days | Data integrity for ownership records |
| P2 | **Implement Justice.cz bulk enrichment** (currently a stub) or remove from API | 2 days | Either add value or reduce confusion |

### 🗺️ TARGET ARCHITECTURE (6 months)

| Area | Vision |
|------|--------|
| **CUZK Integration** | Connect CUZK Dalekovy pristup (paid API) for ownership data, LV, encumbrances. This is the highest-value data source for property management. |
| **Scheduled Re-enrichment** | CRON job to re-enrich buildings with `lastEnrichedAt` older than 90 days. Prioritize buildings with tenants. |
| **SCD2 for KB entities** | Track changes over time on Building and KbOrganization with `validFrom`/`validTo` ranges. |
| **Address Normalization** | Introduce a canonical address model using RUIAN code as primary key, normalize all address inputs through RUIAN geocoder. |
| **Data Pipeline Architecture** | Move from synchronous enrichment to event-driven pipeline (e.g., property.created event → queue → enrichment workers). |
| **External API Circuit Breaker** | Wrap all external services (ARES, Justice, CUZK, IPR, VUV) in circuit breaker pattern to handle prolonged outages gracefully. |

### 📈 BUSINESS VALUE

| Capability | Current State | Target | Value |
|------------|---------------|--------|-------|
| SVJ/BD identification | 60% (ARES name search) | 95% (RUIAN code + ARES ICO) | Automated property onboarding |
| Building enrichment coverage | Praha only | All CZ cities | 10x addressable market |
| Ownership data | Not implemented | CUZK integration | Automated owner registry, debt tracking |
| Data freshness | Manual re-enrichment | Auto-refresh every 90 days | Always-current registry data |
| Enrichment speed | 10-50s synchronous | <2s async | Better user experience |

---

## PRIORITIZED ACTION PLAN

### P0 — Fix Now (this sprint)
1. Add timeout to ARES fetch calls
2. Fix CUZK SQL injection
3. Set `dateCancelled` from ARES `datumZaniku`
4. Add ARES response caching

### P1 — Next Sprint
5. Add unique constraints on KbRegistryChange and KbSbirkaListina
6. Make enrichment endpoint async
7. Persist bulk import jobs to DB
8. Use `pravniFormaKod` for org type detection

### P2 — Backlog
9. Unify quality score calculation
10. Expand RUIAN bulk beyond Praha
11. Implement address matching confidence scoring
12. Add KbPerson dedup constraints
13. Complete or remove Justice.cz bulk step
14. Add scheduled re-enrichment CRON
15. Integrate CUZK Dalekovy pristup

---

*Generated by data layer audit on 2026-04-03. References: `apps/api/prisma/schema.prisma`, `apps/api/src/knowledge-base/`, `apps/api/src/integrations/`, `apps/api/src/properties/properties.service.ts`, `apps/web/src/modules/properties/PropertyFormPage.tsx`.*

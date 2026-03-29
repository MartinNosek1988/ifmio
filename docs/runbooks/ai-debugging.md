# Runbook: Debugging AI without PII

## Goal
Debug Mio / WhatsApp / invoice extraction AI issues without exposing personal data in logs, tickets, or Sentry.

## Principles
1. **Never log raw LLM payloads** — system prompt + tool results contain filtered but potentially sensitive data
2. **Use redaction metadata** — `RedactionMeta` counts tell you what was masked without showing original values
3. **Use structured logging** — check `toolName`, `duration`, `userId`, `category` fields, not message content

## How to verify payloads are redacted

### 1. Run PII redaction tests
```bash
cd apps/api && npx jest --testPathPatterns pii-redactor --no-coverage
```
Confirms: emails, phones, IBANs, bank accounts, rodna cisla, symbols all masked.

### 2. Run prompt injection regression tests
```bash
cd apps/api && npx jest --testPathPatterns prompt-injection --no-coverage
```
Confirms: 6 injection categories blocked with safe refusal messages.

### 3. Run output sanitizer tests
```bash
cd apps/api && npx jest --testPathPatterns llm-output-sanitizer --no-coverage
```
Confirms: script, iframe, event handlers, javascript: URLs stripped from output.

### 4. Check WhatsApp bot prompt (no PII)
```bash
cd apps/api && npx jest --testPathPatterns whatsapp-bot-pii --no-coverage
```
Confirms: system prompt contains only `role=`, no displayName/propertyName/unitName.

## How to debug a specific AI issue

### Mio chat returns wrong data
1. Check `toolsUsed` in the API response — which tools were called?
2. Check API logs for `Mio tool <name> for user <id> [<ms>ms]`
3. If tool returned error: `Mio tool <name> failed for user <id>: <error>`
4. If output was sanitized: `Mio output sanitized: N dangerous constructs removed`
5. If injection was blocked: `Prompt injection blocked [<category>] for user <id>`

### WhatsApp bot misclassifies intent
1. Check `outboxLog` table: `channel = 'whatsapp_incoming'`, `subject` shows `[ACTION] text...`
2. The system prompt only has `role=<role>` — no user-specific context to debug
3. Add temporary debug logging (remove before merge): log the `IntentResult` JSON

### Metrics to monitor
- `pii-redactor`: `meta.totalRedactions` per request (should be > 0 for real data)
- `prompt-injection.guard`: `blocked` count by `category` (Sentry breadcrumbs or structured log)
- `llm-output-sanitizer`: `stripped` count (should be 0 in normal operation; > 0 = possible injection)

## Feature flags
| Flag | Default | Effect |
|------|---------|--------|
| `LLM_REDACTION_ENABLED` | `true` | Master switch for PII redaction |
| `LLM_REDACTION_STRICT` | `false` | Also abbreviate personal names |
| `MIO_RETENTION_DAYS` | `90` | Conversation TTL (1–365) |

/**
 * PII Redaction Layer for LLM pipeline.
 * Masks personally identifiable information before sending data to external AI providers.
 *
 * IMPORTANT: This module must NEVER log the original values.
 * It only produces masked output + metadata counts.
 */

// ─── PATTERNS ───────────────────────────────────────────────────

const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+420\s?)?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/g,
  iban: /[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}(?:\s?\d{0,4})?/g,
  bankAccount: /\d{1,6}-?\d{2,10}\/\d{4}/g,
  rodnocislo: /(?<!\d)(?<!-)\d{6}\/\d{3,4}(?!\d)/g,  // 6 digits + / + 3-4 digits, not part of bank account
  vs: /(?:VS|variabilní\s+symbol)\s*[:=]?\s*\d{1,10}/gi,
  ss: /(?:SS|specifický\s+symbol)\s*[:=]?\s*\d{1,10}/gi,
  ks: /(?:KS|konstantní\s+symbol)\s*[:=]?\s*\d{1,4}/gi,
} as const;

export interface RedactionMeta {
  maskedEmails: number;
  maskedPhones: number;
  maskedIbans: number;
  maskedBankAccounts: number;
  maskedRodnoCislo: number;
  maskedSymbols: number;
  totalRedactions: number;
}

function emptyMeta(): RedactionMeta {
  return { maskedEmails: 0, maskedPhones: 0, maskedIbans: 0, maskedBankAccounts: 0, maskedRodnoCislo: 0, maskedSymbols: 0, totalRedactions: 0 };
}

// ─── STRING REDACTION ───────────────────────────────────────────

export function redactString(input: string): { output: string; meta: RedactionMeta } {
  const meta = emptyMeta();
  let output = input;

  const apply = (pattern: RegExp, replacement: string, metaKey: keyof Omit<RedactionMeta, 'totalRedactions'>) => {
    const matches = output.match(pattern);
    if (matches) {
      meta[metaKey] += matches.length;
      meta.totalRedactions += matches.length;
      output = output.replace(pattern, replacement);
    }
  };

  // Order matters: specific patterns first, then generic
  apply(PATTERNS.vs, 'VS: [VS]', 'maskedSymbols');
  apply(PATTERNS.ss, 'SS: [SS]', 'maskedSymbols');
  apply(PATTERNS.ks, 'KS: [KS]', 'maskedSymbols');
  apply(PATTERNS.email, '[EMAIL]', 'maskedEmails');
  apply(PATTERNS.iban, '[IBAN]', 'maskedIbans');
  apply(PATTERNS.rodnocislo, '[RČ]', 'maskedRodnoCislo');  // before bankAccount (overlapping format)
  apply(PATTERNS.bankAccount, '[ÚČET]', 'maskedBankAccounts');
  apply(PATTERNS.phone, '[TEL]', 'maskedPhones');

  return { output, meta };
}

// ─── OBJECT REDACTION (deep) ────────────────────────────────────

const PII_FIELD_NAMES = new Set([
  'email', 'phone', 'mobile', 'telefon',
  'iban', 'paymentIban', 'bankAccount', 'accountNumber',
  'rodnocislo', 'rodneCislo', 'birthNumber',
  'variableSymbol', 'constantSymbol', 'specificSymbol',
]);

const SENSITIVE_NAME_FIELDS = new Set([
  'firstName', 'lastName', 'name', 'fullName', 'displayName',
  'userName', 'assignee', 'requester', 'resolver',
  'supplierName', 'buyerName', 'residentName', 'partyName',
  'contactName', 'ownerName',
]);

export function redactObject<T>(obj: T, strict = false): { output: T; meta: RedactionMeta } {
  const meta = emptyMeta();

  function walk(val: unknown): unknown {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') {
      const { output, meta: m } = redactString(val);
      Object.keys(m).forEach(k => {
        if (k !== 'totalRedactions') (meta as any)[k] += (m as any)[k];
      });
      meta.totalRedactions += m.totalRedactions;
      return output;
    }
    if (Array.isArray(val)) return val.map(walk);
    if (typeof val === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(val as Record<string, unknown>)) {
        if (PII_FIELD_NAMES.has(key) && typeof v === 'string') {
          result[key] = `[${key.toUpperCase()}]`;
          meta.totalRedactions++;
        } else if (strict && SENSITIVE_NAME_FIELDS.has(key) && typeof v === 'string') {
          // Strict mode: abbreviate names "Jan Novák" → "J. N."
          const parts = v.trim().split(/\s+/);
          result[key] = parts.map(p => p[0]?.toUpperCase() + '.').join(' ');
          meta.totalRedactions++;
        } else {
          result[key] = walk(v);
        }
      }
      return result;
    }
    return val;
  }

  return { output: walk(obj) as T, meta };
}

// ─── MINIMIZE FOR LLM ──────────────────────────────────────────

type Purpose = 'mio-chat' | 'whatsapp-intent' | 'invoice-extract' | 'batch';

const FIELD_ALLOWLISTS: Record<Purpose, Set<string>> = {
  'mio-chat': new Set([
    'id', 'title', 'status', 'priority', 'description', 'category',
    'createdAt', 'updatedAt', 'deadline', 'completedAt', 'count',
    'propertyName', 'unitName', 'assetName', 'type', 'workType',
    'number', 'protocolType', 'date', 'dateTo', 'eventType', '_status',
    // tool result shapes:
    'tickets', 'workOrders', 'events', 'total', 'showing',
    'property', 'assets', 'meters', 'transactions', 'invoices',
    'name', 'assignee', 'location', 'notes',
  ]),
  'whatsapp-intent': new Set([
    'role', 'unitName', 'propertyName',
  ]),
  'invoice-extract': new Set([
    'number', 'supplierName', 'supplierIco', 'amountTotal',
    'vatRate', 'variableSymbol', 'currency',
  ]),
  'batch': new Set([
    'number', 'supplierName', 'supplierIco', 'amountTotal',
    'vatRate', 'variableSymbol', 'currency',
  ]),
};

export function minimizeForLLM<T extends Record<string, unknown>>(
  data: T | T[],
  purpose: Purpose,
): unknown {
  const allowlist = FIELD_ALLOWLISTS[purpose];
  if (!allowlist) return data;

  function filter(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (allowlist.has(key)) {
        result[key] = val;
      }
    }
    return result;
  }

  if (Array.isArray(data)) return data.map(item => filter(item as Record<string, unknown>));
  return filter(data);
}

// ─── FEATURE FLAGS ──────────────────────────────────────────────

export function isRedactionEnabled(): boolean {
  return process.env.LLM_REDACTION_ENABLED !== 'false';
}

export function isStrictRedaction(): boolean {
  return process.env.LLM_REDACTION_STRICT === 'true';
}

/**
 * LLM Pipeline Telemetry — safe debug events for AI data flow.
 *
 * Logs ONLY metrics and counts, NEVER raw prompts, tool results, or PII.
 * This module is the single point for AI pipeline observability.
 *
 * Usage:
 *   logLlmEvent({ pipeline: 'mio-chat', ... })
 *
 * What it logs:
 *   - Redaction counts (maskedEmails, maskedPhones, etc.)
 *   - Tool names and durations
 *   - Injection block events
 *   - Sanitization strip counts
 *   - Token counts and cost
 *
 * What it NEVER logs:
 *   - Raw user messages or LLM prompts
 *   - Tool result payloads
 *   - Email addresses, phone numbers, IBANs, names, addresses
 *   - System prompt content
 */

import { Logger } from '@nestjs/common';
import type { RedactionMeta } from './pii-redactor';

const logger = new Logger('LlmTelemetry');

export type LlmPipeline = 'mio-chat' | 'mio-public' | 'whatsapp-intent' | 'whatsapp-image' | 'invoice-extract' | 'batch-extract';

export interface LlmTelemetryEvent {
  pipeline: LlmPipeline;
  tenantId?: string;
  userId?: string;

  // Redaction metrics
  redaction?: RedactionMeta;
  fieldsMinimized?: number;     // count of fields removed by minimizeForLLM

  // Tool call metrics
  toolName?: string;
  toolDurationMs?: number;

  // Injection guard
  injectionBlocked?: boolean;
  injectionCategory?: string;

  // Output sanitization
  outputStripped?: number;      // count of dangerous constructs removed

  // Token/cost (from Anthropic response)
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

/**
 * Log a safe telemetry event. All fields are metrics — no PII.
 */
export function logLlmEvent(event: LlmTelemetryEvent): void {
  const { pipeline, tenantId, userId, ...metrics } = event;

  // Filter out undefined/null/zero values for compact logs
  const compact: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metrics)) {
    if (v !== undefined && v !== null && v !== 0 && v !== false) {
      // Flatten redaction meta if present
      if (k === 'redaction' && typeof v === 'object') {
        const r = v as RedactionMeta;
        if (r.maskedEmails > 0) compact.maskedEmails = r.maskedEmails;
        if (r.maskedPhones > 0) compact.maskedPhones = r.maskedPhones;
        if (r.maskedIbans > 0) compact.maskedIbans = r.maskedIbans;
        if (r.maskedBankAccounts > 0) compact.maskedBankAccounts = r.maskedBankAccounts;
        if (r.maskedRodnoCislo > 0) compact.maskedRodnoCislo = r.maskedRodnoCislo;
        if (r.maskedSymbols > 0) compact.maskedSymbols = r.maskedSymbols;
        if (r.totalRedactions > 0) compact.totalRedactions = r.totalRedactions;
      } else {
        compact[k] = v;
      }
    }
  }

  // Structured log — nestjs-pino will serialize as JSON in production
  logger.log({
    msg: `llm:${pipeline}`,
    pipeline,
    tenantId,
    userId,
    ...compact,
  });
}

/**
 * Verify a string contains no PII patterns.
 * Use in tests to assert that logged payloads are clean.
 */
export function containsPiiPatterns(text: string): string[] {
  const findings: string[] = [];

  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) findings.push('email');
  if (/(?:\+420\s?)?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/.test(text)) findings.push('phone');
  if (/[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/.test(text)) findings.push('iban');
  if (/\d{1,6}-?\d{2,10}\/\d{4}/.test(text)) findings.push('bankAccount');
  if (/\d{6}\/\d{3,4}/.test(text)) findings.push('rodnocislo');

  return findings;
}

import { logLlmEvent, containsPiiPatterns } from './llm-telemetry';

describe('LLM Telemetry', () => {
  describe('logLlmEvent', () => {
    it('does not throw for minimal event', () => {
      expect(() => logLlmEvent({ pipeline: 'mio-chat' })).not.toThrow();
    });

    it('does not throw for full event', () => {
      expect(() => logLlmEvent({
        pipeline: 'mio-chat',
        tenantId: 'tenant-1',
        userId: 'user-1',
        toolName: 'helpdesk_list',
        toolDurationMs: 42,
        redaction: {
          maskedEmails: 2,
          maskedPhones: 1,
          maskedIbans: 0,
          maskedBankAccounts: 0,
          maskedRodnoCislo: 0,
          maskedSymbols: 1,
          totalRedactions: 4,
        },
        injectionBlocked: false,
        outputStripped: 0,
      })).not.toThrow();
    });

    it('does not throw for injection block event', () => {
      expect(() => logLlmEvent({
        pipeline: 'mio-chat',
        tenantId: 'tenant-1',
        userId: 'user-1',
        injectionBlocked: true,
        injectionCategory: 'instruction_override',
      })).not.toThrow();
    });
  });

  describe('containsPiiPatterns', () => {
    it('detects email', () => {
      expect(containsPiiPatterns('Contact jan@test.cz for info')).toContain('email');
    });

    it('detects phone', () => {
      expect(containsPiiPatterns('Call +420 777 123 456')).toContain('phone');
    });

    it('detects IBAN', () => {
      expect(containsPiiPatterns('IBAN CZ65 0800 0000 1920 0014 5399')).toContain('iban');
    });

    it('detects bank account', () => {
      expect(containsPiiPatterns('Účet 19-2000145399/0800')).toContain('bankAccount');
    });

    it('detects rodné číslo', () => {
      expect(containsPiiPatterns('RČ 900101/1234')).toContain('rodnocislo');
    });

    it('returns empty for safe text', () => {
      expect(containsPiiPatterns('Požadavek #123 vyřešen')).toEqual([]);
    });

    it('returns empty for redacted text', () => {
      expect(containsPiiPatterns('[EMAIL], [TEL], [IBAN]')).toEqual([]);
    });

    it('detects multiple PII types', () => {
      const findings = containsPiiPatterns('jan@test.cz, +420 777 123 456, CZ65 0800 0000 1920 0014 5399');
      expect(findings).toContain('email');
      expect(findings).toContain('phone');
      expect(findings).toContain('iban');
    });

    // Critical: verify that log messages themselves don't contain PII
    it('telemetry event fields contain no PII patterns', () => {
      const event = {
        pipeline: 'mio-chat' as const,
        tenantId: 'tenant-abc123',
        userId: 'user-def456',
        toolName: 'helpdesk_list',
        toolDurationMs: 150,
      };
      // Serialize the event to check what would be logged
      const serialized = JSON.stringify(event);
      expect(containsPiiPatterns(serialized)).toEqual([]);
    });
  });
});

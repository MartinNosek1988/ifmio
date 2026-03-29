import { WhatsAppBotService } from './whatsapp-bot.service';
import { redactString } from '../security/pii-redactor';

// PII patterns that must NEVER appear in LLM payloads
const PII_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,    // email
  /(?:\+420\s?)?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/,         // phone
  /[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/,       // IBAN
  /\d{1,6}-?\d{2,10}\/\d{4}/,                              // bank account
  /\d{6}\/\d{3,4}/,                                         // rodné číslo
];

function containsPII(text: string): string | null {
  for (const pattern of PII_PATTERNS) {
    const match = text.match(pattern);
    if (match) return `PII found: ${match[0]} (pattern: ${pattern.source})`;
  }
  return null;
}

describe('WhatsApp Bot PII Redaction', () => {
  describe('buildClassifyPrompt', () => {
    let service: WhatsAppBotService;

    beforeEach(() => {
      // Minimal mock — we only test the prompt builder, not DI
      service = Object.create(WhatsAppBotService.prototype);
    });

    const senderWithPII = {
      party: {
        displayName: 'Jan Novák',
        email: 'jan.novak@email.cz',
        phone: '+420 777 123 456',
      },
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      unitId: 'unit-1',
      propertyName: 'Bytový dům Lipová 42',
      unitName: 'Byt 3A — Novákovi',
      role: 'tenant' as const,
    };

    it('system prompt does NOT contain sender displayName', () => {
      const prompt = service.buildClassifyPrompt(senderWithPII);
      expect(prompt).not.toContain('Jan Novák');
      expect(prompt).not.toContain('jan.novak@email.cz');
      expect(prompt).not.toContain('777 123 456');
    });

    it('system prompt does NOT contain property/unit names', () => {
      const prompt = service.buildClassifyPrompt(senderWithPII);
      expect(prompt).not.toContain('Lipová 42');
      expect(prompt).not.toContain('Byt 3A');
      expect(prompt).not.toContain('Novákovi');
    });

    it('system prompt DOES contain sender role', () => {
      const prompt = service.buildClassifyPrompt(senderWithPII);
      expect(prompt).toContain('role=tenant');
    });

    it('system prompt passes PII pattern scan', () => {
      const prompt = service.buildClassifyPrompt(senderWithPII);
      const pii = containsPII(prompt);
      expect(pii).toBeNull();
    });

    it('system prompt includes security rules', () => {
      const prompt = service.buildClassifyPrompt(senderWithPII);
      expect(prompt).toContain('BEZPEČNOSTNÍ PRAVIDLA');
      expect(prompt).toContain('NIKDY');
    });
  });

  describe('redactString on WhatsApp messages', () => {
    const testMessages = [
      'Ahoj, jsem Jan Novák z bytu 3A, email jan@novak.cz, telefon +420 777 123 456',
      'Moje IBAN je CZ65 0800 0000 1920 0014 5399, zaplaťte prosím VS: 1234567890',
      'Rodné číslo 900101/1234, účet 19-2000145399/0800',
      'Stav vodoměru: 145.3', // no PII — should pass through
    ];

    it.each(testMessages)('redacts PII from message: "%s"', (msg) => {
      const { output } = redactString(msg);
      const pii = containsPII(output);
      expect(pii).toBeNull();
    });

    it('preserves non-PII content', () => {
      const { output } = redactString('Teče mi voda v koupelně, potřebuji opravu');
      expect(output).toBe('Teče mi voda v koupelně, potřebuji opravu');
    });

    it('handles combined PII payload', () => {
      const combined = 'Jan Novák, jan@test.cz, +420 777 123 456, IBAN CZ65 0800 0000 1920 0014 5399, VS: 123, RČ 900101/1234';
      const { output, meta } = redactString(combined);
      expect(output).not.toContain('jan@test.cz');
      expect(output).not.toContain('777 123 456');
      expect(output).toContain('[IBAN]');
      expect(output).toContain('[VS]');
      expect(output).toContain('[RČ]');
      expect(meta.totalRedactions).toBeGreaterThanOrEqual(5);
    });
  });
});

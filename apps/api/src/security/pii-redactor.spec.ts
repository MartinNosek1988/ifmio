import { redactString, redactObject, minimizeForLLM } from './pii-redactor';

describe('PII Redactor', () => {
  describe('redactString', () => {
    it('masks email addresses', () => {
      const { output, meta } = redactString('Contact jan.novak@email.cz for info');
      expect(output).toBe('Contact [EMAIL] for info');
      expect(meta.maskedEmails).toBe(1);
    });

    it('masks phone numbers', () => {
      const { output, meta } = redactString('Zavolejte +420 777 123 456');
      expect(output).toContain('[TEL]');
      expect(meta.maskedPhones).toBe(1);
    });

    it('masks IBAN', () => {
      const { output, meta } = redactString('IBAN: CZ65 0800 0000 1920 0014 5399');
      expect(output).toContain('[IBAN]');
      expect(meta.maskedIbans).toBe(1);
    });

    it('masks bank account numbers', () => {
      const { output, meta } = redactString('Účet: 19-2000145399/0800');
      expect(output).toContain('[ÚČET]');
      expect(meta.maskedBankAccounts).toBe(1);
    });

    it('masks rodné číslo', () => {
      const { output, meta } = redactString('Rodné číslo je 900101/1234 v systému');
      expect(output).toContain('[RČ]');
      expect(meta.maskedRodnoCislo).toBe(1);
    });

    it('masks variable symbols', () => {
      const { output } = redactString('VS: 1234567890');
      expect(output).toContain('[VS]');
    });

    it('handles multiple PII in one string', () => {
      const { output, meta } = redactString('jan@test.cz, +420 111 222 333, VS: 123');
      expect(output).not.toContain('jan@test.cz');
      expect(output).not.toContain('111 222 333');
      expect(meta.totalRedactions).toBeGreaterThanOrEqual(3);
    });

    it('returns unchanged string when no PII', () => {
      const { output, meta } = redactString('Požadavek na opravu kotle');
      expect(output).toBe('Požadavek na opravu kotle');
      expect(meta.totalRedactions).toBe(0);
    });
  });

  describe('redactObject', () => {
    it('masks PII fields by name', () => {
      const { output } = redactObject({ email: 'jan@test.cz', phone: '777123456', title: 'Test' });
      expect(output.email).toBe('[EMAIL]');
      expect(output.phone).toBe('[PHONE]');
      expect(output.title).toBe('Test');
    });

    it('masks PII in nested strings', () => {
      const { output } = redactObject({ desc: 'Contact jan@test.cz', nested: { note: 'Call +420 777 123 456' } });
      expect((output as any).desc).toContain('[EMAIL]');
      expect((output as any).nested.note).toContain('[TEL]');
    });

    it('masks arrays', () => {
      const { output } = redactObject([{ email: 'a@b.cz' }, { email: 'c@d.cz' }]);
      expect((output as any)[0].email).toBe('[EMAIL]');
      expect((output as any)[1].email).toBe('[EMAIL]');
    });

    it('abbreviates names in strict mode', () => {
      const { output } = redactObject({ assignee: 'Jan Novák', title: 'Oprava' }, true);
      expect((output as any).assignee).toBe('J. N.');
      expect((output as any).title).toBe('Oprava');
    });
  });

  describe('minimizeForLLM', () => {
    it('filters to allowlisted fields for mio-chat', () => {
      const input = { id: '1', title: 'Test', email: 'jan@test.cz', secret: 'hidden', status: 'open' };
      const output = minimizeForLLM(input, 'mio-chat') as Record<string, unknown>;
      expect(output.id).toBe('1');
      expect(output.title).toBe('Test');
      expect(output.status).toBe('open');
      expect(output.email).toBeUndefined();
      expect(output.secret).toBeUndefined();
    });

    it('works with arrays', () => {
      const input = [{ id: '1', email: 'a@b.cz' }, { id: '2', email: 'c@d.cz' }];
      const output = minimizeForLLM(input, 'mio-chat') as Record<string, unknown>[];
      expect(output[0].id).toBe('1');
      expect(output[0].email).toBeUndefined();
    });
  });
});

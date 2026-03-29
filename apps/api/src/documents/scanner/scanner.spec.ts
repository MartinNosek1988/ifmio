import { ScannerService } from './scanner.service';
import { NoOpScanner } from './noop.scanner';
import type { ScanStatus } from '@prisma/client';

describe('ScannerService', () => {
  describe('getInitialStatus', () => {
    it('returns "skipped" when AV_SCANNING_ENABLED is not set', () => {
      delete process.env.AV_SCANNING_ENABLED;
      const service = Object.create(ScannerService.prototype);
      // Simulate constructor logic
      (service as any).enabled = process.env.AV_SCANNING_ENABLED === 'true';
      expect(service.getInitialStatus()).toBe('skipped');
    });

    it('returns "pending_scan" when AV_SCANNING_ENABLED=true', () => {
      const service = Object.create(ScannerService.prototype);
      (service as any).enabled = true;
      expect(service.getInitialStatus()).toBe('pending_scan');
    });
  });

  describe('isAvailable', () => {
    let service: ScannerService;

    beforeEach(() => {
      service = Object.create(ScannerService.prototype);
    });

    it.each([
      ['clean', true],
      ['skipped', true],
      ['pending_scan', false],
      ['quarantined', false],
      ['infected', false],
      ['scan_error', false],
    ] as [ScanStatus, boolean][])('status "%s" → available=%s', (status, expected) => {
      expect(service.isAvailable(status)).toBe(expected);
    });

    it('unscanned file cannot be downloaded', () => {
      expect(service.isAvailable('pending_scan')).toBe(false);
    });

    it('infected file cannot be downloaded', () => {
      expect(service.isAvailable('infected')).toBe(false);
    });
  });
});

describe('NoOpScanner', () => {
  const scanner = new NoOpScanner();

  it('always returns clean', async () => {
    const result = await scanner.scan(Buffer.from('test'), 'test.pdf');
    expect(result.clean).toBe(true);
    expect(result.threat).toBeUndefined();
  });

  it('is always available', async () => {
    expect(await scanner.isAvailable()).toBe(true);
  });
});

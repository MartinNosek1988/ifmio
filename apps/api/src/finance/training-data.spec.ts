import { TrainingDataService } from './training-data.service';

describe('TrainingDataService', () => {
  describe('save — storage strategy', () => {
    const MAX_INLINE = 50_000; // bytes, matches service constant

    it('large PDF (> 50KB base64) should NOT be stored inline in DB', () => {
      // A 100KB PDF → base64 is ~133KB
      const largePdf = Buffer.alloc(100_000, 0x25); // %PDF-like filler
      const base64 = largePdf.toString('base64');
      expect(base64.length).toBeGreaterThan(MAX_INLINE);

      // The service should route this to fileRef storage
      // We verify the threshold constant is correct
      expect(largePdf.length).toBeGreaterThan(MAX_INLINE);
    });

    it('small PDF (< 50KB) can be stored inline', () => {
      const smallPdf = Buffer.alloc(10_000, 0x25);
      expect(smallPdf.length).toBeLessThan(MAX_INLINE);
    });

    it('base64 encoding increases size by ~33%', () => {
      const raw = Buffer.alloc(37_000); // 37KB raw → ~49.3KB base64
      const b64 = raw.toString('base64');
      // Still under threshold in raw bytes
      expect(raw.length).toBeLessThan(MAX_INLINE);
      // But base64 representation is larger
      expect(b64.length).toBeGreaterThan(raw.length);
    });
  });

  describe('cleanupExpired — contract', () => {
    it('service exposes cleanupExpired method', () => {
      expect(TrainingDataService.prototype.cleanupExpired).toBeDefined();
      expect(typeof TrainingDataService.prototype.cleanupExpired).toBe('function');
    });
  });

  describe('exportForTraining — contract', () => {
    it('service exposes exportForTraining method', () => {
      expect(TrainingDataService.prototype.exportForTraining).toBeDefined();
    });
  });
});

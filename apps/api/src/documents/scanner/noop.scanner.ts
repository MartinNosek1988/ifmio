import { Injectable, Logger } from '@nestjs/common';
import type { IScanner, ScanResult } from './scanner.interface';

/**
 * No-op scanner: always returns clean.
 * Used when AV_SCANNING_ENABLED is false (default).
 */
@Injectable()
export class NoOpScanner implements IScanner {
  private readonly logger = new Logger(NoOpScanner.name);

  async scan(_buffer: Buffer, filename: string): Promise<ScanResult> {
    this.logger.debug(`NoOp scan: ${filename} — skipped (AV disabled)`);
    return { clean: true, durationMs: 0 };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

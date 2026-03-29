import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NoOpScanner } from './noop.scanner';
import type { IScanner, ScanResult } from './scanner.interface';
import type { ScanStatus } from '@prisma/client';

/**
 * Document scanning orchestrator.
 *
 * Feature flag: AV_SCANNING_ENABLED (default: false)
 * - false: documents get status 'skipped' immediately (no scan)
 * - true:  documents start as 'pending_scan', must pass scanner
 *
 * When enabled, the upload flow is:
 *   pending_scan → quarantined (scan in progress) → clean | infected | scan_error
 */
@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly scanner: IScanner;
  private readonly enabled: boolean;

  constructor(private prisma: PrismaService) {
    this.enabled = process.env.AV_SCANNING_ENABLED === 'true';
    // Future: inject ClamAvScanner when enabled
    this.scanner = new NoOpScanner();

    if (this.enabled) {
      this.logger.log('AV scanning ENABLED — documents will be quarantined until scanned');
    } else {
      this.logger.log('AV scanning DISABLED — documents marked as skipped');
    }
  }

  /** Returns the initial scan status for a newly uploaded document. */
  getInitialStatus(): ScanStatus {
    return this.enabled ? 'pending_scan' : 'skipped';
  }

  /** Check if a document is available for download/processing. */
  isAvailable(scanStatus: ScanStatus): boolean {
    return scanStatus === 'clean' || scanStatus === 'skipped';
  }

  /** Scan a single document by ID. Updates DB status. */
  async scanDocument(documentId: string): Promise<ScanResult> {
    // Mark as quarantined
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new Error(`Document ${documentId} not found`);

    await this.prisma.document.update({
      where: { id: documentId },
      data: { scanStatus: 'quarantined' },
    });

    try {
      const buffer = Buffer.alloc(0); // TODO: read from storage when ClamAV is integrated
      const result = await this.scanner.scan(buffer, doc.originalName);

      const newStatus: ScanStatus = result.clean ? 'clean' : 'infected';
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          scanStatus: newStatus,
          scannedAt: new Date(),
        },
      });

      if (!result.clean) {
        this.logger.warn(`INFECTED: document ${documentId} — threat: ${result.threat}`);
      }

      return result;
    } catch (err) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { scanStatus: 'scan_error' },
      });
      this.logger.error(`Scan error for document ${documentId}: ${err}`);
      return { clean: false, error: String(err), durationMs: 0 };
    }
  }

  /** Process all pending documents. Called by cron. */
  async processPending(): Promise<{ scanned: number; infected: number; errors: number }> {
    if (!this.enabled) return { scanned: 0, infected: 0, errors: 0 };

    const pending = await this.prisma.document.findMany({
      where: { scanStatus: { in: ['pending_scan', 'scan_error'] } },
      select: { id: true },
      take: 50, // batch size
    });

    let infected = 0;
    let errors = 0;

    for (const doc of pending) {
      const result = await this.scanDocument(doc.id);
      if (!result.clean && result.threat) infected++;
      if (result.error) errors++;
    }

    return { scanned: pending.length, infected, errors };
  }
}

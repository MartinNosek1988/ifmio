import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageProvider } from '../documents/storage/local.storage';

const TRAINING_RETENTION_DAYS = 180;
const MAX_INLINE_BASE64_BYTES = 50_000; // ~37 KB decoded — anything larger goes to storage

@Injectable()
export class TrainingDataService {
  private readonly logger = new Logger(TrainingDataService.name);

  constructor(
    private prisma: PrismaService,
    private storage: LocalStorageProvider,
  ) {}

  async save(params: {
    tenantId: string;
    dokladId?: string;
    pdfBase64: string;
    confirmedFields: Record<string, any>;
    source: 'claude_vision' | 'manual';
  }): Promise<void> {
    const pdfBuffer = Buffer.from(params.pdfBase64, 'base64');
    const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRAINING_RETENTION_DAYS);

    // Store PDF to file system instead of DB
    let fileRef: string | null = null;
    let imageBase64: string | null = null;

    if (pdfBuffer.length > MAX_INLINE_BASE64_BYTES) {
      // Large file → store on disk, keep only reference in DB
      const key = `training/${params.tenantId}/${randomUUID()}.pdf`;
      await this.storage.save(pdfBuffer, key, 'application/pdf');
      fileRef = key;
      // imageBase64 stays null — no raw PDF in DB
    } else {
      // Small file (e.g. tiny test invoice) — acceptable inline
      imageBase64 = params.pdfBase64;
    }

    await this.prisma.invoiceTrainingSample.upsert({
      where: {
        tenantId_pdfHash: {
          tenantId: params.tenantId,
          pdfHash,
        },
      },
      create: {
        tenantId: params.tenantId,
        dokladId: params.dokladId,
        pdfHash,
        fileRef,
        imageBase64,
        extractedJson: params.confirmedFields,
        source: params.source,
        confirmedAt: new Date(),
        expiresAt,
      },
      update: {
        extractedJson: params.confirmedFields,
        dokladId: params.dokladId ?? undefined,
        confirmedAt: new Date(),
        // Don't update fileRef/imageBase64 — keep existing storage
      },
    });
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.invoiceTrainingSample.count({ where: { tenantId } });
  }

  async exportForTraining(tenantId: string) {
    const samples = await this.prisma.invoiceTrainingSample.findMany({
      where: { tenantId },
      orderBy: { confirmedAt: 'desc' },
      select: {
        id: true,
        fileRef: true,
        imageBase64: true,
        extractedJson: true,
        source: true,
        confirmedAt: true,
      },
    });

    // Resolve fileRef → base64 for training pipeline (reads from storage)
    return Promise.all(samples.map(async (s) => {
      let pdfBase64 = s.imageBase64;
      if (!pdfBase64 && s.fileRef) {
        try {
          const buffer = await this.storage.read(s.fileRef);
          pdfBase64 = buffer.toString('base64');
        } catch {
          this.logger.warn(`Training sample ${s.id}: file not found at ${s.fileRef}`);
          pdfBase64 = null;
        }
      }
      return {
        id: s.id,
        imageBase64: pdfBase64,
        extractedJson: s.extractedJson,
        source: s.source,
        confirmedAt: s.confirmedAt,
      };
    }));
  }

  /**
   * Clean up expired training samples. Called by cron.
   * Deletes the storage file first, then the DB row.
   */
  async cleanupExpired(): Promise<{ deleted: number }> {
    const expired = await this.prisma.invoiceTrainingSample.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true, fileRef: true },
    });

    for (const sample of expired) {
      if (sample.fileRef) {
        try { await this.storage.delete(sample.fileRef); } catch { /* file may already be gone */ }
      }
    }

    if (expired.length > 0) {
      await this.prisma.invoiceTrainingSample.deleteMany({
        where: { id: { in: expired.map(s => s.id) } },
      });
    }

    return { deleted: expired.length };
  }
}

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingDataService {
  constructor(private prisma: PrismaService) {}

  async save(params: {
    tenantId: string;
    dokladId?: string;
    pdfBase64: string;
    confirmedFields: Record<string, any>;
    source: 'claude_vision' | 'manual';
  }): Promise<void> {
    const pdfBuffer = Buffer.from(params.pdfBase64, 'base64');
    const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex');

    // Use first ~1200px-wide portion of pdfBase64 as imageBase64
    // (full rendering to JPEG would require a PDF renderer — store the raw base64 instead,
    //  the training pipeline will handle page-1 extraction)
    const imageBase64 = params.pdfBase64;

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
        imageBase64,
        extractedJson: params.confirmedFields,
        source: params.source,
        confirmedAt: new Date(),
      },
      update: {
        extractedJson: params.confirmedFields,
        dokladId: params.dokladId ?? undefined,
        confirmedAt: new Date(),
      },
    });
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.invoiceTrainingSample.count({ where: { tenantId } });
  }

  async exportForTraining(tenantId: string) {
    return this.prisma.invoiceTrainingSample.findMany({
      where: { tenantId },
      orderBy: { confirmedAt: 'desc' },
      select: {
        id: true,
        imageBase64: true,
        extractedJson: true,
        source: true,
        confirmedAt: true,
      },
    });
  }
}

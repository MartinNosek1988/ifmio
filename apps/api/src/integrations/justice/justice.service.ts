import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { JusticeDocument } from '@prisma/client';

@Injectable()
export class JusticeService {
  private readonly logger = new Logger(JusticeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDocumentsByIco(ico: string): Promise<JusticeDocument[]> {
    return this.prisma.justiceDocument.findMany({
      where: { ico },
      orderBy: { datumPodani: 'desc' },
    });
  }

  // Stub — implementace v dalším sprintu (dataor.justice.cz XML import)
  async importFromDataor(): Promise<void> {
    this.logger.log('JusticeService.importFromDataor — not yet implemented');
  }
}

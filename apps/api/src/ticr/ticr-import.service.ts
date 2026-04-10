import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicrParserService, type TicrRecord } from './ticr-parser.service';

export interface ImportResult {
  registryType: string;
  total: number;
  created: number;
  updated: number;
  errors: number;
  startedAt: string;
  completedAt: string;
}

@Injectable()
export class TicrImportService {
  private readonly logger = new Logger(TicrImportService.name);
  private importing = false;

  constructor(
    private prisma: PrismaService,
    private parser: TicrParserService,
  ) {}

  get isImporting() {
    return this.importing;
  }

  async importFromHtml(
    html: string,
    registryType: 'OZO' | 'RT',
  ): Promise<ImportResult> {
    if (this.importing) throw new Error('Import already running');
    this.importing = true;
    const startedAt = new Date().toISOString();

    try {
      const records = this.parser.parseHtml(html, registryType);
      const result = await this.upsertRecords(records, registryType);
      return { ...result, startedAt, completedAt: new Date().toISOString() };
    } finally {
      this.importing = false;
    }
  }

  async importFromFile(
    filePath: string,
    registryType: 'OZO' | 'RT',
  ): Promise<ImportResult> {
    if (this.importing) throw new Error('Import already running');
    this.importing = true;
    const startedAt = new Date().toISOString();

    try {
      const records = this.parser.parseFile(filePath, registryType);
      const result = await this.upsertRecords(records, registryType);
      return { ...result, startedAt, completedAt: new Date().toISOString() };
    } finally {
      this.importing = false;
    }
  }

  private async upsertRecords(
    records: TicrRecord[],
    registryType: string,
  ): Promise<Omit<ImportResult, 'startedAt' | 'completedAt'>> {
    let created = 0,
      updated = 0,
      errors = 0;
    const batchSize = 100;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          const result = await this.prisma.ticrCredential.upsert({
            where: {
              evidenceNumber_registryType: {
                evidenceNumber: record.evidenceNumber,
                registryType: record.registryType,
              },
            },
            create: {
              ico: record.ico,
              name: record.name,
              address: record.address,
              ticrPersonId: record.ticrPersonId,
              evidenceNumber: record.evidenceNumber,
              validUntil: record.validUntil,
              deviceType: record.deviceType,
              activity: record.activity,
              qualificationRef: record.qualificationRef,
              registryType: record.registryType,
              sourceUrl: record.sourceUrl,
            },
            update: {
              name: record.name,
              address: record.address,
              validUntil: record.validUntil,
              activity: record.activity,
              ico: record.ico,
            },
          });
          // Prisma upsert doesn't tell us if it was create or update
          // We count based on whether importedAt == updatedAt (approximate)
          if (
            Math.abs(
              result.importedAt.getTime() - result.updatedAt.getTime(),
            ) < 1000
          ) {
            created++;
          } else {
            updated++;
          }
        } catch (err) {
          errors++;
          if (errors <= 10) {
            this.logger.warn(
              `Upsert failed for ${record.evidenceNumber}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }

      if (i % 1000 === 0 && i > 0) {
        this.logger.log(`Progress: ${i}/${records.length} records processed`);
      }
    }

    this.logger.log(
      `Import ${registryType}: ${records.length} total, ${created} created, ${updated} updated, ${errors} errors`,
    );
    return { registryType, total: records.length, created, updated, errors };
  }

  async getStats() {
    const [total, ozo, rt, valid, expired] = await Promise.all([
      this.prisma.ticrCredential.count(),
      this.prisma.ticrCredential.count({ where: { registryType: 'OZO' } }),
      this.prisma.ticrCredential.count({ where: { registryType: 'RT' } }),
      this.prisma.ticrCredential.count({
        where: { validUntil: { gt: new Date() } },
      }),
      this.prisma.ticrCredential.count({
        where: { validUntil: { lte: new Date() } },
      }),
    ]);

    const byDeviceType = await this.prisma.ticrCredential.groupBy({
      by: ['deviceType'],
      _count: true,
    });

    return {
      total,
      ozo,
      rt,
      valid,
      expired,
      byDeviceType: byDeviceType.map((g) => ({
        type: g.deviceType,
        count: g._count,
      })),
    };
  }

  async lookup(ico: string) {
    return this.prisma.ticrCredential.findMany({
      where: { ico: ico.padStart(8, '0') },
      orderBy: { validUntil: 'desc' },
    });
  }

  async search(params: {
    deviceType?: string;
    ico?: string;
    search?: string;
    validOnly?: boolean;
    registryType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const where: any = {};

    if (params.deviceType) where.deviceType = params.deviceType;
    if (params.ico) where.ico = params.ico.padStart(8, '0');
    if (params.registryType) where.registryType = params.registryType;
    if (params.validOnly) where.validUntil = { gt: new Date() };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        {
          evidenceNumber: {
            contains: params.search,
            mode: 'insensitive',
          },
        },
        { ico: { contains: params.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.ticrCredential.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticrCredential.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

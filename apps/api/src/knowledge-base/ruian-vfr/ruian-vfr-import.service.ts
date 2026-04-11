import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RuianVfrDownloadService } from './ruian-vfr-download.service'
import { RuianVfrParserService, ParsedObec, ParsedUlice, ParsedAdresniMisto } from './ruian-vfr-parser.service'

const BATCH_SIZE = 1000

@Injectable()
export class RuianVfrImportService {
  private readonly logger = new Logger(RuianVfrImportService.name)
  private isRunning = false

  constructor(
    private prisma: PrismaService,
    private download: RuianVfrDownloadService,
    private parser: RuianVfrParserService,
  ) {}

  get running() { return this.isRunning }

  /** Full import pipeline: download → parse → batch upsert → log */
  async runFullImport(): Promise<{ logId: string; status: string }> {
    if (this.isRunning) {
      this.logger.warn('RÚIAN VFR import already running')
      return { logId: '', status: 'already_running' }
    }

    this.isRunning = true
    const startTime = Date.now()
    const log = await this.prisma.kbRuianImportLog.create({
      data: {
        fileName: 'pending',
        fileDate: new Date(),
        status: 'running',
      },
    })

    try {
      // 1. Download
      this.logger.log('Step 1: Downloading VFR data...')
      const { filePath, dateTag } = await this.download.downloadAndExtract()

      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: { fileName: filePath, fileDate: new Date(`${dateTag.slice(0, 4)}-${dateTag.slice(4, 6)}-${dateTag.slice(6, 8)}`) },
      })

      // 2. Parse & import
      this.logger.log(`Step 2: Parsing ${filePath}...`)
      const isCsv = filePath.endsWith('.csv')
      const stats = await (isCsv
        ? this.importFromCsv(filePath)
        : this.importFromXml(filePath))

      // 3. Update log
      const durationMs = Date.now() - startTime
      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: {
          recordsTotal: stats.total,
          recordsInserted: stats.inserted,
          recordsUpdated: stats.updated,
          durationMs,
          status: 'completed',
        },
      })

      this.logger.log(`RÚIAN VFR import completed in ${Math.round(durationMs / 1000)}s — ${stats.total} records`)

      return { logId: log.id, status: 'completed' }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`RÚIAN VFR import failed: ${errorMsg}`)
      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: { status: 'failed', error: errorMsg, durationMs: Date.now() - startTime },
      })
      return { logId: log.id, status: 'failed' }
    } finally {
      this.isRunning = false
    }
  }

  /** Import from VFR XML — streaming SAX with batched upserts */
  private async importFromXml(filePath: string): Promise<ImportStats> {
    const stats: ImportStats = { total: 0, inserted: 0, updated: 0 }
    const obecBatch: ParsedObec[] = []
    const uliceBatch: ParsedUlice[] = []
    const amBatch: ParsedAdresniMisto[] = []

    await this.parser.parseXml(filePath, {
      onObec: (r) => obecBatch.push(r),
      onUlice: (r) => uliceBatch.push(r),
      onAdresniMisto: (r) => amBatch.push(r),
      onProgress: (n) => this.logger.log(`Parsed ${n} addresses...`),
    })

    // Flush in dependency order: obce → ulice → adresní místa
    this.logger.log(`Flushing ${obecBatch.length} obcí...`)
    for (let i = 0; i < obecBatch.length; i += BATCH_SIZE) {
      await this.upsertObce(obecBatch.slice(i, i + BATCH_SIZE), stats)
    }

    this.logger.log(`Flushing ${uliceBatch.length} ulic...`)
    for (let i = 0; i < uliceBatch.length; i += BATCH_SIZE) {
      await this.upsertUlice(uliceBatch.slice(i, i + BATCH_SIZE), stats)
    }

    this.logger.log(`Flushing ${amBatch.length} adresních míst...`)
    for (let i = 0; i < amBatch.length; i += BATCH_SIZE) {
      await this.upsertAdresniMista(amBatch.slice(i, i + BATCH_SIZE), stats)
    }

    return stats
  }

  /** Import from CSV — line-by-line streaming */
  private async importFromCsv(filePath: string): Promise<ImportStats> {
    const stats: ImportStats = { total: 0, inserted: 0, updated: 0 }
    const obecBatch: ParsedObec[] = []
    const uliceBatch: ParsedUlice[] = []
    const amBatch: ParsedAdresniMisto[] = []

    await this.parser.parseCsv(filePath, {
      onObec: (r) => obecBatch.push(r),
      onUlice: (r) => uliceBatch.push(r),
      onAdresniMisto: (r) => amBatch.push(r),
      onProgress: (n) => this.logger.log(`CSV parsed ${n} addresses...`),
    })

    for (let i = 0; i < obecBatch.length; i += BATCH_SIZE) {
      await this.upsertObce(obecBatch.slice(i, i + BATCH_SIZE), stats)
    }
    for (let i = 0; i < uliceBatch.length; i += BATCH_SIZE) {
      await this.upsertUlice(uliceBatch.slice(i, i + BATCH_SIZE), stats)
    }
    for (let i = 0; i < amBatch.length; i += BATCH_SIZE) {
      await this.upsertAdresniMista(amBatch.slice(i, i + BATCH_SIZE), stats)
    }

    return stats
  }

  // ── Batch upsert methods ──────────────────────────────

  private async upsertObce(batch: ParsedObec[], stats: ImportStats) {
    for (const r of batch) {
      try {
        await this.prisma.kbRuianObec.upsert({
          where: { id: r.id },
          create: { id: r.id, name: r.name, districtCode: r.districtCode },
          update: { name: r.name, districtCode: r.districtCode },
        })
        stats.inserted++
        stats.total++
      } catch (err) {
        this.logger.warn(`Obec upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  private async upsertUlice(batch: ParsedUlice[], stats: ImportStats) {
    for (const r of batch) {
      try {
        await this.prisma.kbRuianUlice.upsert({
          where: { id: r.id },
          create: { id: r.id, name: r.name, obecId: r.obecId },
          update: { name: r.name, obecId: r.obecId },
        })
        stats.inserted++
        stats.total++
      } catch (err) {
        this.logger.warn(`Ulice upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  private async upsertAdresniMista(batch: ParsedAdresniMisto[], stats: ImportStats) {
    for (const r of batch) {
      try {
        await this.prisma.kbRuianAdresniMisto.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            houseNumber: r.houseNumber,
            orientationNumber: r.orientationNumber,
            orientationNumberLetter: r.orientationNumberLetter,
            postalCode: r.postalCode,
            obecId: r.obecId,
            uliceId: r.uliceId,
            stavebniObjektId: r.stavebniObjektId,
            castObceNazev: r.castObceNazev,
          },
          update: {
            houseNumber: r.houseNumber,
            orientationNumber: r.orientationNumber,
            orientationNumberLetter: r.orientationNumberLetter,
            postalCode: r.postalCode,
            obecId: r.obecId,
            uliceId: r.uliceId,
            stavebniObjektId: r.stavebniObjektId,
            castObceNazev: r.castObceNazev,
          },
        })
        stats.inserted++
        stats.total++
      } catch (err) {
        this.logger.warn(`AdresniMisto upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  /** Get latest import log */
  async getLatestLog() {
    return this.prisma.kbRuianImportLog.findFirst({
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Get table counts */
  async getCounts() {
    const [obec, ulice, stavebniObjekt, adresniMisto] = await Promise.all([
      this.prisma.kbRuianObec.count(),
      this.prisma.kbRuianUlice.count(),
      this.prisma.kbRuianStavebniObjekt.count(),
      this.prisma.kbRuianAdresniMisto.count(),
    ])
    return { obec, ulice, stavebniObjekt, adresniMisto }
  }
}

interface ImportStats {
  total: number
  inserted: number
  updated: number
}

import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RuianVfrDownloadService } from './ruian-vfr-download.service'
import { RuianVfrParserService, type FlushBatch } from './ruian-vfr-parser.service'

const BATCH_SIZE = 1000
const ESTIMATED_TOTAL = 2_900_000
const LOG_EVERY = 10_000
const PERSIST_EVERY = 50_000

export interface ImportProgress {
  isRunning: boolean
  phase: 'idle' | 'downloading' | 'parsing' | 'flushing_adresy' | 'completed' | 'failed'
  recordsParsed: number
  recordsFlushed: number
  totalEstimated: number
  progressPercent: number
  startedAt: number | null
  estimatedSecondsRemaining: number | null
  error?: string
}

@Injectable()
export class RuianVfrImportService {
  private readonly logger = new Logger(RuianVfrImportService.name)
  private progress: ImportProgress = {
    isRunning: false, phase: 'idle', recordsParsed: 0, recordsFlushed: 0,
    totalEstimated: ESTIMATED_TOTAL, progressPercent: 0,
    startedAt: null, estimatedSecondsRemaining: null,
  }

  constructor(
    private prisma: PrismaService,
    private download: RuianVfrDownloadService,
    private parser: RuianVfrParserService,
  ) {}

  get running() { return this.progress.isRunning }
  getProgress(): ImportProgress { return { ...this.progress } }

  private updateProgress(partial: Partial<ImportProgress>) {
    Object.assign(this.progress, partial)
    const isCompleted = this.progress.phase === 'completed'
    if (this.progress.totalEstimated > 0) {
      const calc = Math.round((this.progress.recordsFlushed / this.progress.totalEstimated) * 100)
      this.progress.progressPercent = isCompleted ? 100 : Math.min(calc, 99)
    }
    if (this.progress.startedAt && this.progress.recordsFlushed > 0) {
      const elapsed = (Date.now() - this.progress.startedAt) / 1000
      const rate = this.progress.recordsFlushed / elapsed
      const remaining = this.progress.totalEstimated - this.progress.recordsFlushed
      this.progress.estimatedSecondsRemaining = rate > 0 ? Math.round(remaining / rate) : null
    }
  }

  async runFullImport(): Promise<{ logId: string; status: string }> {
    if (this.progress.isRunning) {
      this.logger.warn('RÚIAN VFR import already running')
      return { logId: '', status: 'already_running' }
    }

    this.updateProgress({
      isRunning: true, phase: 'downloading', recordsParsed: 0, recordsFlushed: 0,
      progressPercent: 0, startedAt: Date.now(), estimatedSecondsRemaining: null, error: undefined,
    })

    const log = await this.prisma.kbRuianImportLog.create({
      data: { fileName: 'pending', fileDate: new Date(), status: 'running' },
    })

    try {
      this.logger.log('Step 1: Downloading VFR data...')
      const { filePath, dateTag } = await this.download.downloadAndExtract()
      this.logger.log(`Step 1 done: ${filePath}`)

      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: { fileName: filePath, fileDate: new Date(`${dateTag.slice(0, 4)}-${dateTag.slice(4, 6)}-${dateTag.slice(6, 8)}`) },
      })

      this.updateProgress({ phase: 'parsing' })
      this.logger.log(`Step 2: Streaming parse + import ${filePath}...`)

      const isCsv = filePath.endsWith('.csv')
      const stats = await this.streamImport(filePath, log.id, isCsv ? 'csv' : 'xml')

      const durationMs = Date.now() - (this.progress.startedAt ?? Date.now())
      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: { recordsTotal: stats.total, recordsInserted: stats.inserted, recordsUpdated: stats.updated, durationMs, status: 'completed' },
      })

      this.updateProgress({ phase: 'completed', progressPercent: 100, isRunning: false, estimatedSecondsRemaining: 0 })
      this.logger.log(`Import completed in ${Math.round(durationMs / 1000)}s — ${stats.total} records (${stats.inserted} inserted)`)
      return { logId: log.id, status: 'completed' }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Import failed: ${errorMsg}`, err instanceof Error ? err.stack : '')
      const durationMs = Date.now() - (this.progress.startedAt ?? Date.now())
      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: { status: 'failed', error: errorMsg.slice(0, 1000), durationMs },
      }).catch(e => this.logger.error(`Failed to update log: ${e}`))
      this.updateProgress({ phase: 'failed', isRunning: false, error: errorMsg })
      return { logId: log.id, status: 'failed' }
    }
  }

  /**
   * Streaming import with backpressure.
   * Each flush batch contains:
   *   - New obce (first-seen) — flushed first for FK safety
   *   - New ulice (first-seen) — flushed second for FK safety
   *   - Addresses — flushed last, FK references are guaranteed to exist
   */
  private async streamImport(filePath: string, logId: string, format: 'xml' | 'csv'): Promise<ImportStats> {
    const stats: ImportStats = { total: 0, inserted: 0, updated: 0 }
    let lastLogAt = 0
    let lastPersistAt = 0

    const onFlushBatch = async (batch: FlushBatch) => {
      // 1. Obce first (FK parent)
      for (const r of batch.obce) {
        try {
          await this.prisma.kbRuianObec.upsert({
            where: { id: r.id },
            create: { id: r.id, name: r.name, districtCode: r.districtCode },
            update: { name: r.name, districtCode: r.districtCode },
          })
          stats.inserted++
        } catch (err) {
          this.logger.warn(`Obec upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
        }
        stats.total++
      }

      // 2. Ulice second (FK references obec)
      for (const r of batch.ulice) {
        try {
          await this.prisma.kbRuianUlice.upsert({
            where: { id: r.id },
            create: { id: r.id, name: r.name, obecId: r.obecId },
            update: { name: r.name, obecId: r.obecId },
          })
          stats.inserted++
        } catch (err) {
          this.logger.warn(`Ulice upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
        }
        stats.total++
      }

      // 3. Addresses last (FK references obec + ulice)
      this.updateProgress({ phase: 'flushing_adresy' })
      for (const r of batch.adresy) {
        try {
          await this.prisma.kbRuianAdresniMisto.upsert({
            where: { id: r.id },
            create: {
              id: r.id, houseNumber: r.houseNumber, orientationNumber: r.orientationNumber,
              orientationNumberLetter: r.orientationNumberLetter, postalCode: r.postalCode,
              obecId: r.obecId, uliceId: r.uliceId, stavebniObjektId: r.stavebniObjektId,
              castObceNazev: r.castObceNazev,
            },
            update: {
              houseNumber: r.houseNumber, orientationNumber: r.orientationNumber,
              orientationNumberLetter: r.orientationNumberLetter, postalCode: r.postalCode,
              obecId: r.obecId, uliceId: r.uliceId, stavebniObjektId: r.stavebniObjektId,
              castObceNazev: r.castObceNazev,
            },
          })
          stats.inserted++
        } catch (err) {
          this.logger.warn(`AM upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
        }
        stats.total++
      }

      // Throttled logging + progress
      if (stats.total - lastLogAt >= LOG_EVERY) {
        lastLogAt = stats.total
        this.updateProgress({ recordsFlushed: stats.total })
        this.logger.log(`Flushed ${stats.total} records (${stats.inserted} inserted)...`)
      }
      if (stats.total - lastPersistAt >= PERSIST_EVERY) {
        lastPersistAt = stats.total
        await this.prisma.kbRuianImportLog.update({
          where: { id: logId },
          data: { recordsTotal: stats.total, recordsInserted: stats.inserted },
        }).catch(err => this.logger.warn(`Failed to persist progress: ${err instanceof Error ? err.message : err}`))
      }
    }

    const callbacks = {
      onFlushBatch,
      batchSize: BATCH_SIZE,
      onProgress: (n: number) => {
        this.updateProgress({ recordsParsed: n })
        this.logger.log(`Parsed ${n} addresses...`)
      },
    }

    if (format === 'xml') {
      await this.parser.parseXml(filePath, callbacks)
    } else {
      await this.parser.parseCsv(filePath, callbacks)
    }

    this.updateProgress({ recordsFlushed: stats.total })
    this.logger.log(`Import stream done: ${stats.total} total, ${stats.inserted} inserted`)
    return stats
  }

  async getLatestLog() {
    return this.prisma.kbRuianImportLog.findFirst({ orderBy: { createdAt: 'desc' } })
  }

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

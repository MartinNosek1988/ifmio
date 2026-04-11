import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RuianVfrDownloadService } from './ruian-vfr-download.service'
import { RuianVfrParserService, ParsedObec, ParsedUlice, ParsedAdresniMisto } from './ruian-vfr-parser.service'

const BATCH_SIZE = 1000
const ESTIMATED_TOTAL = 2_900_000
const LOG_EVERY = 10_000
const PERSIST_EVERY = 50_000

export interface ImportProgress {
  isRunning: boolean
  phase: 'idle' | 'downloading' | 'parsing' | 'flushing_obce' | 'flushing_ulice' | 'completed' | 'failed'
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
      const stats = await (isCsv
        ? this.streamImport(filePath, log.id, 'csv')
        : this.streamImport(filePath, log.id, 'xml'))

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
   * Obce/Ulice collected in memory (~6k + ~50k = tiny).
   * Adresní místa flushed via onAdresniMistoBatch callback — parser pauses
   * the read stream during DB writes so memory stays constant.
   */
  private async streamImport(filePath: string, logId: string, format: 'xml' | 'csv'): Promise<ImportStats> {
    const stats: ImportStats = { total: 0, inserted: 0, updated: 0 }
    const obecBatch: ParsedObec[] = []
    const uliceBatch: ParsedUlice[] = []
    let lastLogAt = 0
    let lastPersistAt = 0

    const onAdresniMistoBatch = async (batch: ParsedAdresniMisto[]) => {
      for (const r of batch) {
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

      // Throttled progress updates
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
      onObec: (r: ParsedObec) => obecBatch.push(r),
      onUlice: (r: ParsedUlice) => uliceBatch.push(r),
      onAdresniMistoBatch,
      batchSize: BATCH_SIZE,
      onProgress: (n: number) => {
        this.updateProgress({ recordsParsed: n })
        this.logger.log(`Parsed ${n} addresses...`)
      },
    }

    // Parse — addresses are flushed incrementally via backpressure
    if (format === 'xml') {
      await this.parser.parseXml(filePath, callbacks)
    } else {
      await this.parser.parseCsv(filePath, callbacks)
    }

    this.logger.log(`Parse+flush done: ${obecBatch.length} obcí, ${uliceBatch.length} ulic, ${stats.total} AM flushed`)

    // Flush obce (tiny — ~6k)
    this.updateProgress({ phase: 'flushing_obce' })
    this.logger.log(`Flushing ${obecBatch.length} obcí...`)
    for (let i = 0; i < obecBatch.length; i += BATCH_SIZE) {
      for (const r of obecBatch.slice(i, i + BATCH_SIZE)) {
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
    }

    // Flush ulice (small — ~50k)
    this.updateProgress({ phase: 'flushing_ulice', recordsFlushed: stats.total })
    this.logger.log(`Flushing ${uliceBatch.length} ulic...`)
    for (let i = 0; i < uliceBatch.length; i += BATCH_SIZE) {
      for (const r of uliceBatch.slice(i, i + BATCH_SIZE)) {
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
    }

    this.updateProgress({ recordsFlushed: stats.total })
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

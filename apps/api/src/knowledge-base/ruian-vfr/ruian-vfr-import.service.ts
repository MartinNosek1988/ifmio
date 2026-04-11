import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RuianVfrDownloadService } from './ruian-vfr-download.service'
import { RuianVfrParserService, ParsedObec, ParsedUlice, ParsedAdresniMisto } from './ruian-vfr-parser.service'

const BATCH_SIZE = 500
const ESTIMATED_TOTAL_ADDRESSES = 2_900_000

export interface ImportProgress {
  isRunning: boolean
  phase: 'idle' | 'downloading' | 'parsing' | 'flushing_obce' | 'flushing_ulice' | 'flushing_adresy' | 'completed' | 'failed'
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
    totalEstimated: ESTIMATED_TOTAL_ADDRESSES, progressPercent: 0,
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
      const calculated = Math.round((this.progress.recordsFlushed / this.progress.totalEstimated) * 100)
      this.progress.progressPercent = isCompleted ? 100 : Math.min(calculated, 99)
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
      // 1. Download
      this.logger.log('Step 1: Downloading VFR data...')
      const { filePath, dateTag } = await this.download.downloadAndExtract()
      this.logger.log(`Step 1 done: ${filePath}`)

      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: { fileName: filePath, fileDate: new Date(`${dateTag.slice(0, 4)}-${dateTag.slice(4, 6)}-${dateTag.slice(6, 8)}`) },
      })

      // 2. Parse & import — streaming with incremental flush
      this.updateProgress({ phase: 'parsing' })
      this.logger.log(`Step 2: Parsing and importing ${filePath}...`)
      const isCsv = filePath.endsWith('.csv')
      const stats = await (isCsv
        ? this.streamImportCsv(filePath, log.id)
        : this.streamImportXml(filePath, log.id))

      // 3. Final
      const durationMs = Date.now() - (this.progress.startedAt ?? Date.now())
      await this.prisma.kbRuianImportLog.update({
        where: { id: log.id },
        data: { recordsTotal: stats.total, recordsInserted: stats.inserted, recordsUpdated: stats.updated, durationMs, status: 'completed' },
      })

      this.updateProgress({ phase: 'completed', progressPercent: 100, isRunning: false, estimatedSecondsRemaining: 0 })
      this.logger.log(`RÚIAN VFR import completed in ${Math.round(durationMs / 1000)}s — ${stats.total} records`)
      return { logId: log.id, status: 'completed' }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`RÚIAN VFR import failed: ${errorMsg}`, err instanceof Error ? err.stack : '')
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
   * Stream-import XML: parse + flush incrementally.
   * Obce and ulice are collected (small — ~6k + ~50k), adresní místa flushed every BATCH_SIZE.
   */
  private async streamImportXml(filePath: string, logId: string): Promise<ImportStats> {
    const stats: ImportStats = { total: 0, inserted: 0, updated: 0 }
    const obecBatch: ParsedObec[] = []
    const uliceBatch: ParsedUlice[] = []
    let amBuffer: ParsedAdresniMisto[] = []

    // We need a way to pause the stream while flushing. Use a resolve/reject queue.
    let flushResolve: (() => void) | null = null
    let flushError: Error | null = null

    const flushAmBuffer = async () => {
      if (amBuffer.length === 0) return
      const batch = amBuffer
      amBuffer = []
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
          stats.total++
        } catch (err) {
          this.logger.warn(`AM upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
          stats.total++
        }
      }
      this.updateProgress({ recordsFlushed: stats.total, phase: 'flushing_adresy' })
      if (stats.total % 10000 < BATCH_SIZE) {
        this.logger.log(`Flushed ${stats.total} records...`)
      }
      if (stats.total % 50000 < BATCH_SIZE) {
        await this.prisma.kbRuianImportLog.update({
          where: { id: logId },
          data: { recordsTotal: stats.total, recordsInserted: stats.inserted },
        }).catch(err => this.logger.warn(`Failed to persist progress: ${err instanceof Error ? err.message : err}`))
      }
    }

    // Phase 1: Parse XML — collect obce/ulice, stream-flush addresses
    this.logger.log('Phase 1: Parsing XML (streaming)...')
    await this.parser.parseXml(filePath, {
      onObec: (r) => obecBatch.push(r),
      onUlice: (r) => uliceBatch.push(r),
      onAdresniMisto: (r) => {
        amBuffer.push(r)
        this.updateProgress({ recordsParsed: this.progress.recordsParsed + 1 })
      },
      onProgress: (n) => {
        this.logger.log(`Parsed ${n} addresses...`)
      },
    })
    this.logger.log(`Parse done: ${obecBatch.length} obcí, ${uliceBatch.length} ulic, buffer ${amBuffer.length} AM`)

    // Phase 2: Flush obce (small)
    this.updateProgress({ phase: 'flushing_obce', totalEstimated: obecBatch.length + uliceBatch.length + this.progress.recordsParsed })
    this.logger.log(`Flushing ${obecBatch.length} obcí...`)
    for (let i = 0; i < obecBatch.length; i += BATCH_SIZE) {
      await this.upsertObce(obecBatch.slice(i, i + BATCH_SIZE), stats)
      this.updateProgress({ recordsFlushed: stats.total })
    }

    // Phase 3: Flush ulice (small)
    this.updateProgress({ phase: 'flushing_ulice' })
    this.logger.log(`Flushing ${uliceBatch.length} ulic...`)
    for (let i = 0; i < uliceBatch.length; i += BATCH_SIZE) {
      await this.upsertUlice(uliceBatch.slice(i, i + BATCH_SIZE), stats)
      this.updateProgress({ recordsFlushed: stats.total })
    }

    // Phase 4: Flush remaining AM buffer
    this.updateProgress({ phase: 'flushing_adresy' })
    this.logger.log(`Flushing ${amBuffer.length} remaining adresních míst...`)
    // Process in smaller chunks to limit memory
    while (amBuffer.length > 0) {
      const chunk = amBuffer.splice(0, BATCH_SIZE)
      for (const r of chunk) {
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
          stats.total++
        } catch (err) {
          this.logger.warn(`AM upsert failed: ${err instanceof Error ? err.message : err}`)
          stats.total++
        }
      }
      this.updateProgress({ recordsFlushed: stats.total })
      if (stats.total % 10000 < BATCH_SIZE) {
        this.logger.log(`Flushed ${stats.total} records...`)
      }
      if (stats.total % 50000 < BATCH_SIZE) {
        await this.prisma.kbRuianImportLog.update({
          where: { id: logId },
          data: { recordsTotal: stats.total, recordsInserted: stats.inserted },
        }).catch(err => this.logger.warn(`Failed to persist progress: ${err instanceof Error ? err.message : err}`))
      }
    }

    return stats
  }

  /** Stream-import CSV */
  private async streamImportCsv(filePath: string, logId: string): Promise<ImportStats> {
    const stats: ImportStats = { total: 0, inserted: 0, updated: 0 }
    const obecBatch: ParsedObec[] = []
    const uliceBatch: ParsedUlice[] = []
    const amBatch: ParsedAdresniMisto[] = []

    await this.parser.parseCsv(filePath, {
      onObec: (r) => obecBatch.push(r),
      onUlice: (r) => uliceBatch.push(r),
      onAdresniMisto: (r) => amBatch.push(r),
      onProgress: (n) => {
        this.updateProgress({ recordsParsed: n })
        this.logger.log(`CSV parsed ${n} addresses...`)
      },
    })

    const totalRecords = obecBatch.length + uliceBatch.length + amBatch.length
    this.updateProgress({ totalEstimated: totalRecords })

    this.updateProgress({ phase: 'flushing_obce' })
    for (let i = 0; i < obecBatch.length; i += BATCH_SIZE) {
      await this.upsertObce(obecBatch.slice(i, i + BATCH_SIZE), stats)
      this.updateProgress({ recordsFlushed: stats.total })
    }

    this.updateProgress({ phase: 'flushing_ulice' })
    for (let i = 0; i < uliceBatch.length; i += BATCH_SIZE) {
      await this.upsertUlice(uliceBatch.slice(i, i + BATCH_SIZE), stats)
      this.updateProgress({ recordsFlushed: stats.total })
    }

    this.updateProgress({ phase: 'flushing_adresy' })
    for (let i = 0; i < amBatch.length; i += BATCH_SIZE) {
      await this.upsertAdresniMista(amBatch.slice(i, i + BATCH_SIZE), stats)
      this.updateProgress({ recordsFlushed: stats.total })
      if (stats.total % 50000 < BATCH_SIZE) {
        await this.prisma.kbRuianImportLog.update({
          where: { id: logId },
          data: { recordsTotal: stats.total, recordsInserted: stats.inserted },
        }).catch(err => this.logger.warn(`Failed to persist progress: ${err instanceof Error ? err.message : err}`))
      }
    }

    return stats
  }

  // ── Batch upsert helpers ──────────────────────────────

  private async upsertObce(batch: ParsedObec[], stats: ImportStats) {
    for (const r of batch) {
      try {
        await this.prisma.kbRuianObec.upsert({
          where: { id: r.id },
          create: { id: r.id, name: r.name, districtCode: r.districtCode },
          update: { name: r.name, districtCode: r.districtCode },
        })
        stats.inserted++; stats.total++
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
        stats.inserted++; stats.total++
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
        stats.inserted++; stats.total++
      } catch (err) {
        this.logger.warn(`AM upsert failed for ${r.id}: ${err instanceof Error ? err.message : err}`)
      }
    }
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

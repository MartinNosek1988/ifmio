import { Injectable, Logger } from '@nestjs/common'
import { createWriteStream, existsSync, mkdirSync, createReadStream, readdirSync, renameSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { createUnzip } from 'zlib'
import { tmpdir } from 'os'

const VFR_DIR = join(tmpdir(), 'vfr')

// Source 1: VFR speciální — kompletní adresní místa celé ČR (~300 MB ZIP)
const VFR_SPECIAL_BASE = 'https://vdp.cuzk.gov.cz/vdp/ruian/vymennyformatspecialni/stahni'

// Source 2: VFR archiv na services.cuzk.gov.cz — CSV adresní místa
const VFR_ARCHIVE_CSV = 'https://services.cuzk.gov.cz/vfr/ruian/epsg5514/ad-csv'

// Source 3: Per-obec CSV z nahlizenidokn.cuzk.cz (fallback — vždy funguje)
const NAHLIDNI_CSV = 'https://nahlizenidokn.cuzk.cz/StahniAdresniMistaRUIAN.aspx'

export interface VfrDownloadResult {
  filePath: string
  dateTag: string
}

@Injectable()
export class RuianVfrDownloadService {
  private readonly logger = new Logger(RuianVfrDownloadService.name)

  /** Compute dateTag = last day of previous month, YYYYMMDD */
  getDateTag(now = new Date()): string {
    const d = new Date(now.getFullYear(), now.getMonth(), 0) // day 0 = last day of prev month
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}${mm}${dd}`
  }

  /** Download VFR data — tries 3 sources in order */
  async downloadAndExtract(): Promise<VfrDownloadResult> {
    if (!existsSync(VFR_DIR)) mkdirSync(VFR_DIR, { recursive: true })
    const dateTag = this.getDateTag()

    // Source 1: VFR XML speciální (ST_UADS)
    try {
      const result = await this.tryVfrXml(dateTag)
      if (result) return result
    } catch (err) {
      this.logger.warn(`Source 1 (VFR XML) failed: ${err instanceof Error ? err.message : err}`)
    }

    // Source 2: VFR archiv CSV (services.cuzk.gov.cz)
    try {
      const result = await this.tryArchiveCsv(dateTag)
      if (result) return result
    } catch (err) {
      this.logger.warn(`Source 2 (Archive CSV) failed: ${err instanceof Error ? err.message : err}`)
    }

    // Source 3: Per-obec CSV z nahlizenidokn.cuzk.cz (always works)
    this.logger.log('Trying Source 3: nahlizenidokn.cuzk.cz CSV')
    return this.tryNahlidniCsv(dateTag)
  }

  /** Source 1: VFR speciální XML — ST_UADS. Extracts into per-date subdir. */
  private async tryVfrXml(dateTag: string): Promise<VfrDownloadResult | null> {
    const extractDir = join(VFR_DIR, `xml_${dateTag}`)
    const expectedXml = join(extractDir, `${dateTag}_ST_UADS.xml`)

    if (existsSync(expectedXml)) {
      this.logger.log(`VFR XML already exists: ${expectedXml}`)
      return { filePath: expectedXml, dateTag }
    }

    if (!existsSync(extractDir)) mkdirSync(extractDir, { recursive: true })

    const zipPath = join(VFR_DIR, `${dateTag}_ST_UADS.xml.zip`)
    const url = `${VFR_SPECIAL_BASE}/${dateTag}_ST_UADS`
    this.logger.log(`Source 1: downloading VFR XML from ${url}`)

    const res = await fetch(url, { headers: { Accept: 'application/zip' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('Empty response body')

    await this.streamToFile(res.body, zipPath)
    this.logger.log(`VFR ZIP downloaded: ${zipPath}`)

    await this.extractZip(zipPath, extractDir)

    // Find extracted XML — scoped to per-date dir, filter by dateTag
    const xmlFiles = readdirSync(extractDir).filter(f => f.endsWith('.xml') && f.includes(dateTag))
    if (xmlFiles.length > 0) {
      const extracted = join(extractDir, xmlFiles[0])
      this.logger.log(`VFR XML extracted: ${extracted}`)
      return { filePath: extracted, dateTag }
    }

    throw new Error('ZIP extracted but no XML found')
  }

  /** Source 2: VFR archiv CSV — services.cuzk.gov.cz/vfr/ruian/epsg5514/ad-csv/ */
  private async tryArchiveCsv(dateTag: string): Promise<VfrDownloadResult | null> {
    const canonicalPath = join(VFR_DIR, `${dateTag}_archive_adresy.csv`)
    if (existsSync(canonicalPath)) {
      this.logger.log(`Archive CSV already exists: ${canonicalPath}`)
      return { filePath: canonicalPath, dateTag }
    }

    const extractDir = join(VFR_DIR, `csv_${dateTag}`)
    if (!existsSync(extractDir)) mkdirSync(extractDir, { recursive: true })

    const urls = [
      `${VFR_ARCHIVE_CSV}/${dateTag}_ST_UADR.csv.zip`,
      `${VFR_ARCHIVE_CSV}/${dateTag}_AD.csv.zip`,
    ]

    for (const url of urls) {
      this.logger.log(`Source 2: trying ${url}`)
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        if (!res.body) continue

        const zipPath = join(VFR_DIR, `archive_${dateTag}.zip`)
        await this.streamToFile(res.body, zipPath)
        await this.extractZip(zipPath, extractDir)

        const csvFiles = readdirSync(extractDir).filter(f => f.endsWith('.csv'))
        if (csvFiles.length > 0) {
          const extracted = join(extractDir, csvFiles[0])
          // Rename to canonical path for cache hit on next run
          renameSync(extracted, canonicalPath)
          this.logger.log(`Archive CSV extracted and cached: ${canonicalPath}`)
          return { filePath: canonicalPath, dateTag }
        }
      } catch {
        continue
      }
    }

    throw new Error('No CSV found in VFR archive')
  }

  /** Source 3: nahlizenidokn.cuzk.cz — per-obec CSV (always available) */
  private async tryNahlidniCsv(dateTag: string): Promise<VfrDownloadResult> {
    const csvPath = join(VFR_DIR, `${dateTag}_nahlidni_adresy.csv`)
    if (existsSync(csvPath)) {
      this.logger.log(`Nahlidni CSV already exists: ${csvPath}`)
      return { filePath: csvPath, dateTag }
    }

    this.logger.log(`Source 3: downloading from ${NAHLIDNI_CSV}`)
    const res = await fetch(NAHLIDNI_CSV)
    if (!res.ok) throw new Error(`Nahlidni download failed: HTTP ${res.status}`)
    if (!res.body) throw new Error('Empty response body')

    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('zip') || contentType.includes('octet-stream')) {
      const extractDir = join(VFR_DIR, `nahlidni_${dateTag}`)
      if (!existsSync(extractDir)) mkdirSync(extractDir, { recursive: true })

      const zipPath = join(VFR_DIR, `nahlidni_${dateTag}.zip`)
      await this.streamToFile(res.body, zipPath)
      await this.extractZip(zipPath, extractDir)

      const csvFiles = readdirSync(extractDir).filter(f => f.endsWith('.csv'))
      if (csvFiles.length === 0) throw new Error('No CSV files found after extraction')

      const extracted = join(extractDir, csvFiles[0])
      renameSync(extracted, csvPath)
      this.logger.log(`Nahlidni CSV extracted and cached: ${csvPath}`)
      return { filePath: csvPath, dateTag }
    }

    // Direct CSV or HTML response — validate content
    if (contentType.includes('html')) {
      throw new Error(`Nahlidni returned HTML instead of CSV (content-type: ${contentType})`)
    }

    await this.streamToFile(res.body, csvPath)

    // Sanity check: first line should contain CSV-like headers
    const { readFileSync } = await import('fs')
    const firstLine = readFileSync(csvPath, 'utf-8').split('\n')[0] || ''
    if (!firstLine.includes(';') && !firstLine.includes(',')) {
      const { unlinkSync } = await import('fs')
      unlinkSync(csvPath)
      throw new Error(`Downloaded file is not CSV (first line: ${firstLine.slice(0, 100)})`)
    }

    this.logger.log(`Nahlidni CSV downloaded: ${csvPath}`)
    return { filePath: csvPath, dateTag }
  }

  /** Stream response body to file */
  private async streamToFile(body: ReadableStream, filePath: string): Promise<void> {
    const writer = createWriteStream(filePath)
    const { Readable } = await import('stream')
    await pipeline(Readable.fromWeb(body as any), writer)
  }

  /** Extract ZIP using system tools */
  private async extractZip(zipPath: string, destDir: string): Promise<void> {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`)
    } catch {
      try {
        await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`)
      } catch (e2) {
        if (zipPath.endsWith('.gz')) {
          const outPath = zipPath.replace('.gz', '')
          await pipeline(
            createReadStream(zipPath),
            createUnzip(),
            createWriteStream(outPath),
          )
        } else {
          throw new Error(`Cannot extract ${zipPath}: ${e2 instanceof Error ? e2.message : e2}`)
        }
      }
    }
  }

  /** Clean up downloaded files */
  async cleanup(): Promise<void> {
    const { rmSync } = await import('fs')
    if (existsSync(VFR_DIR)) {
      rmSync(VFR_DIR, { recursive: true, force: true })
      this.logger.log('VFR temp directory cleaned up')
    }
  }

  getVfrDir(): string {
    return VFR_DIR
  }
}

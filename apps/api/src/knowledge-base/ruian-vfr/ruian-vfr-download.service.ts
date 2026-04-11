import { Injectable, Logger } from '@nestjs/common'
import { createWriteStream, existsSync, mkdirSync, createReadStream } from 'fs'
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
  async downloadAndExtract(): Promise<{ xmlPath: string; zipPath: string; dateTag: string }> {
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

  /** Source 1: VFR speciální XML — ST_UADS */
  private async tryVfrXml(dateTag: string): Promise<{ xmlPath: string; zipPath: string; dateTag: string } | null> {
    const zipPath = join(VFR_DIR, `${dateTag}_ST_UADS.xml.zip`)
    const xmlPath = join(VFR_DIR, `${dateTag}_ST_UADS.xml`)

    if (existsSync(xmlPath)) {
      this.logger.log(`VFR XML already exists: ${xmlPath}`)
      return { xmlPath, zipPath, dateTag }
    }

    const url = `${VFR_SPECIAL_BASE}/${dateTag}_ST_UADS`
    this.logger.log(`Source 1: downloading VFR XML from ${url}`)

    const res = await fetch(url, { headers: { Accept: 'application/zip' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('Empty response body')

    await this.streamToFile(res.body, zipPath)
    this.logger.log(`VFR ZIP downloaded: ${zipPath}`)

    await this.extractZip(zipPath, VFR_DIR)

    // Find the extracted XML
    const { readdirSync } = await import('fs')
    const xmlFiles = readdirSync(VFR_DIR).filter(f => f.endsWith('.xml') && f.includes('UADS'))
    if (xmlFiles.length > 0) {
      const extracted = join(VFR_DIR, xmlFiles[0])
      this.logger.log(`VFR XML extracted: ${extracted}`)
      return { xmlPath: extracted, zipPath, dateTag }
    }

    if (existsSync(xmlPath)) return { xmlPath, zipPath, dateTag }
    throw new Error('ZIP extracted but no XML found')
  }

  /** Source 2: VFR archiv CSV — services.cuzk.gov.cz/vfr/ruian/epsg5514/ad-csv/ */
  private async tryArchiveCsv(dateTag: string): Promise<{ xmlPath: string; zipPath: string; dateTag: string } | null> {
    const csvPath = join(VFR_DIR, `${dateTag}_archive_adresy.csv`)
    if (existsSync(csvPath)) {
      this.logger.log(`Archive CSV already exists: ${csvPath}`)
      return { xmlPath: csvPath, zipPath: '', dateTag }
    }

    // Try date-tagged ZIP first, then try listing the directory
    const zipName = `${dateTag}_ST_UADR.csv.zip`
    const urls = [
      `${VFR_ARCHIVE_CSV}/${zipName}`,
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
        await this.extractZip(zipPath, VFR_DIR)

        const { readdirSync } = await import('fs')
        const csvFiles = readdirSync(VFR_DIR).filter(f => f.endsWith('.csv'))
        if (csvFiles.length > 0) {
          const extracted = join(VFR_DIR, csvFiles[0])
          this.logger.log(`Archive CSV extracted: ${extracted}`)
          return { xmlPath: extracted, zipPath, dateTag }
        }
      } catch {
        continue
      }
    }

    throw new Error('No CSV found in VFR archive')
  }

  /** Source 3: nahlizenidokn.cuzk.cz — per-obec CSV (always available) */
  private async tryNahlidniCsv(dateTag: string): Promise<{ xmlPath: string; zipPath: string; dateTag: string }> {
    const csvPath = join(VFR_DIR, `${dateTag}_nahlidni_adresy.csv`)
    if (existsSync(csvPath)) {
      this.logger.log(`Nahlidni CSV already exists: ${csvPath}`)
      return { xmlPath: csvPath, zipPath: '', dateTag }
    }

    this.logger.log(`Source 3: downloading from ${NAHLIDNI_CSV}`)
    const res = await fetch(NAHLIDNI_CSV)
    if (!res.ok) throw new Error(`Nahlidni download failed: HTTP ${res.status}`)
    if (!res.body) throw new Error('Empty response body')

    // Check content type — might be ZIP or direct CSV
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('zip') || contentType.includes('octet-stream')) {
      const zipPath = join(VFR_DIR, `nahlidni_${dateTag}.zip`)
      await this.streamToFile(res.body, zipPath)
      await this.extractZip(zipPath, VFR_DIR)

      const { readdirSync } = await import('fs')
      const csvFiles = readdirSync(VFR_DIR).filter(f => f.endsWith('.csv'))
      if (csvFiles.length === 0) throw new Error('No CSV files found after extraction')

      const extracted = join(VFR_DIR, csvFiles[0])
      this.logger.log(`Nahlidni CSV extracted: ${extracted}`)
      return { xmlPath: extracted, zipPath, dateTag }
    }

    // Direct CSV response
    await this.streamToFile(res.body, csvPath)
    this.logger.log(`Nahlidni CSV downloaded: ${csvPath}`)
    return { xmlPath: csvPath, zipPath: '', dateTag }
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

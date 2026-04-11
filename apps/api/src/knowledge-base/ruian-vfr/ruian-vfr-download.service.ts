import { Injectable, Logger } from '@nestjs/common'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { createReadStream } from 'fs'
import { createUnzip } from 'zlib'
import { tmpdir } from 'os'

const VFR_DIR = join(tmpdir(), 'vfr')

// ST_UADS = kompletní adresní místa celé ČR (~300 MB ZIP)
const VFR_BASE = 'https://vdp.cuzk.gov.cz/vdp/ruian/vymennyformatspecialni/stahni'

// CSV alternative — simpler, smaller
const CSV_BASE = 'https://vdp.cuzk.gov.cz/vymenny_format/csv'

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

  /** Download VFR ST_UADS ZIP, extract, return path to XML file */
  async downloadAndExtract(): Promise<{ xmlPath: string; zipPath: string; dateTag: string }> {
    if (!existsSync(VFR_DIR)) mkdirSync(VFR_DIR, { recursive: true })

    const dateTag = this.getDateTag()
    const zipName = `${dateTag}_ST_UADS.xml.zip`
    const zipPath = join(VFR_DIR, zipName)
    const xmlPath = join(VFR_DIR, `${dateTag}_ST_UADS.xml`)

    // If XML already exists (from a previous download), skip
    if (existsSync(xmlPath)) {
      this.logger.log(`VFR XML already exists: ${xmlPath}`)
      return { xmlPath, zipPath, dateTag }
    }

    // Try VFR XML download
    const url = `${VFR_BASE}/${dateTag}_ST_UADS`
    this.logger.log(`Downloading VFR from ${url}`)

    try {
      const res = await fetch(url, { headers: { Accept: 'application/zip' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('Empty response body')

      // Stream to disk
      const writer = createWriteStream(zipPath)
      const { Readable } = await import('stream')
      await pipeline(Readable.fromWeb(res.body as any), writer)
      this.logger.log(`VFR ZIP downloaded: ${zipPath}`)

      // Extract ZIP
      await this.extractZip(zipPath, VFR_DIR)
      this.logger.log(`VFR XML extracted: ${xmlPath}`)

      return { xmlPath, zipPath, dateTag }
    } catch (err) {
      this.logger.warn(`VFR XML download failed: ${err instanceof Error ? err.message : err}`)
      // Fallback: try CSV
      return this.downloadCsv(dateTag)
    }
  }

  /** Fallback: download CSV address data */
  async downloadCsv(dateTag: string): Promise<{ xmlPath: string; zipPath: string; dateTag: string }> {
    const csvZipName = `${dateTag}_ST_UADR.csv.zip`
    const csvUrl = `${CSV_BASE}/${csvZipName}`
    const csvZipPath = join(VFR_DIR, csvZipName)
    const csvPath = join(VFR_DIR, `${dateTag}_adresy.csv`)

    if (existsSync(csvPath)) {
      this.logger.log(`CSV already exists: ${csvPath}`)
      return { xmlPath: csvPath, zipPath: csvZipPath, dateTag }
    }

    this.logger.log(`Trying CSV fallback from ${csvUrl}`)
    const res = await fetch(csvUrl)
    if (!res.ok) throw new Error(`CSV download failed: HTTP ${res.status} from ${csvUrl}`)
    if (!res.body) throw new Error('Empty CSV response body')

    const writer = createWriteStream(csvZipPath)
    const { Readable } = await import('stream')
    await pipeline(Readable.fromWeb(res.body as any), writer)

    await this.extractZip(csvZipPath, VFR_DIR)

    // Find extracted CSV
    const { readdirSync } = await import('fs')
    const csvFiles = readdirSync(VFR_DIR).filter(f => f.endsWith('.csv'))
    if (csvFiles.length === 0) throw new Error('No CSV files found after extraction')

    const extractedCsv = join(VFR_DIR, csvFiles[0])
    this.logger.log(`CSV extracted: ${extractedCsv}`)
    return { xmlPath: extractedCsv, zipPath: csvZipPath, dateTag }
  }

  /** Extract ZIP using Node's built-in zlib for .gz or external unzip for .zip */
  private async extractZip(zipPath: string, destDir: string): Promise<void> {
    // Use unzipper for proper ZIP extraction
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      // Try system unzip first (available on most Linux/Docker)
      await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`)
    } catch {
      // Fallback: try PowerShell on Windows
      try {
        await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`)
      } catch (e2) {
        // Fallback: try gunzip if it's actually gzipped
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

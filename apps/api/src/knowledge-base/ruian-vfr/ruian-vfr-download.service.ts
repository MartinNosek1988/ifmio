import { Injectable, Logger } from '@nestjs/common'
import { createWriteStream, existsSync, mkdirSync, createReadStream, readdirSync, renameSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { createUnzip } from 'zlib'
import { tmpdir } from 'os'

const VFR_DIR = join(tmpdir(), 'vfr')

// VFR archive — monthly state files on services.cuzk.gov.cz
// Structure: /vfr/{YYYYMM}/{dateTag}_ST_UADS.xml.zip
// dateTag is typically 3rd day of month (e.g. 20260203)
const VFR_ARCHIVE_BASE = 'https://services.cuzk.gov.cz/vfr'

export interface VfrDownloadResult {
  filePath: string
  dateTag: string
}

@Injectable()
export class RuianVfrDownloadService {
  private readonly logger = new Logger(RuianVfrDownloadService.name)

  /** Scrape https://services.cuzk.gov.cz/vfr/ to find the latest YYYYMM directory */
  async findLatestMonth(): Promise<string> {
    const res = await fetch(`${VFR_ARCHIVE_BASE}/`)
    if (!res.ok) throw new Error(`VFR root listing HTTP ${res.status}`)
    const html = await res.text()

    // Extract all YYYYMM directory links
    const months = [...html.matchAll(/href="\/vfr\/(\d{6})"/g)]
      .map(m => m[1])
      .sort()

    if (months.length === 0) throw new Error('No month directories found in VFR listing')

    const latest = months[months.length - 1]
    this.logger.log(`Latest VFR month: ${latest} (of ${months.length} available)`)
    return latest
  }

  /** Download ST_UADS VFR XML from services.cuzk.gov.cz/vfr/ archive */
  async downloadAndExtract(): Promise<VfrDownloadResult> {
    if (!existsSync(VFR_DIR)) mkdirSync(VFR_DIR, { recursive: true })

    const latestMonth = await this.findLatestMonth()
    const result = await this.tryMonth(latestMonth)
    if (result) return result

    throw new Error(`No ST_UADS file found in ${latestMonth}`)
  }

  /** Try to download ST_UADS from a specific month's directory */
  private async tryMonth(month: string): Promise<VfrDownloadResult | null> {
    const dirUrl = `${VFR_ARCHIVE_BASE}/${month}/`
    this.logger.log(`Checking VFR directory: ${dirUrl}`)

    // Fetch directory listing and find ST_UADS filename
    const dirRes = await fetch(dirUrl)
    if (!dirRes.ok) throw new Error(`Directory listing HTTP ${dirRes.status}`)
    const html = await dirRes.text()

    // Parse filename from directory listing: 20260203_ST_UADS.xml.zip
    const match = html.match(/href="([^"]*_ST_UADS\.xml\.zip)"/i)
    if (!match) {
      this.logger.warn(`No ST_UADS file found in ${dirUrl}`)
      return null
    }

    const zipFileName = match[1]
    const dateTag = zipFileName.replace('_ST_UADS.xml.zip', '')
    const extractDir = join(VFR_DIR, `xml_${dateTag}`)
    const canonicalXml = join(extractDir, `${dateTag}_ST_UADS.xml`)

    // Cache check
    if (existsSync(canonicalXml)) {
      this.logger.log(`VFR XML already cached: ${canonicalXml}`)
      return { filePath: canonicalXml, dateTag }
    }

    if (!existsSync(extractDir)) mkdirSync(extractDir, { recursive: true })

    // Download
    const zipUrl = `${VFR_ARCHIVE_BASE}/${month}/${zipFileName}`
    const zipPath = join(VFR_DIR, zipFileName)
    this.logger.log(`Downloading VFR: ${zipUrl}`)

    const res = await fetch(zipUrl)
    if (!res.ok) throw new Error(`Download HTTP ${res.status}`)
    if (!res.body) throw new Error('Empty response body')

    await this.streamToFile(res.body, zipPath)
    this.logger.log(`VFR ZIP downloaded: ${zipPath} (${Math.round((await import('fs')).statSync(zipPath).size / 1024 / 1024)} MB)`)

    // Extract
    await this.extractZip(zipPath, extractDir)

    // Find extracted XML
    const xmlFiles = readdirSync(extractDir).filter(f => f.endsWith('.xml') && f.includes(dateTag))
    if (xmlFiles.length > 0) {
      const extracted = join(extractDir, xmlFiles[0])
      this.logger.log(`VFR XML extracted: ${extracted}`)
      return { filePath: extracted, dateTag }
    }

    throw new Error('ZIP extracted but no XML found')
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

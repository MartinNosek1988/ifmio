import { Injectable, Logger } from '@nestjs/common'
import * as fs   from 'fs/promises'
import * as path from 'path'
import type { IStorageProvider, StoredFile } from './storage.interface'

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger  = new Logger(LocalStorageProvider.name)
  private readonly baseDir = process.env.UPLOAD_DIR ?? './uploads'
  private readonly baseUrl = process.env.API_URL    ?? 'http://localhost:3000'

  async save(file: Buffer, key: string, mimeType: string): Promise<StoredFile> {
    const filePath = path.join(this.baseDir, key)
    const dir      = path.dirname(filePath)

    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, file)

    this.logger.log(`Saved file: ${key} (${file.length} bytes)`)

    return {
      key,
      url:      `${this.baseUrl}/api/v1/documents/${key}/download`,
      size:     file.length,
      mimeType,
    }
  }

  getUrl(key: string): string {
    return `${process.env.API_URL ?? 'http://localhost:3000'}/api/v1/documents/${key}/download`
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key)
    try {
      await fs.unlink(filePath)
    } catch {
      this.logger.warn(`File not found for deletion: ${key}`)
    }
  }
}

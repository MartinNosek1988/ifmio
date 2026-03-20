import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs'
import { join } from 'path'

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name)
  private readonly backupDir: string
  private readonly encryptionKey: string | undefined

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.backupDir = this.config.get('BACKUP_DIR') ?? '/var/backups/ifmio'
    this.encryptionKey = this.config.get('BACKUP_ENCRYPTION_KEY')
  }

  /**
   * Run daily backup. Called from CronService.
   * Uses DIRECT_URL (not pooler) for pg_dump.
   */
  async runBackup(tag: 'daily' | 'weekly' = 'daily'): Promise<void> {
    const directUrl = this.config.get('DIRECT_URL')
    if (!directUrl) {
      this.logger.warn('DIRECT_URL not set — skipping backup')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `ifmio-${tag}-${timestamp}`
    const dumpPath = join(this.backupDir, `${filename}.dump`)
    const encPath = join(this.backupDir, `${filename}.dump.enc`)

    try {
      // Ensure backup directory exists
      if (!existsSync(this.backupDir)) mkdirSync(this.backupDir, { recursive: true })

      // 1. pg_dump
      this.logger.log(`Starting ${tag} backup...`)
      execSync(`pg_dump "${directUrl}" --format=custom --no-owner -f "${dumpPath}"`, {
        timeout: 5 * 60 * 1000, // 5min timeout
        stdio: 'pipe',
      })

      // 2. Encrypt if key available
      if (this.encryptionKey) {
        execSync(
          `openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:${this.encryptionKey} -in "${dumpPath}" -out "${encPath}"`,
          { timeout: 2 * 60 * 1000, stdio: 'pipe' },
        )
        // Remove unencrypted dump
        unlinkSync(dumpPath)
      }

      const finalPath = this.encryptionKey ? encPath : dumpPath
      const size = statSync(finalPath).size

      // 3. Audit log
      await this.prisma.auditLog.create({
        data: {
          action: 'BACKUP_COMPLETED',
          entity: 'System',
          newData: { tag, file: finalPath, sizeBytes: size, encrypted: !!this.encryptionKey } as any,
        },
      })

      this.logger.log(`Backup completed: ${finalPath} (${(size / 1024 / 1024).toFixed(1)} MB)`)

      // 4. Rotate old backups
      this.rotate(tag)
    } catch (err) {
      this.logger.error(`Backup failed: ${err}`)
      // Cleanup partial files
      try { if (existsSync(dumpPath)) unlinkSync(dumpPath) } catch { /* ignore */ }
      try { if (existsSync(encPath)) unlinkSync(encPath) } catch { /* ignore */ }

      await this.prisma.auditLog.create({
        data: {
          action: 'BACKUP_FAILED',
          entity: 'System',
          newData: { tag, error: String(err) } as any,
        },
      }).catch(() => {})
    }
  }

  private rotate(tag: string) {
    const maxAge = tag === 'weekly' ? 56 : 14 // days
    const cutoff = Date.now() - maxAge * 86400000

    try {
      const files = readdirSync(this.backupDir)
        .filter(f => f.startsWith(`ifmio-${tag}-`))
        .map(f => ({ name: f, path: join(this.backupDir, f), mtime: statSync(join(this.backupDir, f)).mtimeMs }))
        .filter(f => f.mtime < cutoff)

      for (const f of files) {
        unlinkSync(f.path)
        this.logger.log(`Rotated old backup: ${f.name}`)
      }
    } catch { /* ignore rotation errors */ }
  }
}

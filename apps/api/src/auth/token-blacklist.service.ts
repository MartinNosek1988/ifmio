import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Token blacklist for instant access token revocation.
 * Uses in-memory Map (fast) + DB fallback (survives restarts).
 * TODO: Migrate to Redis when available for distributed deployments.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name)
  private readonly cache = new Map<string, number>() // jti → expiresAt timestamp

  constructor(private prisma: PrismaService) {
    // Load existing blacklisted tokens from DB into memory on startup
    this.loadFromDb()
    // Clean expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000)
  }

  async blacklist(jti: string, expiresInSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    // Memory cache (fast lookup)
    this.cache.set(jti, expiresAt.getTime())
    // DB persistence (survives restart)
    try {
      await this.prisma.revokedToken.create({
        data: { jti, expiresAt },
      })
    } catch {
      // Ignore duplicate — token may already be blacklisted
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    // Check memory first (fast)
    const cached = this.cache.get(jti)
    if (cached) {
      if (cached > Date.now()) return true
      this.cache.delete(jti) // expired
      return false
    }
    // Check DB fallback (after restart, cache may be empty)
    try {
      const record = await this.prisma.revokedToken.findUnique({ where: { jti } })
      if (record && record.expiresAt > new Date()) {
        this.cache.set(jti, record.expiresAt.getTime()) // re-cache
        return true
      }
    } catch { /* ignore */ }
    return false
  }

  private async loadFromDb() {
    try {
      const tokens = await this.prisma.revokedToken.findMany({
        where: { expiresAt: { gt: new Date() } },
      })
      for (const t of tokens) {
        this.cache.set(t.jti, t.expiresAt.getTime())
      }
      if (tokens.length > 0) {
        this.logger.log(`Loaded ${tokens.length} blacklisted tokens from DB`)
      }
    } catch {
      this.logger.warn('Failed to load blacklisted tokens from DB')
    }
  }

  private async cleanup() {
    // Clean memory
    const now = Date.now()
    for (const [jti, exp] of this.cache) {
      if (exp <= now) this.cache.delete(jti)
    }
    // Clean DB
    try {
      const { count } = await this.prisma.revokedToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (count > 0) this.logger.log(`Cleaned ${count} expired blacklisted tokens`)
    } catch { /* ignore */ }
  }
}

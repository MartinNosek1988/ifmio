import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { createHash, randomBytes } from 'crypto'
import type { AuthUser } from '@ifmio/shared-types'

const VALID_SCOPES = [
  'properties:read', 'properties:write',
  'units:read', 'units:write',
  'residents:read',
  'finance:read',
  'helpdesk:read', 'helpdesk:write',
  'work-orders:read', 'work-orders:write',
  'meters:read', 'meters:write',
  'documents:read',
] as const

export type ApiKeyScope = typeof VALID_SCOPES[number]

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name)

  constructor(private prisma: PrismaService) {}

  /** Create a new API key. Returns the raw key ONCE — it cannot be recovered. */
  async createKey(user: AuthUser, dto: { name: string; scopes: string[]; expiresInDays?: number }) {
    if (!dto.name?.trim()) throw new BadRequestException('Název je povinný')
    if (!dto.scopes?.length) throw new BadRequestException('Vyberte alespoň jeden scope')

    for (const s of dto.scopes) {
      if (!VALID_SCOPES.includes(s as ApiKeyScope)) {
        throw new BadRequestException(`Neplatný scope: ${s}`)
      }
    }

    // Check limit: max 10 active keys per tenant
    const count = await this.prisma.apiKey.count({
      where: { tenantId: user.tenantId, isActive: true },
    })
    if (count >= 10) throw new BadRequestException('Maximálně 10 aktivních API klíčů')

    const rawKey = `ifmio_${randomBytes(32).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 14) // "ifmio_" + 8 hex chars

    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 86_400_000)
      : null

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        name: dto.name,
        keyHash,
        keyPrefix,
        scopes: dto.scopes,
        expiresAt,
      },
    })

    this.logger.log(`API key created: ${keyPrefix}… by user ${user.id}`)

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      // Return raw key ONLY on creation
      rawKey,
    }
  }

  async listKeys(user: AuthUser) {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        expiresAt: true, lastUsedAt: true, lastUsedIp: true,
        isActive: true, createdAt: true,
        user: { select: { name: true, email: true } },
      },
    })
    return keys
  }

  async revokeKey(user: AuthUser, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, tenantId: user.tenantId },
    })
    if (!key) throw new NotFoundException('API klíč nenalezen')

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    })

    this.logger.log(`API key revoked: ${key.keyPrefix}… by user ${user.id}`)
  }

  async deleteKey(user: AuthUser, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, tenantId: user.tenantId },
    })
    if (!key) throw new NotFoundException('API klíč nenalezen')

    await this.prisma.apiKey.delete({ where: { id: keyId } })
    this.logger.log(`API key deleted: ${key.keyPrefix}… by user ${user.id}`)
  }

  /**
   * Validate an API key from request header.
   * Returns the user context if valid, null otherwise.
   */
  async validateKey(rawKey: string, requiredScope?: string): Promise<{
    userId: string; tenantId: string; role: string; scopes: string[]
  } | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, tenantId: true, role: true, isActive: true } } },
    })

    if (!apiKey || !apiKey.isActive || !apiKey.user.isActive) return null
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null
    if (requiredScope && !apiKey.scopes.includes(requiredScope)) return null

    // Update last used (fire & forget)
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), lastUsedIp: undefined },
    }).catch(() => {})

    return {
      userId: apiKey.user.id,
      tenantId: apiKey.tenantId,
      role: apiKey.user.role,
      scopes: apiKey.scopes,
    }
  }

  /** Update lastUsedIp separately (called from guard with request IP) */
  async touchLastUsed(keyHash: string, ip?: string) {
    await this.prisma.apiKey.update({
      where: { keyHash },
      data: { lastUsedAt: new Date(), lastUsedIp: ip ?? null },
    }).catch(() => {})
  }

  getValidScopes() {
    return [...VALID_SCOPES]
  }
}

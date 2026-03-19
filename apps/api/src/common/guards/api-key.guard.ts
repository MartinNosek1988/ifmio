import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { ApiKeyService } from '../../auth/api-key.service'
import { createHash } from 'crypto'

/**
 * Guard that allows API key authentication as an alternative to JWT.
 * API key is passed via X-API-Key header.
 * If no API key header is present, the guard passes through (JWT guard handles auth).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest()
    const apiKey = request.headers?.['x-api-key'] as string | undefined

    if (!apiKey) return true // No API key → fall through to JWT auth

    const result = await this.apiKeyService.validateKey(apiKey)
    if (!result) return false

    // Set user context from API key (same shape as JWT user)
    request.user = {
      id: result.userId,
      tenantId: result.tenantId,
      role: result.role,
      apiKeyScopes: result.scopes,
    }

    // Update last used IP
    const keyHash = createHash('sha256').update(apiKey).digest('hex')
    const ip = request.ip || request.headers?.['x-forwarded-for']
    this.apiKeyService.touchLastUsed(keyHash, ip).catch(() => {})

    return true
  }
}

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { createHmac, randomUUID } from 'crypto'
import type { AuthUser } from '@ifmio/shared-types'

const MAX_RETRIES = 3
const RETRY_DELAYS = [5_000, 30_000, 120_000] // 5s, 30s, 2min
const DELIVERY_TIMEOUT = 10_000

const VALID_EVENT_TYPES = [
  'mio.finding.created', 'mio.finding.resolved', 'mio.finding.dismissed',
  'mio.finding.snoozed', 'mio.finding.restored',
  'mio.recommendation.created', 'mio.recommendation.dismissed',
  'mio.recommendation.snoozed',
  'mio.digest.sent', 'mio.digest.failed',
  'mio.insight.ticket_created',
  'mio.test',
]

const SEVERITY_ORDER: Record<string, number> = { critical: 3, warning: 2, info: 1 }

export interface MioEvent {
  eventId: string
  eventType: string
  occurredAt: string
  tenantId: string
  kind?: string
  code?: string
  severity?: string
  status?: string
  title?: string
  description?: string | null
  entityType?: string | null
  entityId?: string | null
  propertyId?: string | null
  actionUrl?: string | null
  metadata?: Record<string, unknown>
}

@Injectable()
export class MioWebhookService {
  private readonly logger = new Logger(MioWebhookService.name)

  constructor(private prisma: PrismaService) {}

  // ─── SUBSCRIPTION CRUD ────────────────────────────────────────

  async listSubscriptions(user: AuthUser) {
    return this.prisma.mioWebhookSubscription.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { deliveries: true } },
      },
    })
  }

  async createSubscription(user: AuthUser, dto: {
    name: string
    endpointUrl: string
    eventTypes: string[]
    kindFilter?: string | null
    minSeverity?: string | null
  }) {
    this.validateDto(dto)

    const secret = randomUUID() + '-' + randomUUID()

    return this.prisma.mioWebhookSubscription.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        endpointUrl: dto.endpointUrl,
        secret,
        eventTypes: dto.eventTypes,
        kindFilter: dto.kindFilter ?? null,
        minSeverity: dto.minSeverity ?? null,
      },
    })
  }

  async updateSubscription(user: AuthUser, id: string, dto: {
    name?: string
    endpointUrl?: string
    isEnabled?: boolean
    eventTypes?: string[]
    kindFilter?: string | null
    minSeverity?: string | null
  }) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    if (dto.eventTypes) {
      for (const et of dto.eventTypes) {
        if (!VALID_EVENT_TYPES.includes(et)) throw new BadRequestException(`Neplatný typ události: ${et}`)
      }
    }

    return this.prisma.mioWebhookSubscription.update({
      where: { id },
      data: {
        name: dto.name ?? sub.name,
        endpointUrl: dto.endpointUrl ?? sub.endpointUrl,
        isEnabled: dto.isEnabled ?? sub.isEnabled,
        eventTypes: dto.eventTypes ?? sub.eventTypes,
        kindFilter: dto.kindFilter !== undefined ? dto.kindFilter : sub.kindFilter,
        minSeverity: dto.minSeverity !== undefined ? dto.minSeverity : sub.minSeverity,
      },
    })
  }

  async deleteSubscription(user: AuthUser, id: string) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    await this.prisma.mioWebhookSubscription.delete({ where: { id } })
  }

  async getDeliveryLogs(user: AuthUser, subscriptionId: string, limit = 20) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id: subscriptionId, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    return this.prisma.mioWebhookDeliveryLog.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  // ─── TEST EVENT ───────────────────────────────────────────────

  async sendTestEvent(user: AuthUser, subscriptionId: string) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id: subscriptionId, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    const event: MioEvent = {
      eventId: randomUUID(),
      eventType: 'mio.test',
      occurredAt: new Date().toISOString(),
      tenantId: user.tenantId,
      kind: 'test',
      title: 'Testovací webhook z ifmio',
      description: 'Tento webhook byl odeslán jako test konfigurace.',
      severity: 'info',
      status: 'active',
    }

    return this.deliverToSubscription(sub, event)
  }

  // ─── EVENT EMISSION ───────────────────────────────────────────

  async emitEvent(tenantId: string, event: MioEvent) {
    const subs = await this.prisma.mioWebhookSubscription.findMany({
      where: { tenantId, isEnabled: true },
    })

    for (const sub of subs) {
      if (!this.matchesSubscription(sub, event)) continue

      // Fire-and-forget with retry — don't block caller
      this.deliverWithRetry(sub, event).catch(err => {
        this.logger.error(`Webhook delivery failed for sub ${sub.id}: ${err}`)
      })
    }
  }

  // ─── DELIVERY ─────────────────────────────────────────────────

  private async deliverWithRetry(sub: any, event: MioEvent, attempt = 0): Promise<void> {
    const result = await this.deliverToSubscription(sub, event, attempt)

    if (result.status === 'failed' && attempt < MAX_RETRIES - 1) {
      const delay = RETRY_DELAYS[attempt] ?? 120_000
      setTimeout(() => {
        this.deliverWithRetry(sub, event, attempt + 1).catch(() => {})
      }, delay)
    }
  }

  private async deliverToSubscription(sub: any, event: MioEvent, retryCount = 0) {
    const payload = JSON.stringify(event)
    const signature = createHmac('sha256', sub.secret).update(payload).digest('hex')

    let status = 'failed'
    let httpStatus: number | null = null
    let errorSummary: string | null = null

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT)

      const res = await fetch(sub.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IFMIO-Event': event.eventType,
          'X-IFMIO-Event-Id': event.eventId,
          'X-IFMIO-Signature': `sha256=${signature}`,
        },
        body: payload,
        signal: controller.signal,
      })

      clearTimeout(timer)
      httpStatus = res.status

      if (res.ok) {
        status = 'sent'
      } else {
        errorSummary = `HTTP ${res.status}`
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        errorSummary = 'Timeout'
      } else {
        errorSummary = 'Připojení selhalo'
      }
    }

    // Mark as exhausted if final retry failed
    if (status === 'failed' && retryCount >= MAX_RETRIES - 1) {
      status = 'exhausted'
    }

    await this.prisma.mioWebhookDeliveryLog.create({
      data: {
        subscriptionId: sub.id,
        eventId: event.eventId,
        eventType: event.eventType,
        status,
        httpStatus,
        retryCount,
        errorSummary,
      },
    }).catch(() => {})

    return { status, httpStatus, errorSummary }
  }

  private matchesSubscription(sub: any, event: MioEvent): boolean {
    // Event type filter
    if (sub.eventTypes.length > 0 && !sub.eventTypes.includes(event.eventType)) return false

    // Kind filter
    if (sub.kindFilter && event.kind && event.kind !== sub.kindFilter) return false

    // Severity filter
    if (sub.minSeverity && event.severity) {
      const minOrder = SEVERITY_ORDER[sub.minSeverity] ?? 1
      const eventOrder = SEVERITY_ORDER[event.severity] ?? 1
      if (eventOrder < minOrder) return false
    }

    return true
  }

  // ─── ADMIN VISIBILITY ────────────────────────────────────────

  async getWebhookStats(tenantId: string) {
    const [total, enabled, recentDeliveries] = await Promise.all([
      this.prisma.mioWebhookSubscription.count({ where: { tenantId } }),
      this.prisma.mioWebhookSubscription.count({ where: { tenantId, isEnabled: true } }),
      this.prisma.mioWebhookDeliveryLog.groupBy({
        by: ['status'],
        where: {
          subscription: { tenantId },
          createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) },
        },
        _count: true,
      }),
    ])

    const delivery24h: Record<string, number> = { sent: 0, failed: 0, exhausted: 0 }
    for (const g of recentDeliveries) delivery24h[g.status] = g._count

    return { total, enabled, delivery24h }
  }

  getValidEventTypes() {
    return VALID_EVENT_TYPES
  }

  private validateDto(dto: { name: string; endpointUrl: string; eventTypes: string[] }) {
    if (!dto.name?.trim()) throw new BadRequestException('Název je povinný')
    if (!dto.endpointUrl?.trim()) throw new BadRequestException('URL endpointu je povinná')
    try { new URL(dto.endpointUrl) } catch { throw new BadRequestException('Neplatná URL endpointu') }
    if (!dto.eventTypes?.length) throw new BadRequestException('Vyberte alespoň jednu událost')
    for (const et of dto.eventTypes) {
      if (!VALID_EVENT_TYPES.includes(et)) throw new BadRequestException(`Neplatný typ události: ${et}`)
    }
  }
}

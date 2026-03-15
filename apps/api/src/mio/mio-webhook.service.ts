import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { createHmac, randomUUID } from 'crypto'
import type { AuthUser } from '@ifmio/shared-types'

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [10_000, 60_000, 300_000] // 10s, 1min, 5min
const DELIVERY_TIMEOUT = 10_000
const BATCH_SIZE = 50
const STALE_PROCESSING_THRESHOLD_MS = 120_000 // 2min — items stuck in processing longer are recovered

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
    const subs = await this.prisma.mioWebhookSubscription.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { deliveries: true, outbox: true } },
      },
    })

    return subs.map(s => ({
      ...s,
      secretMasked: s.secret.slice(0, 8) + '••••••••',
      secret: undefined,
    }))
  }

  async getSubscription(user: AuthUser, id: string) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')
    return sub
  }

  async createSubscription(user: AuthUser, dto: {
    name: string; endpointUrl: string; eventTypes: string[]
    kindFilter?: string | null; minSeverity?: string | null
  }) {
    this.validateDto(dto)
    const secret = randomUUID() + '-' + randomUUID()
    return this.prisma.mioWebhookSubscription.create({
      data: {
        tenantId: user.tenantId, name: dto.name, endpointUrl: dto.endpointUrl,
        secret, eventTypes: dto.eventTypes,
        kindFilter: dto.kindFilter ?? null, minSeverity: dto.minSeverity ?? null,
      },
    })
  }

  async updateSubscription(user: AuthUser, id: string, dto: {
    name?: string; endpointUrl?: string; isEnabled?: boolean
    eventTypes?: string[]; kindFilter?: string | null; minSeverity?: string | null
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
        name: dto.name ?? sub.name, endpointUrl: dto.endpointUrl ?? sub.endpointUrl,
        isEnabled: dto.isEnabled ?? sub.isEnabled, eventTypes: dto.eventTypes ?? sub.eventTypes,
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

  async getDeliveryLogs(user: AuthUser, subscriptionId: string, filters?: {
    status?: string; eventType?: string; limit?: number
  }) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id: subscriptionId, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    const where: any = { subscriptionId }
    if (filters?.status) where.status = filters.status
    if (filters?.eventType) where.eventType = filters.eventType

    return this.prisma.mioWebhookDeliveryLog.findMany({
      where, orderBy: { createdAt: 'desc' }, take: filters?.limit ?? 30,
    })
  }

  async rotateSecret(user: AuthUser, id: string) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')
    return this.prisma.mioWebhookSubscription.update({
      where: { id }, data: { secret: randomUUID() + '-' + randomUUID() },
    })
  }

  // ─── OUTBOX: ENQUEUE ─────────────────────────────────────────

  async emitEvent(tenantId: string, event: MioEvent) {
    const subs = await this.prisma.mioWebhookSubscription.findMany({
      where: { tenantId, isEnabled: true },
    })

    const items = subs
      .filter(sub => this.matchesSubscription(sub, event))
      .map(sub => ({
        subscriptionId: sub.id,
        eventId: event.eventId,
        eventType: event.eventType,
        payload: event as any,
        status: 'pending',
        maxRetries: MAX_RETRIES,
        nextAttemptAt: new Date(),
      }))

    if (items.length > 0) {
      await this.prisma.mioWebhookOutbox.createMany({ data: items }).catch(err => {
        this.logger.error(`Failed to enqueue webhook deliveries: ${err}`)
      })
    }
  }

  // ─── STALE PROCESSING RECOVERY ─────────────────────────────

  async recoverStaleProcessing(): Promise<number> {
    const threshold = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS)

    const stale = await this.prisma.mioWebhookOutbox.findMany({
      where: { status: 'processing', lastAttemptAt: { lt: threshold } },
      select: { id: true, retryCount: true, maxRetries: true },
    })

    let recovered = 0
    for (const item of stale) {
      const newRetry = item.retryCount + 1
      if (newRetry >= item.maxRetries) {
        await this.prisma.mioWebhookOutbox.update({
          where: { id: item.id },
          data: { status: 'exhausted', lastError: 'Běh byl obnoven po přerušení', processedAt: new Date() },
        })
      } else {
        await this.prisma.mioWebhookOutbox.update({
          where: { id: item.id },
          data: {
            status: 'pending', retryCount: newRetry,
            nextAttemptAt: new Date(Date.now() + (RETRY_DELAYS_MS[newRetry - 1] ?? 300_000)),
            lastError: 'Obnoveno po přerušeném zpracování',
          },
        })
      }
      recovered++
    }

    if (recovered > 0) {
      this.logger.log(`Webhook outbox: recovered ${recovered} stale processing items`)
    }

    return recovered
  }

  // ─── OUTBOX: PROCESS PENDING (called by cron) ────────────────

  async processOutbox(): Promise<{ processed: number; sent: number; failed: number; exhausted: number; recovered: number }> {
    // First recover any stale processing items
    const recovered = await this.recoverStaleProcessing()

    const now = new Date()

    // Claim pending items ready for delivery
    const items = await this.prisma.mioWebhookOutbox.findMany({
      where: {
        status: 'pending',
        nextAttemptAt: { lte: now },
      },
      include: {
        subscription: { select: { id: true, endpointUrl: true, secret: true, isEnabled: true } },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: BATCH_SIZE,
    })

    let sent = 0, failed = 0, exhausted = 0

    for (const item of items) {
      if (!item.subscription.isEnabled) {
        // Subscription disabled since enqueue — skip
        await this.prisma.mioWebhookOutbox.update({
          where: { id: item.id },
          data: { status: 'exhausted', processedAt: now, lastError: 'Webhook je vypnutý' },
        })
        exhausted++
        continue
      }

      // Mark processing
      await this.prisma.mioWebhookOutbox.update({
        where: { id: item.id },
        data: { status: 'processing', lastAttemptAt: now },
      })

      const result = await this.deliverPayload(
        item.subscription.endpointUrl,
        item.subscription.secret,
        item.payload as unknown as MioEvent,
      )

      // Log delivery attempt
      await this.prisma.mioWebhookDeliveryLog.create({
        data: {
          subscriptionId: item.subscriptionId,
          eventId: item.eventId,
          eventType: item.eventType,
          status: result.ok ? 'sent' : (item.retryCount + 1 >= item.maxRetries ? 'exhausted' : 'failed'),
          httpStatus: result.httpStatus,
          retryCount: item.retryCount,
          errorSummary: result.errorSummary,
        },
      }).catch(() => {})

      if (result.ok) {
        await this.prisma.mioWebhookOutbox.update({
          where: { id: item.id },
          data: { status: 'sent', processedAt: now, lastHttpStatus: result.httpStatus },
        })
        sent++
      } else {
        const newRetry = item.retryCount + 1
        if (newRetry >= item.maxRetries) {
          await this.prisma.mioWebhookOutbox.update({
            where: { id: item.id },
            data: {
              status: 'exhausted', retryCount: newRetry, processedAt: now,
              lastHttpStatus: result.httpStatus, lastError: result.errorSummary,
            },
          })
          exhausted++
        } else {
          const delay = RETRY_DELAYS_MS[newRetry - 1] ?? 300_000
          await this.prisma.mioWebhookOutbox.update({
            where: { id: item.id },
            data: {
              status: 'pending', retryCount: newRetry,
              nextAttemptAt: new Date(now.getTime() + delay),
              lastHttpStatus: result.httpStatus, lastError: result.errorSummary,
            },
          })
          failed++
        }
      }
    }

    return { processed: items.length, sent, failed, exhausted, recovered }
  }

  // ─── RETRY / RESEND ──────────────────────────────────────────

  async retryDelivery(user: AuthUser, outboxId: string) {
    const item = await this.prisma.mioWebhookOutbox.findFirst({
      where: {
        id: outboxId,
        subscription: { tenantId: user.tenantId },
        status: { in: ['failed', 'exhausted'] },
      },
    })
    if (!item) throw new NotFoundException('Doručení nenalezeno')

    return this.prisma.mioWebhookOutbox.update({
      where: { id: outboxId },
      data: {
        status: 'pending',
        retryCount: 0,
        nextAttemptAt: new Date(),
        lastError: 'Ručně znovu zařazeno',
        processedAt: null,
      },
    })
  }

  // ─── TEST EVENT ───────────────────────────────────────────────

  async sendTestEvent(user: AuthUser, subscriptionId: string) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id: subscriptionId, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    const event: MioEvent = {
      eventId: randomUUID(), eventType: 'mio.test',
      occurredAt: new Date().toISOString(), tenantId: user.tenantId,
      kind: 'test', title: 'Testovací webhook z ifmio',
      description: 'Tento webhook byl odeslán jako test konfigurace.',
      severity: 'info', status: 'active',
    }

    // Test sends immediately (not via outbox) for instant feedback
    const result = await this.deliverPayload(sub.endpointUrl, sub.secret, event)

    await this.prisma.mioWebhookDeliveryLog.create({
      data: {
        subscriptionId: sub.id, eventId: event.eventId, eventType: 'mio.test',
        status: result.ok ? 'sent' : 'failed',
        httpStatus: result.httpStatus, retryCount: 0, errorSummary: result.errorSummary,
      },
    }).catch(() => {})

    return { status: result.ok ? 'sent' : 'failed', httpStatus: result.httpStatus, errorSummary: result.errorSummary }
  }

  // ─── OUTBOX VISIBILITY ───────────────────────────────────────

  async getOutboxSummary(user: AuthUser, subscriptionId: string) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id: subscriptionId, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    const [pending, processing, exhausted, lastSuccess, lastFailure, recentFailed24h] = await Promise.all([
      this.prisma.mioWebhookOutbox.count({ where: { subscriptionId, status: 'pending' } }),
      this.prisma.mioWebhookOutbox.count({ where: { subscriptionId, status: 'processing' } }),
      this.prisma.mioWebhookOutbox.count({ where: { subscriptionId, status: 'exhausted' } }),
      this.prisma.mioWebhookOutbox.findFirst({
        where: { subscriptionId, status: 'sent' },
        orderBy: { processedAt: 'desc' },
        select: { processedAt: true },
      }),
      this.prisma.mioWebhookOutbox.findFirst({
        where: { subscriptionId, status: { in: ['failed', 'exhausted'] } },
        orderBy: { lastAttemptAt: 'desc' },
        select: { lastAttemptAt: true, lastError: true },
      }),
      this.prisma.mioWebhookDeliveryLog.count({
        where: { subscriptionId, status: { in: ['failed', 'exhausted'] }, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } },
      }),
    ])

    const health = exhausted > 3 || recentFailed24h > 5 ? 'warning' : pending + processing > 10 ? 'busy' : 'ok'

    return {
      pending, processing, exhausted,
      lastSuccess: lastSuccess?.processedAt ?? null,
      lastFailure: lastFailure ? { at: lastFailure.lastAttemptAt, error: lastFailure.lastError } : null,
      recentFailed24h,
      health,
    }
  }

  async getOutboxItems(user: AuthUser, subscriptionId: string, filters?: {
    status?: string; eventType?: string; limit?: number; offset?: number
  }) {
    const sub = await this.prisma.mioWebhookSubscription.findFirst({
      where: { id: subscriptionId, tenantId: user.tenantId },
    })
    if (!sub) throw new NotFoundException('Webhook nenalezen')

    const where: any = { subscriptionId }
    if (filters?.status) where.status = filters.status
    if (filters?.eventType) where.eventType = filters.eventType

    const [items, total] = await Promise.all([
      this.prisma.mioWebhookOutbox.findMany({
        where, orderBy: { createdAt: 'desc' },
        take: filters?.limit ?? 30,
        skip: filters?.offset ?? 0,
        select: {
          id: true, eventId: true, eventType: true, status: true,
          retryCount: true, maxRetries: true, nextAttemptAt: true,
          lastAttemptAt: true, lastHttpStatus: true, lastError: true,
          processedAt: true, createdAt: true,
        },
      }),
      this.prisma.mioWebhookOutbox.count({ where }),
    ])

    return { items, total, limit: filters?.limit ?? 30, offset: filters?.offset ?? 0 }
  }

  // ─── ADMIN VISIBILITY ────────────────────────────────────────

  async getWebhookStats(tenantId: string) {
    const [total, enabled, recentDeliveries, pendingCount, exhaustedCount] = await Promise.all([
      this.prisma.mioWebhookSubscription.count({ where: { tenantId } }),
      this.prisma.mioWebhookSubscription.count({ where: { tenantId, isEnabled: true } }),
      this.prisma.mioWebhookDeliveryLog.groupBy({
        by: ['status'],
        where: { subscription: { tenantId }, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } },
        _count: true,
      }),
      this.prisma.mioWebhookOutbox.count({
        where: { subscription: { tenantId }, status: { in: ['pending', 'processing'] } },
      }),
      this.prisma.mioWebhookOutbox.count({
        where: { subscription: { tenantId }, status: 'exhausted' },
      }),
    ])

    const delivery24h: Record<string, number> = { sent: 0, failed: 0, exhausted: 0 }
    for (const g of recentDeliveries) delivery24h[g.status] = g._count

    return { total, enabled, delivery24h, pendingCount, exhaustedCount }
  }

  getValidEventTypes() { return VALID_EVENT_TYPES }

  // ─── INTERNAL DELIVERY ───────────────────────────────────────

  private async deliverPayload(url: string, secret: string, event: MioEvent) {
    const payload = JSON.stringify(event)
    const signature = createHmac('sha256', secret).update(payload).digest('hex')

    let ok = false
    let httpStatus: number | null = null
    let errorSummary: string | null = null

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT)

      const res = await fetch(url, {
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
      ok = res.ok
      if (!ok) errorSummary = `HTTP ${res.status}`
    } catch (err: any) {
      errorSummary = err?.name === 'AbortError' ? 'Vypršel časový limit' : 'Připojení selhalo'
    }

    return { ok, httpStatus, errorSummary }
  }

  private matchesSubscription(sub: any, event: MioEvent): boolean {
    if (sub.eventTypes.length > 0 && !sub.eventTypes.includes(event.eventType)) return false
    if (sub.kindFilter && event.kind && event.kind !== sub.kindFilter) return false
    if (sub.minSeverity && event.severity) {
      const minOrder = SEVERITY_ORDER[sub.minSeverity] ?? 1
      const eventOrder = SEVERITY_ORDER[event.severity] ?? 1
      if (eventOrder < minOrder) return false
    }
    return true
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

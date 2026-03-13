import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SLA_POLICY } from './sla.constants'

export interface EffectiveSla {
  responseHours: number
  resolutionHours: number
}

/**
 * Resolves effective SLA policy for a ticket:
 * 1. Property-specific override (if propertyId is set)
 * 2. Tenant-level default (propertyId = null)
 * 3. Hardcoded fallback (sla.constants.ts)
 */
@Injectable()
export class SlaPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectiveSla(
    tenantId: string,
    priority: string,
    propertyId?: string | null,
  ): Promise<EffectiveSla> {
    // Try property override first, then tenant default
    const policies = await this.prisma.slaPolicy.findMany({
      where: {
        tenantId,
        OR: propertyId
          ? [{ propertyId }, { propertyId: null }]
          : [{ propertyId: null }],
      },
    })

    // Property-specific first, then tenant-level
    const policy = policies.find((p) => p.propertyId === propertyId) ?? policies.find((p) => p.propertyId === null)

    if (!policy) {
      // Hardcoded fallback
      const fallback = SLA_POLICY[priority] ?? SLA_POLICY.medium
      return fallback
    }

    return this.extractPriority(policy, priority)
  }

  private extractPriority(policy: {
    lowResponseH: number; lowResolutionH: number
    mediumResponseH: number; mediumResolutionH: number
    highResponseH: number; highResolutionH: number
    urgentResponseH: number; urgentResolutionH: number
  }, priority: string): EffectiveSla {
    switch (priority) {
      case 'low':    return { responseHours: policy.lowResponseH,    resolutionHours: policy.lowResolutionH }
      case 'high':   return { responseHours: policy.highResponseH,   resolutionHours: policy.highResolutionH }
      case 'urgent': return { responseHours: policy.urgentResponseH, resolutionHours: policy.urgentResolutionH }
      default:       return { responseHours: policy.mediumResponseH, resolutionHours: policy.mediumResolutionH }
    }
  }

  /** Calculate SLA due dates from effective policy */
  calculateSlaDates(sla: EffectiveSla, createdAt: Date) {
    return {
      responseDueAt: new Date(createdAt.getTime() + sla.responseHours * 3_600_000),
      resolutionDueAt: new Date(createdAt.getTime() + sla.resolutionHours * 3_600_000),
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────

  async list(tenantId: string) {
    return this.prisma.slaPolicy.findMany({
      where: { tenantId },
      include: { property: { select: { id: true, name: true } } },
      orderBy: [{ propertyId: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
    })
  }

  async upsert(tenantId: string, dto: {
    propertyId?: string | null
    lowResponseH?: number; lowResolutionH?: number
    mediumResponseH?: number; mediumResolutionH?: number
    highResponseH?: number; highResolutionH?: number
    urgentResponseH?: number; urgentResolutionH?: number
  }) {
    const propertyId = dto.propertyId ?? null
    const data = {
      lowResponseH: dto.lowResponseH,
      lowResolutionH: dto.lowResolutionH,
      mediumResponseH: dto.mediumResponseH,
      mediumResolutionH: dto.mediumResolutionH,
      highResponseH: dto.highResponseH,
      highResolutionH: dto.highResolutionH,
      urgentResponseH: dto.urgentResponseH,
      urgentResolutionH: dto.urgentResolutionH,
    }
    // Strip undefined fields
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    )

    // Prisma upsert on nullable composite unique is unreliable — use find+create/update
    const existing = await this.prisma.slaPolicy.findFirst({
      where: { tenantId, propertyId },
    })

    if (existing) {
      return this.prisma.slaPolicy.update({
        where: { id: existing.id },
        data: cleanData,
      })
    }

    return this.prisma.slaPolicy.create({
      data: {
        tenantId,
        propertyId,
        ...cleanData,
      },
    })
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.slaPolicy.deleteMany({
      where: { id, tenantId },
    })
  }
}

import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// ─── Default Mio governance config ──────────────────────────────
export interface MioConfig {
  // Rule family toggles
  enabledFindings: Record<string, boolean>
  enabledRecommendations: Record<string, boolean>

  // Auto-ticket policy overrides (code → true/false)
  autoTicketPolicy: Record<string, boolean>

  // Threshold overrides
  thresholds: Record<string, number>

  // Dashboard visibility
  dashboard: {
    showFindings: boolean
    showRecommendations: boolean
    showMioStrip: boolean
  }
}

const DEFAULT_CONFIG: MioConfig = {
  enabledFindings: {
    overdue_recurring_request: true,
    overdue_revision: true,
    overdue_work_order: true,
    urgent_ticket_no_assignee: true,
    asset_no_recurring_plan: true,
  },
  enabledRecommendations: {
    recurring_plans_adoption: true,
    reporting_export_tip: true,
    helpdesk_filtering_tip: true,
    attachments_protocol_tip: true,
    security_access_tip: true,
  },
  autoTicketPolicy: {
    overdue_revision: true,
    urgent_ticket_no_assignee: true,
  },
  thresholds: {
    RECURRING_ADOPTION_MIN_ASSETS: 3,
    RECURRING_ADOPTION_MAX_PLANS: 2,
    REPORTING_TIP_MIN_TICKETS: 10,
    HELPDESK_FILTER_TIP_MIN_TICKETS: 20,
    PROTOCOL_TIP_MIN_COMPLETED_WO: 5,
    SECURITY_TIP_MIN_USERS: 3,
  },
  dashboard: {
    showFindings: true,
    showRecommendations: true,
    showMioStrip: true,
  },
}

@Injectable()
export class MioConfigService {
  constructor(private prisma: PrismaService) {}

  async getConfig(tenantId: string): Promise<MioConfig> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { mioConfig: true },
    })

    if (!settings?.mioConfig) return { ...DEFAULT_CONFIG }

    // Deep-merge stored config over defaults so new keys always have defaults
    const stored = settings.mioConfig as Partial<MioConfig>
    return {
      enabledFindings: { ...DEFAULT_CONFIG.enabledFindings, ...stored.enabledFindings },
      enabledRecommendations: { ...DEFAULT_CONFIG.enabledRecommendations, ...stored.enabledRecommendations },
      autoTicketPolicy: { ...DEFAULT_CONFIG.autoTicketPolicy, ...stored.autoTicketPolicy },
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...stored.thresholds },
      dashboard: { ...DEFAULT_CONFIG.dashboard, ...stored.dashboard },
    }
  }

  async updateConfig(tenantId: string, patch: Partial<MioConfig>): Promise<MioConfig> {
    const current = await this.getConfig(tenantId)

    const merged: MioConfig = {
      enabledFindings: { ...current.enabledFindings, ...patch.enabledFindings },
      enabledRecommendations: { ...current.enabledRecommendations, ...patch.enabledRecommendations },
      autoTicketPolicy: { ...current.autoTicketPolicy, ...patch.autoTicketPolicy },
      thresholds: { ...current.thresholds, ...patch.thresholds },
      dashboard: { ...current.dashboard, ...patch.dashboard },
    }

    // Ensure tenant settings row exists
    await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, mioConfig: merged as any },
      update: { mioConfig: merged as any },
    })

    return merged
  }

  getDefaults(): MioConfig {
    return { ...DEFAULT_CONFIG }
  }
}

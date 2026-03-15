import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// ─── Centralized rule & threshold metadata ──────────────────────

export interface ThresholdMeta {
  label: string
  description: string
  min: number
  max: number
  step: number
  defaultValue: number
}

export interface RuleMeta {
  code: string
  label: string
  description: string
  impact: string
  defaultEnabled: boolean
}

export const FINDING_RULES_META: RuleMeta[] = [
  {
    code: 'overdue_recurring_request',
    label: 'Opakované požadavky po termínu',
    description: 'Detekuje opakované požadavky, které překročily plánovaný termín.',
    impact: 'Po vypnutí se nové záznamy tohoto typu nebudou vyhodnocovat.',
    defaultEnabled: true,
  },
  {
    code: 'overdue_revision',
    label: 'Revize po termínu',
    description: 'Detekuje revize zařízení, které jsou po termínu a vyžadují pozornost.',
    impact: 'Po vypnutí se nové záznamy tohoto typu nebudou vyhodnocovat.',
    defaultEnabled: true,
  },
  {
    code: 'overdue_work_order',
    label: 'Pracovní úkoly po termínu',
    description: 'Detekuje pracovní úkoly, které překročily plánovaný termín.',
    impact: 'Po vypnutí se nové záznamy tohoto typu nebudou vyhodnocovat.',
    defaultEnabled: true,
  },
  {
    code: 'urgent_ticket_no_assignee',
    label: 'Urgentní požadavky bez řešitele',
    description: 'Detekuje urgentní požadavky, které nemají přiřazeného řešitele.',
    impact: 'Po vypnutí se nové záznamy tohoto typu nebudou vyhodnocovat.',
    defaultEnabled: true,
  },
  {
    code: 'asset_no_recurring_plan',
    label: 'Zařízení bez opakované činnosti',
    description: 'Upozorní na zařízení, která nemají nastavenou žádnou opakovanou činnost.',
    impact: 'Po vypnutí se nové záznamy tohoto typu nebudou vyhodnocovat.',
    defaultEnabled: true,
  },
]

export const RECOMMENDATION_RULES_META: RuleMeta[] = [
  {
    code: 'recurring_plans_adoption',
    label: 'Automatizace opakovaných činností',
    description: 'Doporučí nastavení opakovaných činností při dostatečném počtu zařízení.',
    impact: 'Po vypnutí se toto doporučení přestane zobrazovat uživatelům.',
    defaultEnabled: true,
  },
  {
    code: 'reporting_export_tip',
    label: 'Tip na export přehledů',
    description: 'Připomene možnost exportu dat při větším objemu požadavků.',
    impact: 'Po vypnutí se toto doporučení přestane zobrazovat uživatelům.',
    defaultEnabled: true,
  },
  {
    code: 'helpdesk_filtering_tip',
    label: 'Tip na filtry helpdesku',
    description: 'Doporučí využití filtrů při větším počtu požadavků.',
    impact: 'Po vypnutí se toto doporučení přestane zobrazovat uživatelům.',
    defaultEnabled: true,
  },
  {
    code: 'attachments_protocol_tip',
    label: 'Tip na protokoly k úkolům',
    description: 'Doporučí přidávání protokolů k dokončeným úkolům.',
    impact: 'Po vypnutí se toto doporučení přestane zobrazovat uživatelům.',
    defaultEnabled: true,
  },
  {
    code: 'security_access_tip',
    label: 'Kontrola přístupů',
    description: 'Doporučí kontrolu přístupových práv při větším počtu uživatelů.',
    impact: 'Po vypnutí se toto doporučení přestane zobrazovat uživatelům.',
    defaultEnabled: true,
  },
]

export const THRESHOLDS_META: Record<string, ThresholdMeta> = {
  RECURRING_ADOPTION_MIN_ASSETS: {
    label: 'Min. zařízení pro tip na opakované činnosti',
    description: 'Minimální počet zařízení, při kterém se zobrazí doporučení na opakované činnosti.',
    min: 1, max: 100, step: 1, defaultValue: 3,
  },
  RECURRING_ADOPTION_MAX_PLANS: {
    label: 'Max. plánů pro tip na opakované činnosti',
    description: 'Pokud má tenant méně plánů než tato hodnota, zobrazí se doporučení.',
    min: 0, max: 100, step: 1, defaultValue: 2,
  },
  REPORTING_TIP_MIN_TICKETS: {
    label: 'Min. požadavků pro tip na exporty',
    description: 'Minimální počet požadavků, při kterém se zobrazí tip na export přehledů.',
    min: 1, max: 500, step: 5, defaultValue: 10,
  },
  HELPDESK_FILTER_TIP_MIN_TICKETS: {
    label: 'Min. požadavků pro tip na filtry',
    description: 'Minimální počet požadavků, při kterém se zobrazí tip na využití filtrů.',
    min: 1, max: 500, step: 5, defaultValue: 20,
  },
  PROTOCOL_TIP_MIN_COMPLETED_WO: {
    label: 'Min. úkolů pro tip na protokoly',
    description: 'Minimální počet dokončených úkolů, při kterém se zobrazí tip na protokoly.',
    min: 1, max: 200, step: 1, defaultValue: 5,
  },
  SECURITY_TIP_MIN_USERS: {
    label: 'Min. uživatelů pro tip na přístupy',
    description: 'Minimální počet aktivních uživatelů, při kterém se zobrazí tip na kontrolu přístupů.',
    min: 1, max: 100, step: 1, defaultValue: 3,
  },
}

export const AUTO_TICKET_DESCRIPTIONS: Record<string, string> = {
  overdue_recurring_request: 'Zjištění se stále zobrazí, ale nevznikne automaticky ticket.',
  overdue_revision: 'Zjištění se stále zobrazí, ale nevznikne automaticky ticket.',
  overdue_work_order: 'Zjištění se stále zobrazí, ale nevznikne automaticky ticket.',
  urgent_ticket_no_assignee: 'Zjištění se stále zobrazí, ale nevznikne automaticky ticket.',
  asset_no_recurring_plan: 'Zjištění se stále zobrazí, ale nevznikne automaticky ticket.',
}

export const DIGEST_META: Record<string, { label: string; description: string; impact: string }> = {
  enabled: {
    label: 'E-mailové přehledy Mio',
    description: 'Zapne možnost zasílání Mio přehledů e-mailem.',
    impact: 'Po vypnutí se žádný uživatel v organizaci nedostane Mio digest.',
  },
  includeFindings: {
    label: 'Zahrnout upozornění',
    description: 'Zda mají přehledy obsahovat Mio upozornění (findings).',
    impact: 'Vypnutím se ze souhrnu odstraní sekce s upozorněními.',
  },
  includeRecommendations: {
    label: 'Zahrnout doporučení',
    description: 'Zda mají přehledy obsahovat Mio doporučení.',
    impact: 'Vypnutím se ze souhrnu odstraní sekce s doporučeními.',
  },
  defaultFrequency: {
    label: 'Výchozí frekvence',
    description: 'Frekvence zasílání pro nové uživatele.',
    impact: 'Uživatel si může frekvenci změnit ve svém profilu.',
  },
  minSeverity: {
    label: 'Minimální závažnost',
    description: 'Zahrnout pouze zjištění s touto nebo vyšší závažností.',
    impact: 'Informační zjištění nebudou zahrnuta, pokud nastavíte „varování" nebo vyšší.',
  },
}

export const DASHBOARD_META: Record<string, { label: string; description: string; impact: string }> = {
  showFindings: {
    label: 'Upozornění na dashboardu',
    description: 'Sekce s Mio upozorněními na hlavním dashboardu.',
    impact: 'Blok se skryje z dashboardu, ale zůstane dostupný v Mio Insights.',
  },
  showRecommendations: {
    label: 'Doporučení na dashboardu',
    description: 'Sekce s Mio doporučeními na hlavním dashboardu.',
    impact: 'Blok se skryje z dashboardu, ale zůstane dostupný v Mio Insights.',
  },
  showMioStrip: {
    label: 'Mio přehled (KPI karty)',
    description: 'Informační strip s Mio funkcemi na dashboardu.',
    impact: 'Blok se skryje z dashboardu.',
  },
}

// ─── Config types ───────────────────────────────────────────────

export interface MioConfig {
  enabledFindings: Record<string, boolean>
  enabledRecommendations: Record<string, boolean>
  autoTicketPolicy: Record<string, boolean>
  thresholds: Record<string, number>
  dashboard: {
    showFindings: boolean
    showRecommendations: boolean
    showMioStrip: boolean
  }
  digest: {
    enabled: boolean
    includeFindings: boolean
    includeRecommendations: boolean
    defaultFrequency: 'daily' | 'weekly' | 'off'
    minSeverity: 'critical' | 'warning' | 'info'
  }
}

// Build defaults from metadata
function buildDefaultConfig(): MioConfig {
  const enabledFindings: Record<string, boolean> = {}
  for (const r of FINDING_RULES_META) enabledFindings[r.code] = r.defaultEnabled

  const enabledRecommendations: Record<string, boolean> = {}
  for (const r of RECOMMENDATION_RULES_META) enabledRecommendations[r.code] = r.defaultEnabled

  const thresholds: Record<string, number> = {}
  for (const [key, meta] of Object.entries(THRESHOLDS_META)) thresholds[key] = meta.defaultValue

  return {
    enabledFindings,
    enabledRecommendations,
    autoTicketPolicy: {
      overdue_revision: true,
      urgent_ticket_no_assignee: true,
    },
    thresholds,
    dashboard: {
      showFindings: true,
      showRecommendations: true,
      showMioStrip: true,
    },
    digest: {
      enabled: true,
      includeFindings: true,
      includeRecommendations: true,
      defaultFrequency: 'daily',
      minSeverity: 'info',
    },
  }
}

const DEFAULT_CONFIG = buildDefaultConfig()

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
      digest: { ...DEFAULT_CONFIG.digest, ...stored.digest },
    }
  }

  async updateConfig(tenantId: string, patch: Partial<MioConfig>): Promise<MioConfig> {
    // Validate thresholds
    if (patch.thresholds) {
      this.validateThresholds(patch.thresholds)
    }

    const current = await this.getConfig(tenantId)

    const merged: MioConfig = {
      enabledFindings: { ...current.enabledFindings, ...patch.enabledFindings },
      enabledRecommendations: { ...current.enabledRecommendations, ...patch.enabledRecommendations },
      autoTicketPolicy: { ...current.autoTicketPolicy, ...patch.autoTicketPolicy },
      thresholds: { ...current.thresholds, ...patch.thresholds },
      dashboard: { ...current.dashboard, ...patch.dashboard },
      digest: { ...current.digest, ...patch.digest },
    }

    // Ensure tenant settings row exists
    await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, mioConfig: merged as any },
      update: { mioConfig: merged as any },
    })

    return merged
  }

  async resetConfig(tenantId: string, section?: string): Promise<MioConfig> {
    const current = await this.getConfig(tenantId)
    let merged: MioConfig

    if (!section) {
      // Full reset
      merged = { ...DEFAULT_CONFIG }
    } else {
      // Section-level reset
      merged = { ...current }
      switch (section) {
        case 'enabledFindings':
          merged.enabledFindings = { ...DEFAULT_CONFIG.enabledFindings }
          break
        case 'enabledRecommendations':
          merged.enabledRecommendations = { ...DEFAULT_CONFIG.enabledRecommendations }
          break
        case 'autoTicketPolicy':
          merged.autoTicketPolicy = { ...DEFAULT_CONFIG.autoTicketPolicy }
          break
        case 'thresholds':
          merged.thresholds = { ...DEFAULT_CONFIG.thresholds }
          break
        case 'dashboard':
          merged.dashboard = { ...DEFAULT_CONFIG.dashboard }
          break
        case 'digest':
          merged.digest = { ...DEFAULT_CONFIG.digest }
          break
        default:
          throw new BadRequestException(`Neznámá sekce: ${section}`)
      }
    }

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

  getMeta() {
    return {
      findings: FINDING_RULES_META,
      recommendations: RECOMMENDATION_RULES_META,
      thresholds: THRESHOLDS_META,
      autoTicketDescriptions: AUTO_TICKET_DESCRIPTIONS,
      dashboard: DASHBOARD_META,
      digest: DIGEST_META,
    }
  }

  private validateThresholds(thresholds: Record<string, number>) {
    for (const [key, value] of Object.entries(thresholds)) {
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new BadRequestException(`Neplatná hodnota pro ${key}: musí být číslo`)
      }
      const meta = THRESHOLDS_META[key]
      if (!meta) continue // unknown key, skip (future-proof)
      if (value < meta.min) {
        throw new BadRequestException(`${meta.label}: minimální hodnota je ${meta.min}`)
      }
      if (value > meta.max) {
        throw new BadRequestException(`${meta.label}: maximální hodnota je ${meta.max}`)
      }
    }
  }
}

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AssetTypesService } from './asset-types.service'

const DAY_MS = 86_400_000

export interface SyncPreviewItem {
  revisionTypeId: string
  assetTypeAssignmentId: string
  code: string
  name: string
  effectiveIntervalDays: number
  effectiveReminderDays: number
  effectiveGraceDays: number
  effectiveRequiresProtocol: boolean
  isRequired: boolean
  existingPlanId: string | null
  existingPlanIsCustomized: boolean
  action: 'create' | 'skip_exists' | 'skip_customized'
}

export interface SyncResult {
  created: number
  skipped: number
  skippedCustomized: number
}

@Injectable()
export class AssetPlanInstantiationService {
  private readonly logger = new Logger(AssetPlanInstantiationService.name)

  constructor(
    private prisma: PrismaService,
    private assetTypesService: AssetTypesService,
  ) {}

  // ─── Called after asset creation — best-effort ─────────────────

  async instantiatePlansForAsset(
    assetId: string,
    assetTypeId: string,
    tenantId: string,
  ): Promise<{ created: number; skipped: number }> {
    const result = await this.executeSyncPlans(assetId, tenantId, { skipCustomized: true })
    return { created: result.created, skipped: result.skipped + result.skippedCustomized }
  }

  // ─── Preview ───────────────────────────────────────────────────

  async previewSync(assetId: string, tenantId: string): Promise<SyncPreviewItem[]> {
    const asset = await this.resolveAsset(assetId, tenantId)

    const rules = await this.assetTypesService.resolveAssetTypeTemplateRules(
      asset.assetTypeId!,
      tenantId,
    )

    // Fetch existing plans for this asset (any, regardless of origin)
    const existingPlans = await this.prisma.revisionPlan.findMany({
      where: { assetId, tenantId },
      select: { id: true, revisionTypeId: true, isCustomized: true, generatedFromAssetType: true },
    })
    const existingByRevisionType = new Map(existingPlans.map((p) => [p.revisionTypeId, p]))

    return rules.map((rule): SyncPreviewItem => {
      const existing = existingByRevisionType.get(rule.revisionTypeId) ?? null

      let action: SyncPreviewItem['action']
      if (!existing) {
        action = 'create'
      } else if (existing.isCustomized) {
        action = 'skip_customized'
      } else {
        action = 'skip_exists'
      }

      return {
        revisionTypeId: rule.revisionTypeId,
        assetTypeAssignmentId: '', // filled by assignments — see note below
        code: rule.code,
        name: rule.name,
        effectiveIntervalDays: rule.effectiveIntervalDays,
        effectiveReminderDays: rule.effectiveReminderDays,
        effectiveGraceDays: rule.effectiveGraceDays,
        effectiveRequiresProtocol: rule.effectiveRequiresProtocol,
        isRequired: rule.isRequired,
        existingPlanId: existing?.id ?? null,
        existingPlanIsCustomized: existing?.isCustomized ?? false,
        action,
      }
    })
  }

  // ─── Execute sync ──────────────────────────────────────────────

  async executeSyncPlans(
    assetId: string,
    tenantId: string,
    opts: { skipCustomized: boolean; actorId?: string },
  ): Promise<SyncResult> {
    const asset = await this.resolveAsset(assetId, tenantId)

    // Load full assignments (we need the assetTypeAssignmentId)
    const assignments = await this.prisma.assetTypeRevisionType.findMany({
      where: { assetTypeId: asset.assetTypeId!, tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        revisionType: true,
      },
    })

    // Existing plans keyed by revisionTypeId
    const existingPlans = await this.prisma.revisionPlan.findMany({
      where: { assetId, tenantId },
      select: { id: true, revisionTypeId: true, isCustomized: true },
    })
    const existingByRevisionType = new Map(existingPlans.map((p) => [p.revisionTypeId, p]))

    // Find or create the RevisionSubject for this asset
    const subject = await this.findOrCreateSubjectForAsset(asset, tenantId)

    let created = 0
    let skipped = 0
    let skippedCustomized = 0

    for (const assignment of assignments) {
      const rt = assignment.revisionType
      const existing = existingByRevisionType.get(rt.id) ?? null

      if (existing) {
        if (opts.skipCustomized && existing.isCustomized) {
          skippedCustomized++
        } else {
          skipped++
        }
        continue
      }

      // Compute effective values
      const effectiveIntervalDays = assignment.intervalDaysOverride ?? rt.defaultIntervalDays
      const effectiveReminderDays = assignment.reminderDaysOverride ?? rt.defaultReminderDaysBefore

      const nextDueAt = new Date(Date.now() + effectiveIntervalDays * DAY_MS)

      await this.prisma.revisionPlan.create({
        data: {
          tenantId,
          propertyId: asset.propertyId ?? null,
          revisionSubjectId: subject.id,
          revisionTypeId: rt.id,
          assetId,
          assetTypeAssignmentId: assignment.id,
          title: `${asset.name} — ${rt.name}`,
          intervalDays: effectiveIntervalDays,
          reminderDaysBefore: effectiveReminderDays,
          nextDueAt,
          isMandatory: assignment.isRequired,
          generatedFromAssetType: true,
          isCustomized: false,
        },
      })
      created++
    }

    const result: SyncResult = { created, skipped, skippedCustomized }

    // Write audit log entry for the sync operation (best-effort)
    if (created > 0 || skippedCustomized > 0) {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: opts.actorId ?? null,
          action: 'SYNC_PLANS',
          entity: 'Asset',
          entityId: assetId,
          newData: result as any,
        },
      }).catch(() => { /* non-fatal */ })
    }

    return result
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private async resolveAsset(assetId: string, tenantId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId, deletedAt: null },
      select: {
        id: true, name: true, tenantId: true, propertyId: true,
        assetTypeId: true, manufacturer: true, model: true,
        serialNumber: true, location: true,
      },
    })
    if (!asset) throw new NotFoundException('Aktivum nenalezeno')
    if (!asset.assetTypeId) throw new BadRequestException('Aktivum nemá přiřazen typ zařízení')
    return asset
  }

  private async findOrCreateSubjectForAsset(
    asset: {
      id: string; name: string; tenantId: string; propertyId: string | null;
      manufacturer: string | null; model: string | null;
      serialNumber: string | null; location: string | null;
    },
    tenantId: string,
  ) {
    // Look for an existing subject already linked to this asset
    const existing = await this.prisma.revisionSubject.findFirst({
      where: { assetId: asset.id, tenantId },
    })
    if (existing) return existing

    // Create a new subject representing this asset
    return this.prisma.revisionSubject.create({
      data: {
        tenantId,
        assetId: asset.id,
        propertyId: asset.propertyId ?? null,
        name: asset.name,
        category: 'obecne',
        manufacturer: asset.manufacturer ?? undefined,
        model: asset.model ?? undefined,
        serialNumber: asset.serialNumber ?? undefined,
        location: asset.location ?? undefined,
      },
    })
  }
}

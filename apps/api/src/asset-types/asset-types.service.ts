import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'
import type {
  CreateAssetTypeDto, UpdateAssetTypeDto,
  CreateAssetTypeAssignmentDto, UpdateAssetTypeAssignmentDto,
} from './dto/asset-types.dto'

export interface EffectiveTemplateRule {
  revisionTypeId: string
  code: string
  name: string
  color: string | null
  isRequired: boolean
  effectiveIntervalDays: number
  effectiveReminderDays: number
  effectiveGraceDays: number
  effectiveRequiresProtocol: boolean
  effectiveRequiresSupplierSignature: boolean
  effectiveRequiresCustomerSignature: boolean
  note: string | null
  sortOrder: number
}

@Injectable()
export class AssetTypesService {
  constructor(private prisma: PrismaService) {}

  // ─── CRUD ──────────────────────────────────────────────────────

  async list(user: AuthUser) {
    return this.prisma.assetType.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { assets: true, activityAssignments: true } },
      },
    })
  }

  async getById(user: AuthUser, id: string) {
    const at = await this.prisma.assetType.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        _count: { select: { assets: true, activityAssignments: true } },
      },
    })
    if (!at) throw new NotFoundException('Typ zařízení nenalezen')
    return at
  }

  async create(user: AuthUser, dto: CreateAssetTypeDto) {
    const existing = await this.prisma.assetType.findUnique({
      where: { tenantId_code: { tenantId: user.tenantId, code: dto.code } },
    })
    if (existing) throw new ConflictException(`Typ zařízení s kódem "${dto.code}" již existuje`)

    return this.prisma.assetType.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        code: dto.code,
        category: dto.category || 'ostatni',
        description: dto.description,
        manufacturer: dto.manufacturer,
        model: dto.model,
        defaultLocationLabel: dto.defaultLocationLabel,
      },
      include: {
        _count: { select: { assets: true, activityAssignments: true } },
      },
    })
  }

  async update(user: AuthUser, id: string, dto: UpdateAssetTypeDto) {
    await this.getById(user, id)

    if (dto.code) {
      const existing = await this.prisma.assetType.findFirst({
        where: { tenantId: user.tenantId, code: dto.code, NOT: { id } },
      })
      if (existing) throw new ConflictException(`Typ zařízení s kódem "${dto.code}" již existuje`)
    }

    return this.prisma.assetType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.manufacturer !== undefined && { manufacturer: dto.manufacturer || null }),
        ...(dto.model !== undefined && { model: dto.model || null }),
        ...(dto.defaultLocationLabel !== undefined && { defaultLocationLabel: dto.defaultLocationLabel || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        _count: { select: { assets: true, activityAssignments: true } },
      },
    })
  }

  async remove(user: AuthUser, id: string) {
    const at = await this.prisma.assetType.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { _count: { select: { assets: true } } },
    })
    if (!at) throw new NotFoundException('Typ zařízení nenalezen')
    if (at._count.assets > 0) {
      throw new ConflictException(`Typ zařízení je přiřazen k ${at._count.assets} aktivům. Nejdříve odpojte aktiva.`)
    }

    await this.prisma.assetType.delete({ where: { id } })
    return { success: true }
  }

  // ─── Activity Template Assignments ─────────────────────────────

  async listAssignments(user: AuthUser, assetTypeId: string) {
    await this.getById(user, assetTypeId)

    return this.prisma.assetTypeRevisionType.findMany({
      where: { assetTypeId, tenantId: user.tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        revisionType: {
          select: {
            id: true, code: true, name: true, color: true,
            defaultIntervalDays: true, defaultReminderDaysBefore: true,
            requiresProtocol: true, requiresSupplierSignature: true,
            requiresCustomerSignature: true, graceDaysAfterEvent: true,
          },
        },
      },
    })
  }

  async createAssignment(user: AuthUser, assetTypeId: string, dto: CreateAssetTypeAssignmentDto) {
    await this.getById(user, assetTypeId)

    // Verify RevisionType belongs to same tenant
    const rt = await this.prisma.revisionType.findFirst({
      where: { id: dto.revisionTypeId, tenantId: user.tenantId },
    })
    if (!rt) throw new NotFoundException('Šablona činnosti nenalezena')

    // Check for duplicate
    const existing = await this.prisma.assetTypeRevisionType.findUnique({
      where: { assetTypeId_revisionTypeId: { assetTypeId, revisionTypeId: dto.revisionTypeId } },
    })
    if (existing) throw new ConflictException('Tato šablona činnosti je již přiřazena')

    return this.prisma.assetTypeRevisionType.create({
      data: {
        tenantId: user.tenantId,
        assetTypeId,
        revisionTypeId: dto.revisionTypeId,
        isRequired: dto.isRequired ?? true,
        intervalDaysOverride: dto.intervalDaysOverride,
        reminderDaysOverride: dto.reminderDaysOverride,
        graceDaysOverride: dto.graceDaysOverride,
        requiresProtocolOverride: dto.requiresProtocolOverride,
        requiresSupplierSignatureOverride: dto.requiresSupplierSignatureOverride,
        requiresCustomerSignatureOverride: dto.requiresCustomerSignatureOverride,
        note: dto.note,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        revisionType: {
          select: {
            id: true, code: true, name: true, color: true,
            defaultIntervalDays: true, defaultReminderDaysBefore: true,
            requiresProtocol: true, requiresSupplierSignature: true,
            requiresCustomerSignature: true, graceDaysAfterEvent: true,
          },
        },
      },
    })
  }

  async updateAssignment(user: AuthUser, assetTypeId: string, assignmentId: string, dto: UpdateAssetTypeAssignmentDto) {
    const assignment = await this.prisma.assetTypeRevisionType.findFirst({
      where: { id: assignmentId, assetTypeId, tenantId: user.tenantId },
    })
    if (!assignment) throw new NotFoundException('Přiřazení nenalezeno')

    return this.prisma.assetTypeRevisionType.update({
      where: { id: assignmentId },
      data: {
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.intervalDaysOverride !== undefined && { intervalDaysOverride: dto.intervalDaysOverride }),
        ...(dto.reminderDaysOverride !== undefined && { reminderDaysOverride: dto.reminderDaysOverride }),
        ...(dto.graceDaysOverride !== undefined && { graceDaysOverride: dto.graceDaysOverride }),
        ...(dto.requiresProtocolOverride !== undefined && { requiresProtocolOverride: dto.requiresProtocolOverride }),
        ...(dto.requiresSupplierSignatureOverride !== undefined && { requiresSupplierSignatureOverride: dto.requiresSupplierSignatureOverride }),
        ...(dto.requiresCustomerSignatureOverride !== undefined && { requiresCustomerSignatureOverride: dto.requiresCustomerSignatureOverride }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: {
        revisionType: {
          select: {
            id: true, code: true, name: true, color: true,
            defaultIntervalDays: true, defaultReminderDaysBefore: true,
            requiresProtocol: true, requiresSupplierSignature: true,
            requiresCustomerSignature: true, graceDaysAfterEvent: true,
          },
        },
      },
    })
  }

  async removeAssignment(user: AuthUser, assetTypeId: string, assignmentId: string) {
    const assignment = await this.prisma.assetTypeRevisionType.findFirst({
      where: { id: assignmentId, assetTypeId, tenantId: user.tenantId },
    })
    if (!assignment) throw new NotFoundException('Přiřazení nenalezeno')

    await this.prisma.assetTypeRevisionType.delete({ where: { id: assignmentId } })
    return { success: true }
  }

  // ─── Preview Plans (effective merged rules) ────────────────────

  async previewPlans(user: AuthUser, assetTypeId: string): Promise<EffectiveTemplateRule[]> {
    await this.getById(user, assetTypeId)
    return this.resolveAssetTypeTemplateRules(assetTypeId, user.tenantId)
  }

  async resolveAssetTypeTemplateRules(assetTypeId: string, tenantId: string): Promise<EffectiveTemplateRule[]> {
    const assignments = await this.prisma.assetTypeRevisionType.findMany({
      where: { assetTypeId, tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        revisionType: true,
      },
    })

    return assignments.map((a) => ({
      revisionTypeId: a.revisionType.id,
      code: a.revisionType.code,
      name: a.revisionType.name,
      color: a.revisionType.color,
      isRequired: a.isRequired,
      effectiveIntervalDays: a.intervalDaysOverride ?? a.revisionType.defaultIntervalDays,
      effectiveReminderDays: a.reminderDaysOverride ?? a.revisionType.defaultReminderDaysBefore,
      effectiveGraceDays: a.graceDaysOverride ?? a.revisionType.graceDaysAfterEvent,
      effectiveRequiresProtocol: a.requiresProtocolOverride ?? a.revisionType.requiresProtocol,
      effectiveRequiresSupplierSignature: a.requiresSupplierSignatureOverride ?? a.revisionType.requiresSupplierSignature,
      effectiveRequiresCustomerSignature: a.requiresCustomerSignatureOverride ?? a.revisionType.requiresCustomerSignature,
      note: a.note,
      sortOrder: a.sortOrder,
    }))
  }
}

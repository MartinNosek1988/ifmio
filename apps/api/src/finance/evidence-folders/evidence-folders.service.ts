import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import type { CreateEvidenceFolderDto, UpdateEvidenceFolderDto, CreateEvidenceAllocationDto, UpdateEvidenceAllocationDto } from './dto/evidence-folder.dto'

@Injectable()
export class EvidenceFoldersService {
  constructor(private prisma: PrismaService) {}

  // ─── FOLDERS CRUD ───────────────────────────────────────────

  async listFolders(tenantId: string, propertyId: string) {
    const rows = await this.prisma.evidenceFolder.findMany({
      where: { tenantId, propertyId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { allocations: true } },
        allocations: { select: { amount: true } },
      },
    })
    return rows.map(r => ({
      ...r,
      totalAllocated: r.allocations.reduce((s, a) => s + Number(a.amount), 0),
      allocations: undefined,
    }))
  }

  async createFolder(tenantId: string, dto: CreateEvidenceFolderDto) {
    return this.prisma.evidenceFolder.create({
      data: {
        tenantId,
        propertyId: dto.propertyId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
      },
    })
  }

  async updateFolder(tenantId: string, id: string, dto: UpdateEvidenceFolderDto) {
    const existing = await this.prisma.evidenceFolder.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Evidenční složka nenalezena')

    return this.prisma.evidenceFolder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    })
  }

  async deleteFolder(tenantId: string, id: string) {
    const existing = await this.prisma.evidenceFolder.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { allocations: true } } },
    })
    if (!existing) throw new NotFoundException('Evidenční složka nenalezena')
    if (existing._count.allocations > 0) {
      throw new ConflictException('Složka obsahuje náklady, nelze smazat')
    }
    await this.prisma.evidenceFolder.update({ where: { id }, data: { isActive: false } })
  }

  // ─── ALLOCATIONS ────────────────────────────────────────────

  async listAllocations(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')

    const rows = await this.prisma.evidenceFolderAllocation.findMany({
      where: { invoiceId },
      include: { evidenceFolder: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(r => ({ ...r, amount: Number(r.amount) }))
  }

  async createAllocation(tenantId: string, invoiceId: string, dto: CreateEvidenceAllocationDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')

    const row = await this.prisma.evidenceFolderAllocation.create({
      data: {
        evidenceFolderId: dto.evidenceFolderId,
        invoiceId,
        amount: new Decimal(dto.amount),
        year: dto.year,
        periodFrom: dto.periodFrom ? new Date(dto.periodFrom) : null,
        periodTo: dto.periodTo ? new Date(dto.periodTo) : null,
        note: dto.note,
      },
      include: { evidenceFolder: { select: { id: true, name: true, color: true } } },
    })

    await this.recalculateAllocationStatus(invoiceId)
    return { ...row, amount: Number(row.amount) }
  }

  async updateAllocation(tenantId: string, invoiceId: string, allocationId: string, dto: UpdateEvidenceAllocationDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')

    const existing = await this.prisma.evidenceFolderAllocation.findFirst({ where: { id: allocationId, invoiceId } })
    if (!existing) throw new NotFoundException('Alokace nenalezena')

    const data: Record<string, unknown> = {}
    if (dto.evidenceFolderId !== undefined) data.evidenceFolderId = dto.evidenceFolderId
    if (dto.amount !== undefined) data.amount = new Decimal(dto.amount)
    if (dto.year !== undefined) data.year = dto.year
    if (dto.periodFrom !== undefined) data.periodFrom = dto.periodFrom ? new Date(dto.periodFrom) : null
    if (dto.periodTo !== undefined) data.periodTo = dto.periodTo ? new Date(dto.periodTo) : null
    if (dto.note !== undefined) data.note = dto.note

    const row = await this.prisma.evidenceFolderAllocation.update({
      where: { id: allocationId },
      data,
      include: { evidenceFolder: { select: { id: true, name: true, color: true } } },
    })

    await this.recalculateAllocationStatus(invoiceId)
    return { ...row, amount: Number(row.amount) }
  }

  async deleteAllocation(tenantId: string, invoiceId: string, allocationId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId, deletedAt: null } })
    if (!invoice) throw new NotFoundException('Doklad nenalezen')

    const existing = await this.prisma.evidenceFolderAllocation.findFirst({ where: { id: allocationId, invoiceId } })
    if (!existing) throw new NotFoundException('Alokace nenalezena')

    await this.prisma.evidenceFolderAllocation.delete({ where: { id: allocationId } })
    await this.recalculateAllocationStatus(invoiceId)
  }

  // Shared recalculation — includes both allocation types
  async recalculateAllocationStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId } })
    if (!invoice) return

    const [costAgg, evidAgg] = await Promise.all([
      this.prisma.invoiceCostAllocation.aggregate({ where: { invoiceId }, _sum: { amount: true } }),
      this.prisma.evidenceFolderAllocation.aggregate({ where: { invoiceId }, _sum: { amount: true } }),
    ])
    const allocated = (costAgg._sum.amount ? Number(costAgg._sum.amount) : 0) + (evidAgg._sum.amount ? Number(evidAgg._sum.amount) : 0)
    const total = Number(invoice.amountTotal)

    let status = 'unallocated'
    if (allocated > 0 && allocated < total) status = 'partial'
    else if (allocated >= total) status = 'allocated'

    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { allocationStatus: status } })
  }
}

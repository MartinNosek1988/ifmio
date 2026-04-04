import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '@ifmio/shared-types'
import type { CreateInsuranceDto, UpdateInsuranceDto, CreateInsuranceClaimDto, UpdateInsuranceClaimDto } from './insurance.dto'

function serialize(item: any) {
  return {
    ...item,
    annualPremium: item.annualPremium ? Number(item.annualPremium) : null,
    insuredAmount: item.insuredAmount ? Number(item.insuredAmount) : null,
    deductible: item.deductible ? Number(item.deductible) : null,
    validFrom: item.validFrom?.toISOString() ?? null,
    validTo: item.validTo?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

function serializeClaim(item: any) {
  return {
    ...item,
    claimedAmount: item.claimedAmount ? Number(item.claimedAmount) : null,
    approvedAmount: item.approvedAmount ? Number(item.approvedAmount) : null,
    paidAmount: item.paidAmount ? Number(item.paidAmount) : null,
    eventDate: item.eventDate?.toISOString() ?? null,
    reportedDate: item.reportedDate?.toISOString() ?? null,
    paidDate: item.paidDate?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  // ── Insurance CRUD ──────────────────────────────────

  async findAll(user: AuthUser, propertyId: string) {
    const items = await this.prisma.insurance.findMany({
      where: { tenantId: user.tenantId, propertyId },
      include: { _count: { select: { claims: true } } },
      orderBy: { validFrom: 'desc' },
    })
    return items.map(serialize)
  }

  async findOne(user: AuthUser, id: string) {
    const item = await this.prisma.insurance.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { claims: { orderBy: { eventDate: 'desc' } } },
    })
    if (!item) throw new NotFoundException('Pojistka nenalezena')
    return {
      ...serialize(item),
      claims: item.claims.map(serializeClaim),
    }
  }

  async create(user: AuthUser, propertyId: string, dto: CreateInsuranceDto) {
    const item = await this.prisma.insurance.create({
      data: {
        tenantId: user.tenantId,
        propertyId,
        type: dto.type,
        provider: dto.provider,
        policyNumber: dto.policyNumber,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isActive: dto.isActive ?? true,
        annualPremium: dto.annualPremium,
        insuredAmount: dto.insuredAmount,
        deductible: dto.deductible,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        notes: dto.notes,
        createdBy: user.id,
      },
    })
    return serialize(item)
  }

  async update(user: AuthUser, id: string, dto: UpdateInsuranceDto) {
    await this.findOne(user, id)
    const item = await this.prisma.insurance.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.provider !== undefined && { provider: dto.provider }),
        ...(dto.policyNumber !== undefined && { policyNumber: dto.policyNumber }),
        ...(dto.validFrom !== undefined && { validFrom: new Date(dto.validFrom) }),
        ...(dto.validTo !== undefined && { validTo: dto.validTo ? new Date(dto.validTo) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.annualPremium !== undefined && { annualPremium: dto.annualPremium }),
        ...(dto.insuredAmount !== undefined && { insuredAmount: dto.insuredAmount }),
        ...(dto.deductible !== undefined && { deductible: dto.deductible }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    })
    return serialize(item)
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id)
    await this.prisma.insurance.delete({ where: { id } })
  }

  // ── Claims CRUD ─────────────────────────────────────

  async findClaims(user: AuthUser, insuranceId: string) {
    const items = await this.prisma.insuranceClaim.findMany({
      where: { tenantId: user.tenantId, insuranceId },
      orderBy: { eventDate: 'desc' },
    })
    return items.map(serializeClaim)
  }

  async createClaim(user: AuthUser, insuranceId: string, dto: CreateInsuranceClaimDto) {
    // Verify insurance exists and belongs to tenant
    const ins = await this.prisma.insurance.findFirst({ where: { id: insuranceId, tenantId: user.tenantId } })
    if (!ins) throw new NotFoundException('Pojistka nenalezena')

    const item = await this.prisma.insuranceClaim.create({
      data: {
        tenantId: user.tenantId,
        insuranceId,
        eventDate: new Date(dto.eventDate),
        reportedDate: dto.reportedDate ? new Date(dto.reportedDate) : null,
        description: dto.description,
        type: dto.type,
        claimedAmount: dto.claimedAmount,
        ticketId: dto.ticketId,
        workOrderId: dto.workOrderId,
        notes: dto.notes,
        createdBy: user.id,
      },
    })
    return serializeClaim(item)
  }

  async updateClaim(user: AuthUser, id: string, dto: UpdateInsuranceClaimDto) {
    const existing = await this.prisma.insuranceClaim.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) throw new NotFoundException('Pojistná událost nenalezena')

    const item = await this.prisma.insuranceClaim.update({
      where: { id },
      data: {
        ...(dto.claimNumber !== undefined && { claimNumber: dto.claimNumber }),
        ...(dto.eventDate !== undefined && { eventDate: new Date(dto.eventDate) }),
        ...(dto.reportedDate !== undefined && { reportedDate: dto.reportedDate ? new Date(dto.reportedDate) : null }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.claimedAmount !== undefined && { claimedAmount: dto.claimedAmount }),
        ...(dto.approvedAmount !== undefined && { approvedAmount: dto.approvedAmount }),
        ...(dto.paidAmount !== undefined && { paidAmount: dto.paidAmount }),
        ...(dto.paidDate !== undefined && { paidDate: dto.paidDate ? new Date(dto.paidDate) : null }),
        ...(dto.ticketId !== undefined && { ticketId: dto.ticketId }),
        ...(dto.workOrderId !== undefined && { workOrderId: dto.workOrderId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    })
    return serializeClaim(item)
  }

  async removeClaim(user: AuthUser, id: string) {
    const existing = await this.prisma.insuranceClaim.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) throw new NotFoundException('Pojistná událost nenalezena')
    await this.prisma.insuranceClaim.delete({ where: { id } })
  }

  // ── Dashboard — expiring policies ───────────────────

  async getExpiringCount(user: AuthUser, daysAhead = 60): Promise<number> {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + daysAhead)
    return this.prisma.insurance.count({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        validTo: { not: null, lte: deadline },
      },
    })
  }
}

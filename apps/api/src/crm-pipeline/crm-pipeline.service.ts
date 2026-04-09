import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { CreateCrmLeadDto, UpdateCrmLeadDto, AddActivityDto } from './dto/crm.dto';
import type { CrmStage, CrmLeadType, CrmPriority } from '@prisma/client';

function serializeLead(lead: any) {
  if (!lead) return lead;
  return {
    ...lead,
    estimatedMrr: lead.estimatedMrr instanceof Decimal
      ? lead.estimatedMrr.toNumber()
      : lead.estimatedMrr,
  };
}

function serializeLeads(leads: any[]) {
  return leads.map(serializeLead);
}

const ACTIVE_STAGES: CrmStage[] = [
  'new_lead', 'contacted', 'demo_scheduled', 'demo_done', 'trial', 'negotiation',
];

@Injectable()
export class CrmPipelineService {
  private readonly logger = new Logger(CrmPipelineService.name);

  constructor(private prisma: PrismaService) {}

  async list(query: {
    page?: number;
    limit?: number;
    stage?: string;
    leadType?: string;
    priority?: string;
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.stage) where.stage = query.stage;
    if (query.leadType) where.leadType = query.leadType;
    if (query.priority) where.priority = query.priority;
    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { ico: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.crmLead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { kbOrganization: { select: { id: true, name: true, ico: true, orgType: true } } },
      }),
      this.prisma.crmLead.count({ where }),
    ]);

    return {
      data: serializeLeads(data),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async stats() {
    const [byStagRaw, totalMrrRaw, wonCount] = await Promise.all([
      this.prisma.crmLead.groupBy({
        by: ['stage'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.crmLead.aggregate({
        where: { deletedAt: null, stage: { in: ACTIVE_STAGES } },
        _sum: { estimatedMrr: true },
      }),
      this.prisma.crmLead.count({ where: { stage: 'won', deletedAt: null } }),
    ]);

    const byStage = byStagRaw.map((s) => ({ stage: s.stage, count: s._count }));
    const totalPipelineMrr = totalMrrRaw._sum.estimatedMrr
      ? new Decimal(totalMrrRaw._sum.estimatedMrr as any).toNumber()
      : 0;

    return { byStage, totalPipelineMrr, wonCount };
  }

  async getKanban(filters?: { leadType?: string; priority?: string }) {
    const where: any = { deletedAt: null, stage: { in: ACTIVE_STAGES } };
    if (filters?.leadType) where.leadType = filters.leadType;
    if (filters?.priority) where.priority = filters.priority;

    const leads = await this.prisma.crmLead.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { kbOrganization: { select: { id: true, name: true, ico: true, orgType: true } } },
    });

    const grouped: Record<string, any[]> = {};
    for (const stage of ACTIVE_STAGES) {
      grouped[stage] = [];
    }
    for (const lead of leads) {
      const stage = lead.stage as string;
      if (grouped[stage]) {
        grouped[stage].push(serializeLead(lead));
      }
    }

    return grouped;
  }

  async getById(id: string) {
    const lead = await this.prisma.crmLead.findUnique({
      where: { id },
      include: {
        kbOrganization: { select: { id: true, name: true, ico: true, orgType: true, city: true } },
        activities: { orderBy: { occurredAt: 'desc' }, take: 50 },
      },
    });
    if (!lead || lead.deletedAt) throw new NotFoundException('Lead not found');
    return serializeLead(lead);
  }

  async create(dto: CreateCrmLeadDto, userId: string) {
    const lead = await this.prisma.crmLead.create({
      data: {
        companyName: dto.companyName,
        kbOrganizationId: dto.kbOrganizationId,
        ico: dto.ico,
        address: dto.address,
        city: dto.city,
        leadType: dto.leadType as CrmLeadType,
        priority: (dto.priority as CrmPriority) || 'medium',
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactRole: dto.contactRole,
        estimatedUnits: dto.estimatedUnits,
        estimatedMrr: dto.estimatedMrr != null ? new Decimal(dto.estimatedMrr) : undefined,
        source: dto.source,
        note: dto.note,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
        assignedTo: userId,
      },
    });
    return serializeLead(lead);
  }

  async update(id: string, dto: UpdateCrmLeadDto) {
    const existing = await this.prisma.crmLead.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Lead not found');
    if (existing.stage === 'won' || existing.stage === 'lost') {
      throw new BadRequestException('Cannot update a closed lead');
    }

    const data: any = {};
    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.kbOrganizationId !== undefined) data.kbOrganizationId = dto.kbOrganizationId;
    if (dto.ico !== undefined) data.ico = dto.ico;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.leadType !== undefined) data.leadType = dto.leadType;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.contactName !== undefined) data.contactName = dto.contactName;
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.contactRole !== undefined) data.contactRole = dto.contactRole;
    if (dto.estimatedUnits !== undefined) data.estimatedUnits = dto.estimatedUnits;
    if (dto.estimatedMrr !== undefined) data.estimatedMrr = dto.estimatedMrr != null ? new Decimal(dto.estimatedMrr) : null;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.nextFollowUpAt !== undefined) data.nextFollowUpAt = dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null;

    const lead = await this.prisma.crmLead.update({ where: { id }, data });
    return serializeLead(lead);
  }

  async remove(id: string) {
    const existing = await this.prisma.crmLead.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Lead not found');

    await this.prisma.crmLead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async changeStage(id: string, stage: string, userId: string, closedReason?: string) {
    const existing = await this.prisma.crmLead.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Lead not found');

    const oldStage = existing.stage;
    const data: any = { stage: stage as CrmStage };

    if (stage === 'won' || stage === 'lost') {
      data.closedAt = new Date();
      if (closedReason) data.closedReason = closedReason;
    }

    const [lead] = await this.prisma.$transaction([
      this.prisma.crmLead.update({ where: { id }, data }),
      this.prisma.crmActivity.create({
        data: {
          leadId: id,
          type: 'stage_change',
          title: `Stage changed: ${oldStage} → ${stage}`,
          createdBy: userId,
        },
      }),
    ]);

    return serializeLead(lead);
  }

  async addActivity(leadId: string, dto: AddActivityDto, userId: string) {
    const existing = await this.prisma.crmLead.findUnique({ where: { id: leadId } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Lead not found');

    const [activity] = await this.prisma.$transaction([
      this.prisma.crmActivity.create({
        data: {
          leadId,
          type: dto.type as any,
          title: dto.title,
          body: dto.body,
          createdBy: userId,
        },
      }),
      this.prisma.crmLead.update({
        where: { id: leadId },
        data: { lastContactedAt: new Date() },
      }),
    ]);

    return activity;
  }

  async getKbCandidates(query?: { search?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 25;
    const skip = (page - 1) * limit;

    // Find KB orgs of type SVJ/BD that don't have a CRM lead yet
    const where: any = {
      orgType: { in: ['SVJ', 'BD'] },
      crmLeads: { none: {} },
    };
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { ico: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.kbOrganization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, ico: true, name: true, city: true, orgType: true, legalFormName: true },
      }),
      this.prisma.kbOrganization.count({ where }),
    ]);

    return { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
  }

  async importFromKb(ids: string[]) {
    if (!ids.length) throw new BadRequestException('No IDs provided');

    const orgs = await this.prisma.kbOrganization.findMany({
      where: { id: { in: ids } },
      select: { id: true, ico: true, name: true, city: true, orgType: true },
    });

    if (!orgs.length) throw new NotFoundException('No matching organizations found');

    const leads = await this.prisma.crmLead.createMany({
      data: orgs.map((org) => ({
        kbOrganizationId: org.id,
        companyName: org.name,
        ico: org.ico,
        city: org.city ?? undefined,
        leadType: org.orgType === 'SVJ' ? 'svj_direct' as const : org.orgType === 'BD' ? 'bd_direct' as const : 'other' as const,
        stage: 'new_lead' as const,
        priority: 'medium' as const,
        source: 'kb_import',
      })),
      skipDuplicates: true,
    });

    return { imported: leads.count, total: orgs.length };
  }
}

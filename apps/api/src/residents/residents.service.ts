import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class ResidentsService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async findAll(user: AuthUser, query: QueryResidentDto) {
    const { search, role, propertyId, hasDebt, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const where: Prisma.ResidentWhereInput = {
      tenantId: user.tenantId,
      isActive: true,
      gdprErased: false,
      ...scopeWhere,
      ...(role ? { role: role as Prisma.EnumResidentRoleFilter } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(hasDebt !== undefined ? { hasDebt } : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.resident.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: limit,
        skip,
        include: {
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          party: { select: { id: true, displayName: true, type: true, ic: true, email: true, phone: true } },
          occupancies: {
            where: { isActive: true },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.resident.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        party: { select: { id: true, displayName: true, type: true, ic: true, email: true, phone: true } },
        occupancies: {
          include: { unit: { select: { id: true, name: true } } },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!resident) throw new NotFoundException(`Resident ${id} nenalezen`);
    await this.scope.verifyEntityAccess(user, resident.propertyId);
    return resident;
  }

  async create(user: AuthUser, dto: CreateResidentDto) {
    if (dto.propertyId) {
      await this.scope.verifyPropertyAccess(user, dto.propertyId);
    }

    // Auto-create or link Party
    const partyId = await this.findOrCreateParty(user.tenantId, dto);

    return this.prisma.resident.create({
      data: {
        tenantId: user.tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        isLegalEntity: dto.isLegalEntity,
        ico: dto.ico,
        dic: dto.dic,
        companyName: dto.companyName,
        correspondenceAddress: dto.correspondenceAddress,
        correspondenceCity: dto.correspondenceCity,
        correspondencePostalCode: dto.correspondencePostalCode,
        dataBoxId: dto.dataBoxId,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        note: dto.note,
        partyId,
      },
      include: {
        party: { select: { id: true, displayName: true, type: true } },
      },
    });
  }

  private async findOrCreateParty(tenantId: string, dto: CreateResidentDto): Promise<string> {
    const displayName = dto.isLegalEntity && dto.companyName
      ? dto.companyName
      : [dto.lastName, dto.firstName].filter(Boolean).join(' ')
    const type = dto.isLegalEntity ? 'company' : 'person'

    // Try match by IČ
    if (dto.ico) {
      const existing = await this.prisma.party.findFirst({
        where: { tenantId, ic: dto.ico, isActive: true },
      })
      if (existing) return existing.id
    }

    // Try match by email
    if (dto.email) {
      const existing = await this.prisma.party.findFirst({
        where: { tenantId, email: dto.email, isActive: true },
      })
      if (existing) return existing.id
    }

    // Create new Party
    const party = await this.prisma.party.create({
      data: {
        tenantId,
        type: type as any,
        displayName,
        firstName: dto.firstName || undefined,
        lastName: dto.lastName || undefined,
        companyName: dto.companyName || undefined,
        ic: dto.ico || undefined,
        dic: dto.dic || undefined,
        email: dto.email || undefined,
        phone: dto.phone || undefined,
        street: dto.correspondenceAddress || undefined,
        city: dto.correspondenceCity || undefined,
        postalCode: dto.correspondencePostalCode || undefined,
        dataBoxId: dto.dataBoxId || undefined,
      },
    })
    return party.id
  }

  async update(user: AuthUser, id: string, dto: UpdateResidentDto) {
    await this.findOne(user, id);
    return this.prisma.resident.update({
      where: { id },
      data: dto as Prisma.ResidentUpdateInput,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.resident.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async bulkDeactivate(user: AuthUser, ids: string[]) {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const result = await this.prisma.resident.updateMany({
      where: { id: { in: ids }, tenantId: user.tenantId, ...scopeWhere },
      data: { isActive: false },
    });
    return { affected: result.count };
  }

  async bulkActivate(user: AuthUser, ids: string[]) {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const result = await this.prisma.resident.updateMany({
      where: { id: { in: ids }, tenantId: user.tenantId, ...scopeWhere },
      data: { isActive: true },
    });
    return { affected: result.count };
  }

  async bulkAssignProperty(user: AuthUser, ids: string[], propertyId: string) {
    await this.scope.verifyPropertyAccess(user, propertyId);
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const result = await this.prisma.resident.updateMany({
      where: { id: { in: ids }, tenantId: user.tenantId, ...scopeWhere },
      data: { propertyId },
    });
    return { affected: result.count };
  }

  async bulkMarkAsDebtors(user: AuthUser, ids: string[], hasDebt: boolean) {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const result = await this.prisma.resident.updateMany({
      where: { id: { in: ids }, tenantId: user.tenantId, ...scopeWhere },
      data: { hasDebt },
    });
    return { affected: result.count };
  }

  async findDebtors(user: AuthUser) {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    return this.prisma.resident.findMany({
      where: { tenantId: user.tenantId, hasDebt: true, isActive: true, ...scopeWhere },
      orderBy: { lastName: 'asc' },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    });
  }
}

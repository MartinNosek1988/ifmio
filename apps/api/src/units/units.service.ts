import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { BuildingUnitMatchingService } from '../knowledge-base/building-unit-matching.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateOccupancyDto } from './dto/create-occupancy.dto';
import type { SpaceType } from '@prisma/client';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private matching: BuildingUnitMatchingService,
  ) {}

  private async verifyProperty(user: AuthUser, propertyId: string) {
    await this.scope.verifyPropertyAccess(user, propertyId);
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: user.tenantId },
    });
    if (!property) throw new NotFoundException('Nemovitost nenalezena');
    return property;
  }

  async findAll(user: AuthUser, propertyId: string) {
    await this.verifyProperty(user, propertyId);
    return this.prisma.unit.findMany({
      where: { propertyId },
      orderBy: { name: 'asc' },
      include: {
        occupancies: {
          where: { isActive: true },
          include: { resident: true },
          orderBy: { startDate: 'desc' },
        },
        _count: { select: { occupancies: true } },
      },
    });
  }

  async findOne(user: AuthUser, propertyId: string, id: string) {
    await this.verifyProperty(user, propertyId);
    const unit = await this.prisma.unit.findFirst({
      where: { id, propertyId },
      include: {
        occupancies: {
          include: { resident: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!unit) throw new NotFoundException(`Jednotka ${id} nenalezena`);
    return unit;
  }

  async create(user: AuthUser, propertyId: string, dto: CreateUnitDto) {
    await this.verifyProperty(user, propertyId);
    const { validFrom, validTo, spaceType, ...rest } = dto;
    const created = await this.prisma.unit.create({
      data: {
        propertyId,
        ...rest,
        spaceType: spaceType as SpaceType | undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validTo: validTo ? new Date(validTo) : undefined,
      },
    });

    // Auto-link to KB BuildingUnit (best-effort)
    try {
      const matchId = await this.matching.findMatch({
        name: created.name,
        knDesignation: created.knDesignation ?? null,
        propertyId,
      });
      if (matchId) {
        const updated = await this.prisma.unit.update({
          where: { id: created.id },
          data: { buildingUnitId: matchId },
        });
        this.logger.log(`Auto-linked Unit ${created.id} -> BuildingUnit ${matchId}`);
        return updated;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`BuildingUnit matching failed for unit ${created.id}: ${msg}`);
      if (err instanceof Error && err.stack) this.logger.debug(err.stack);
    }

    return created;
  }

  async update(user: AuthUser, propertyId: string, id: string, dto: UpdateUnitDto) {
    await this.findOne(user, propertyId, id);
    const { validFrom, validTo, spaceType, ...rest } = dto;
    return this.prisma.unit.update({
      where: { id },
      data: {
        ...rest,
        ...(spaceType !== undefined && { spaceType: spaceType as SpaceType }),
        ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
        ...(validTo !== undefined && { validTo: validTo ? new Date(validTo) : null }),
      },
    });
  }

  async remove(user: AuthUser, propertyId: string, id: string) {
    await this.findOne(user, propertyId, id);
    await this.prisma.unit.delete({ where: { id } });
  }

  async addOccupancy(
    user: AuthUser, propertyId: string,
    unitId: string, dto: CreateOccupancyDto,
  ) {
    const property = await this.verifyProperty(user, propertyId);
    await this.findOne(user, propertyId, unitId);

    const newStart = new Date(dto.startDate);

    // ── Validation: ownership share sum ──
    if (dto.ownershipShare !== undefined && dto.role === 'owner') {
      const existing = await this.prisma.occupancy.findMany({
        where: { unitId, role: 'owner', isActive: true },
        select: { ownershipShare: true },
      });
      const currentSum = existing.reduce((s, o) => s + Number(o.ownershipShare ?? 1), 0);
      if (currentSum + dto.ownershipShare > 1.001) {
        throw new BadRequestException('Součet podílů vlastníků překračuje 100%.');
      }
    }

    // ── SVJ gap prevention ──
    if (property.legalMode === 'SVJ' && dto.role === 'owner') {
      const lastOwner = await this.prisma.occupancy.findFirst({
        where: { unitId, role: 'owner', isActive: false },
        orderBy: { endDate: 'desc' },
        select: { endDate: true },
      });
      if (lastOwner?.endDate) {
        const gap = newStart.getTime() - lastOwner.endDate.getTime();
        if (gap > 86_400_000) { // more than 1 day gap
          throw new BadRequestException(
            'SVJ jednotka nemůže mít období bez vlastníka. Nastavte endDate předchozího vlastníka shodně se startDate nového vlastníka.',
          );
        }
      }
    }

    // ── Auto-close previous active occupancy of same role ──
    await this.prisma.occupancy.updateMany({
      where: { unitId, role: dto.role, isActive: true },
      data: { isActive: false, endDate: newStart },
    });

    // ── Auto-generate VS if not provided ──
    let vs = dto.variableSymbol;
    if (!vs) {
      vs = await this.generateVs(user.tenantId, propertyId);
    }

    const occupancy = await this.prisma.occupancy.create({
      data: {
        tenantId: user.tenantId,
        unitId,
        residentId: dto.residentId,
        role: dto.role,
        startDate: newStart,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        ownershipShare: dto.ownershipShare,
        personCount: dto.personCount,
        isPrimaryPayer: dto.isPrimaryPayer ?? true,
        variableSymbol: vs,
        note: dto.note,
        isActive: true,
      },
      include: { resident: true },
    });

    await this.prisma.unit.update({
      where: { id: unitId },
      data: { isOccupied: true },
    });

    return occupancy;
  }

  async endOccupancy(
    user: AuthUser, propertyId: string,
    unitId: string, occupancyId: string,
  ) {
    await this.findOne(user, propertyId, unitId);
    const occupancy = await this.prisma.occupancy.findFirst({
      where: { id: occupancyId, unitId },
    });
    if (!occupancy) throw new NotFoundException('Occupancy nenalezena');

    const updated = await this.prisma.occupancy.update({
      where: { id: occupancyId },
      data: { isActive: false, endDate: new Date() },
    });

    const active = await this.prisma.occupancy.count({
      where: { unitId, isActive: true },
    });
    if (active === 0) {
      await this.prisma.unit.update({
        where: { id: unitId },
        data: { isOccupied: false },
      });
    }

    return updated;
  }

  // ─── VS GENERATOR ────────────────────────────────────────────

  private async generateVs(tenantId: string, propertyId: string): Promise<string> {
    // Sequential strategy: find max numeric VS in property, add 1
    const existing = await this.prisma.occupancy.findMany({
      where: {
        tenantId,
        unit: { propertyId },
        variableSymbol: { not: null },
      },
      select: { variableSymbol: true },
    });

    let maxNum = 0;
    for (const o of existing) {
      const num = parseInt(o.variableSymbol ?? '0', 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }

    return String(maxNum + 1).padStart(6, '0');
  }
}

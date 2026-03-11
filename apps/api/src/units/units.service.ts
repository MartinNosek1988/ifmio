import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateOccupancyDto } from './dto/create-occupancy.dto';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  private async verifyProperty(tenantId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    });
    if (!property) throw new NotFoundException('Nemovitost nenalezena');
    return property;
  }

  async findAll(user: AuthUser, propertyId: string) {
    await this.verifyProperty(user.tenantId, propertyId);
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
    await this.verifyProperty(user.tenantId, propertyId);
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
    await this.verifyProperty(user.tenantId, propertyId);
    return this.prisma.unit.create({
      data: { propertyId, ...dto },
    });
  }

  async update(user: AuthUser, propertyId: string, id: string, dto: UpdateUnitDto) {
    await this.findOne(user, propertyId, id);
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser, propertyId: string, id: string) {
    await this.findOne(user, propertyId, id);
    await this.prisma.unit.delete({ where: { id } });
  }

  async addOccupancy(
    user: AuthUser, propertyId: string,
    unitId: string, dto: CreateOccupancyDto,
  ) {
    await this.findOne(user, propertyId, unitId);

    // End previous active occupancy of same role
    await this.prisma.occupancy.updateMany({
      where: { unitId, role: dto.role, isActive: true },
      data: { isActive: false, endDate: new Date(dto.startDate) },
    });

    const occupancy = await this.prisma.occupancy.create({
      data: {
        tenantId: user.tenantId,
        unitId,
        residentId: dto.residentId,
        role: dto.role,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
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
}

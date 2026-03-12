import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import type { PropertyType, OwnershipType } from '@prisma/client';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  create(tenantId: string, dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        type: dto.type as PropertyType,
        ownership: dto.ownership as OwnershipType,
      },
      include: { units: true },
    });
  }

  async findAll(user: AuthUser) {
    const ids = await this.scope.getAccessiblePropertyIds(user);
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      status: { not: 'archived' },
    };
    if (ids !== null) {
      where.id = { in: ids };
    }

    return this.prisma.property.findMany({
      where,
      include: { units: true, _count: { select: { residents: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    await this.scope.verifyPropertyAccess(user, id);

    const property = await this.prisma.property.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { units: true, _count: { select: { residents: true } } },
    });
    if (!property) throw new NotFoundException('Nemovitost nenalezena');
    return property;
  }

  async update(user: AuthUser, id: string, dto: UpdatePropertyDto) {
    await this.findOne(user, id);
    return this.prisma.property.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.type !== undefined && { type: dto.type as PropertyType }),
        ...(dto.ownership !== undefined && { ownership: dto.ownership as OwnershipType }),
      },
      include: { units: true },
    });
  }

  async archive(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.property.update({
      where: { id },
      data: { status: 'archived' },
    });
  }
}

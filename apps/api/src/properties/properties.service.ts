import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import type { PropertyType, OwnershipType } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

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

  findAll(tenantId: string) {
    return this.prisma.property.findMany({
      where: { tenantId, status: { not: 'archived' } },
      include: { units: true, _count: { select: { residents: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId },
      include: { units: true, _count: { select: { residents: true } } },
    });
    if (!property) throw new NotFoundException('Nemovitost nenalezena');
    return property;
  }

  async update(tenantId: string, id: string, dto: UpdatePropertyDto) {
    await this.findOne(tenantId, id);
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

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.property.update({
      where: { id },
      data: { status: 'archived' },
    });
  }
}

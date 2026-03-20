import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { CreateUnitGroupDto, UpdateUnitGroupDto } from './dto/unit-group.dto'
import type { UnitGroupType } from '@prisma/client'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class UnitGroupsService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  private async verifyProperty(user: AuthUser, propertyId: string) {
    await this.scope.verifyPropertyAccess(user, propertyId)
    const p = await this.prisma.property.findFirst({ where: { id: propertyId, tenantId: user.tenantId } })
    if (!p) throw new NotFoundException('Nemovitost nenalezena')
    return p
  }

  async findAll(user: AuthUser, propertyId: string) {
    await this.verifyProperty(user, propertyId)
    return this.prisma.unitGroup.findMany({
      where: { propertyId, tenantId: user.tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        memberships: {
          include: { unit: { select: { id: true, name: true, knDesignation: true, spaceType: true, floor: true } } },
        },
      },
    })
  }

  async create(user: AuthUser, propertyId: string, dto: CreateUnitGroupDto) {
    await this.verifyProperty(user, propertyId)
    return this.prisma.unitGroup.create({
      data: {
        tenantId: user.tenantId,
        propertyId,
        name: dto.name,
        type: (dto.type as UnitGroupType) ?? 'custom',
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { memberships: { include: { unit: { select: { id: true, name: true } } } } },
    })
  }

  async update(user: AuthUser, propertyId: string, id: string, dto: UpdateUnitGroupDto) {
    await this.verifyProperty(user, propertyId)
    const group = await this.prisma.unitGroup.findFirst({ where: { id, propertyId, tenantId: user.tenantId } })
    if (!group) throw new NotFoundException('Skupina nenalezena')

    return this.prisma.unitGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type as UnitGroupType }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: { memberships: { include: { unit: { select: { id: true, name: true } } } } },
    })
  }

  async remove(user: AuthUser, propertyId: string, id: string) {
    await this.verifyProperty(user, propertyId)
    const group = await this.prisma.unitGroup.findFirst({ where: { id, propertyId, tenantId: user.tenantId } })
    if (!group) throw new NotFoundException('Skupina nenalezena')
    await this.prisma.unitGroup.delete({ where: { id } })
  }

  async addUnits(user: AuthUser, propertyId: string, groupId: string, unitIds: string[]) {
    await this.verifyProperty(user, propertyId)
    const group = await this.prisma.unitGroup.findFirst({ where: { id: groupId, propertyId, tenantId: user.tenantId } })
    if (!group) throw new NotFoundException('Skupina nenalezena')

    // Verify units belong to this property
    const units = await this.prisma.unit.findMany({ where: { id: { in: unitIds }, propertyId } })
    const validIds = units.map(u => u.id)

    await this.prisma.unitGroupMembership.createMany({
      data: validIds.map(unitId => ({ unitGroupId: groupId, unitId })),
      skipDuplicates: true,
    })

    return this.prisma.unitGroup.findUnique({
      where: { id: groupId },
      include: { memberships: { include: { unit: { select: { id: true, name: true } } } } },
    })
  }

  async removeUnit(user: AuthUser, propertyId: string, groupId: string, unitId: string) {
    await this.verifyProperty(user, propertyId)
    const membership = await this.prisma.unitGroupMembership.findFirst({
      where: { unitGroupId: groupId, unitId, unitGroup: { tenantId: user.tenantId } },
    })
    if (!membership) throw new NotFoundException('Členství nenalezeno')
    await this.prisma.unitGroupMembership.delete({ where: { id: membership.id } })
  }

  async autoCreateByEntrance(user: AuthUser, propertyId: string) {
    const property = await this.verifyProperty(user, propertyId)
    const units = await this.prisma.unit.findMany({ where: { propertyId }, select: { id: true, knDesignation: true, name: true } })

    // Group by cadastral number prefix (part before "/" in knDesignation)
    const groups = new Map<string, string[]>()
    for (const unit of units) {
      const prefix = unit.knDesignation?.split('/')[0]?.trim() || 'Ostatní'
      if (!groups.has(prefix)) groups.set(prefix, [])
      groups.get(prefix)!.push(unit.id)
    }

    const created: string[] = []
    let sortOrder = 0
    for (const [prefix, unitIds] of groups) {
      const name = prefix === 'Ostatní' ? 'Ostatní' : `Č.p. ${prefix}`
      const group = await this.prisma.unitGroup.create({
        data: {
          tenantId: user.tenantId,
          propertyId,
          name,
          type: 'entrance',
          sortOrder: sortOrder++,
        },
      })
      await this.prisma.unitGroupMembership.createMany({
        data: unitIds.map(unitId => ({ unitGroupId: group.id, unitId })),
        skipDuplicates: true,
      })
      created.push(group.id)
    }

    return { created: created.length, groups: created }
  }
}

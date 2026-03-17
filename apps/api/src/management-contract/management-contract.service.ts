import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateManagementContractDto } from './dto/create-management-contract.dto'
import type { UpdateManagementContractDto } from './dto/update-management-contract.dto'
import type { ManagementType, ManagementScope } from '@prisma/client'

@Injectable()
export class ManagementContractService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateManagementContractDto) {
    const principal = await this.prisma.principal.findFirst({
      where: { id: dto.principalId, tenantId },
    })
    if (!principal) throw new NotFoundException('Principál nenalezen')

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, tenantId },
    })
    if (!property) throw new NotFoundException('Nemovitost nenalezena')

    const scope = (dto.scope ?? 'whole_property') as ManagementScope

    const contract = await this.prisma.managementContract.create({
      data: {
        tenantId,
        principalId: dto.principalId,
        propertyId: dto.propertyId,
        type: dto.type as ManagementType,
        scope,
        contractNo: dto.contractNo,
        name: dto.name,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        isActive: dto.isActive ?? true,
        note: dto.note,
      },
      include: {
        principal: { select: { id: true, displayName: true } },
        property: { select: { id: true, name: true, address: true } },
      },
    })

    if (scope === 'selected_units' && dto.unitIds?.length) {
      await this.prisma.managementContractUnit.createMany({
        data: dto.unitIds.map(unitId => ({
          tenantId,
          managementContractId: contract.id,
          unitId,
        })),
      })
    }

    return contract
  }

  async findAll(tenantId: string, query?: { principalId?: string; propertyId?: string; type?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = { tenantId }
    if (query?.principalId) where.principalId = query.principalId
    if (query?.propertyId) where.propertyId = query.propertyId
    if (query?.type) where.type = query.type
    if (query?.isActive !== undefined) where.isActive = query.isActive
    else where.isActive = true

    return this.prisma.managementContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        principal: { select: { id: true, displayName: true } },
        property: { select: { id: true, name: true, address: true } },
        _count: { select: { units: true } },
      },
    })
  }

  async findOne(tenantId: string, id: string) {
    const contract = await this.prisma.managementContract.findFirst({
      where: { id, tenantId },
      include: {
        principal: { include: { party: true } },
        property: true,
        units: { include: { unit: { select: { id: true, name: true, floor: true, area: true } } } },
        financialContexts: {
          select: { id: true, displayName: true, code: true, scopeType: true, isActive: true },
        },
      },
    })
    if (!contract) throw new NotFoundException('Smlouva nenalezena')
    return contract
  }

  async update(tenantId: string, id: string, dto: UpdateManagementContractDto) {
    const existing = await this.prisma.managementContract.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Smlouva nenalezena')

    const data: Record<string, unknown> = {}
    if (dto.type !== undefined) data.type = dto.type
    if (dto.scope !== undefined) data.scope = dto.scope
    if (dto.contractNo !== undefined) data.contractNo = dto.contractNo
    if (dto.name !== undefined) data.name = dto.name
    if (dto.validFrom !== undefined) data.validFrom = dto.validFrom ? new Date(dto.validFrom) : null
    if (dto.validTo !== undefined) data.validTo = dto.validTo ? new Date(dto.validTo) : null
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    if (dto.note !== undefined) data.note = dto.note

    // If scope changed to whole_property → remove unit records
    if (dto.scope === 'whole_property' && existing.scope !== 'whole_property') {
      await this.prisma.managementContractUnit.deleteMany({
        where: { managementContractId: id },
      })
    }

    // If unitIds provided → replace units
    if (dto.unitIds) {
      await this.prisma.managementContractUnit.deleteMany({
        where: { managementContractId: id },
      })
      if (dto.unitIds.length > 0) {
        await this.prisma.managementContractUnit.createMany({
          data: dto.unitIds.map(unitId => ({
            tenantId,
            managementContractId: id,
            unitId,
          })),
        })
      }
    }

    return this.prisma.managementContract.update({
      where: { id },
      data,
      include: {
        principal: { select: { id: true, displayName: true } },
        property: { select: { id: true, name: true, address: true } },
        _count: { select: { units: true } },
      },
    })
  }

  async remove(tenantId: string, id: string) {
    const contract = await this.prisma.managementContract.findFirst({ where: { id, tenantId } })
    if (!contract) throw new NotFoundException('Smlouva nenalezena')

    const activeFCs = await this.prisma.financialContext.count({
      where: { managementContractId: id, isActive: true },
    })
    if (activeFCs > 0) {
      throw new ConflictException('Nelze deaktivovat smlouvu s aktivními finančními kontexty')
    }

    await this.prisma.managementContract.update({ where: { id }, data: { isActive: false } })
  }

  async getByProperty(tenantId: string, propertyId: string) {
    return this.prisma.managementContract.findMany({
      where: { tenantId, propertyId, isActive: true },
      include: {
        principal: { select: { id: true, displayName: true } },
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}

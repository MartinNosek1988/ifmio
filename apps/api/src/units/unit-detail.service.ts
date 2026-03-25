import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class UnitDetailService {
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  private async verifyUnit(user: AuthUser, propertyId: string, unitId: string) {
    await this.scope.verifyPropertyAccess(user, propertyId)
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, propertyId, property: { tenantId: user.tenantId } },
    })
    if (!unit) throw new NotFoundException('Jednotka nenalezena')
    return unit
  }

  // ─── Unit navigation ───────────────────────────────────────

  async getUnitNav(user: AuthUser, propertyId: string, unitId: string) {
    await this.scope.verifyPropertyAccess(user, propertyId)
    const units = await this.prisma.unit.findMany({
      where: { propertyId, property: { tenantId: user.tenantId } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    const idx = units.findIndex(u => u.id === unitId)
    if (idx < 0) throw new NotFoundException('Jednotka nenalezena')
    return {
      total: units.length,
      current: idx + 1,
      prevId: idx > 0 ? units[idx - 1].id : null,
      nextId: idx < units.length - 1 ? units[idx + 1].id : null,
    }
  }

  // ─── Rooms (Plochy) ────────────────────────────────────────

  async listRooms(user: AuthUser, propertyId: string, unitId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    return this.prisma.unitRoom.findMany({
      where: { unitId, tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async createRoom(user: AuthUser, propertyId: string, unitId: string, dto: { name: string; area: number; coefficient?: number }) {
    await this.verifyUnit(user, propertyId, unitId)
    const coeff = dto.coefficient ?? 1.0
    return this.prisma.unitRoom.create({
      data: {
        unitId,
        tenantId: user.tenantId,
        name: dto.name,
        area: dto.area,
        coefficient: coeff,
        calculatedArea: dto.area * coeff,
      },
    })
  }

  async updateRoom(user: AuthUser, propertyId: string, unitId: string, roomId: string, dto: { name?: string; area?: number; coefficient?: number }) {
    await this.verifyUnit(user, propertyId, unitId)
    const room = await this.prisma.unitRoom.findFirst({ where: { id: roomId, unitId, tenantId: user.tenantId } })
    if (!room) throw new NotFoundException('Místnost nenalezena')
    const area = dto.area ?? room.area
    const coeff = dto.coefficient ?? room.coefficient
    return this.prisma.unitRoom.update({
      where: { id: roomId },
      data: { ...dto, calculatedArea: area * coeff },
    })
  }

  async deleteRoom(user: AuthUser, propertyId: string, unitId: string, roomId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    const room = await this.prisma.unitRoom.findFirst({ where: { id: roomId, unitId, tenantId: user.tenantId } })
    if (!room) throw new NotFoundException('Místnost nenalezena')
    await this.prisma.unitRoom.delete({ where: { id: roomId } })
  }

  // ─── Quantities (Veličiny) ─────────────────────────────────

  async listQuantities(user: AuthUser, propertyId: string, unitId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    return this.prisma.unitQuantity.findMany({
      where: { unitId, tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async upsertQuantity(user: AuthUser, propertyId: string, unitId: string, dto: { name: string; value: number; unitLabel?: string }) {
    await this.verifyUnit(user, propertyId, unitId)
    return this.prisma.unitQuantity.upsert({
      where: { tenantId_unitId_name: { tenantId: user.tenantId, unitId, name: dto.name } },
      create: { unitId, tenantId: user.tenantId, name: dto.name, value: dto.value, unitLabel: dto.unitLabel ?? '' },
      update: { value: dto.value, unitLabel: dto.unitLabel ?? undefined },
    })
  }

  async deleteQuantity(user: AuthUser, propertyId: string, unitId: string, quantityId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    const q = await this.prisma.unitQuantity.findFirst({ where: { id: quantityId, unitId, tenantId: user.tenantId } })
    if (!q) throw new NotFoundException('Veličina nenalezena')
    await this.prisma.unitQuantity.delete({ where: { id: quantityId } })
  }

  // ─── Equipment (Vybavení) ──────────────────────────────────

  async listEquipment(user: AuthUser, propertyId: string, unitId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    return this.prisma.unitEquipment.findMany({
      where: { unitId, tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async createEquipment(user: AuthUser, propertyId: string, unitId: string, dto: { name: string; status?: string; note?: string }) {
    await this.verifyUnit(user, propertyId, unitId)
    return this.prisma.unitEquipment.create({
      data: { unitId, tenantId: user.tenantId, name: dto.name, status: dto.status ?? 'functional', note: dto.note },
    })
  }

  async updateEquipment(user: AuthUser, propertyId: string, unitId: string, eqId: string, dto: { name?: string; status?: string; note?: string }) {
    await this.verifyUnit(user, propertyId, unitId)
    const eq = await this.prisma.unitEquipment.findFirst({ where: { id: eqId, unitId, tenantId: user.tenantId } })
    if (!eq) throw new NotFoundException('Vybavení nenalezeno')
    return this.prisma.unitEquipment.update({ where: { id: eqId }, data: dto })
  }

  async deleteEquipment(user: AuthUser, propertyId: string, unitId: string, eqId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    const eq = await this.prisma.unitEquipment.findFirst({ where: { id: eqId, unitId, tenantId: user.tenantId } })
    if (!eq) throw new NotFoundException('Vybavení nenalezeno')
    await this.prisma.unitEquipment.delete({ where: { id: eqId } })
  }

  // ─── Management Fees (Správní odměna) ──────────────────────

  async listFees(user: AuthUser, propertyId: string, unitId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    return this.prisma.unitManagementFee.findMany({
      where: { unitId, tenantId: user.tenantId },
      orderBy: { validFrom: 'desc' },
    })
  }

  async createFee(user: AuthUser, propertyId: string, unitId: string, dto: { amount: number; calculationType?: string; validFrom: string; validTo?: string | null }) {
    await this.verifyUnit(user, propertyId, unitId)
    return this.prisma.unitManagementFee.create({
      data: {
        unitId,
        tenantId: user.tenantId,
        amount: dto.amount,
        calculationType: dto.calculationType ?? 'flat',
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
      },
    })
  }

  async updateFee(user: AuthUser, propertyId: string, unitId: string, feeId: string, dto: { amount?: number; calculationType?: string; validFrom?: string; validTo?: string | null }) {
    await this.verifyUnit(user, propertyId, unitId)
    const fee = await this.prisma.unitManagementFee.findFirst({ where: { id: feeId, unitId, tenantId: user.tenantId } })
    if (!fee) throw new NotFoundException('Správní odměna nenalezena')
    return this.prisma.unitManagementFee.update({
      where: { id: feeId },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.calculationType !== undefined ? { calculationType: dto.calculationType } : {}),
        ...(dto.validFrom !== undefined ? { validFrom: new Date(dto.validFrom) } : {}),
        ...(dto.validTo !== undefined ? { validTo: dto.validTo ? new Date(dto.validTo) : null } : {}),
      },
    })
  }

  async deleteFee(user: AuthUser, propertyId: string, unitId: string, feeId: string) {
    await this.verifyUnit(user, propertyId, unitId)
    const fee = await this.prisma.unitManagementFee.findFirst({ where: { id: feeId, unitId, tenantId: user.tenantId } })
    if (!fee) throw new NotFoundException('Správní odměna nenalezena')
    await this.prisma.unitManagementFee.delete({ where: { id: feeId } })
  }
}

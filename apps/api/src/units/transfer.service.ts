import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyScopeService } from '../common/services/property-scope.service'
import { TransferDto } from './dto/transfer.dto'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name)

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async transferOwner(user: AuthUser, propertyId: string, unitId: string, dto: TransferDto) {
    await this.scope.verifyPropertyAccess(user, propertyId)

    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, propertyId },
      include: { property: { select: { legalMode: true, tenantId: true } } },
    })
    if (!unit) throw new NotFoundException('Jednotka nenalezena')

    const transferDate = new Date(dto.transferDate)

    // Find current occupancy
    const current = await this.prisma.occupancy.findFirst({
      where: { id: dto.currentOwnerId, unitId, isActive: true },
      include: { resident: true },
    })
    if (!current) throw new NotFoundException('Stávající vlastník/bydlící nenalezen na této jednotce')

    // Resolve new owner — either existing party or create resident
    let newResidentId: string
    if (dto.newOwner.partyId) {
      // Find or create resident from party
      const party = await this.prisma.party.findFirst({
        where: { id: dto.newOwner.partyId, tenantId: user.tenantId },
      })
      if (!party) throw new NotFoundException('Kontakt nenalezen v adresáři')

      let resident = await this.prisma.resident.findFirst({
        where: { partyId: party.id, tenantId: user.tenantId },
      })
      if (!resident) {
        resident = await this.prisma.resident.create({
          data: {
            tenantId: user.tenantId,
            firstName: party.firstName ?? party.displayName,
            lastName: party.lastName ?? '',
            email: party.email,
            phone: party.phone,
            role: current.role,
            partyId: party.id,
            propertyId,
            unitId,
          },
        })
      }
      newResidentId = resident.id
    } else {
      if (!dto.newOwner.firstName || !dto.newOwner.lastName) {
        throw new BadRequestException('Zadejte partyId nebo jméno a příjmení nového vlastníka')
      }
      const resident = await this.prisma.resident.create({
        data: {
          tenantId: user.tenantId,
          firstName: dto.newOwner.firstName,
          lastName: dto.newOwner.lastName,
          email: dto.newOwner.email,
          phone: dto.newOwner.phone,
          role: current.role,
          propertyId,
          unitId,
        },
      })
      newResidentId = resident.id
    }

    // Generate VS if requested
    let variableSymbol: string | undefined
    if (dto.generateVariableSymbol) {
      const existing = await this.prisma.occupancy.findMany({
        where: { tenantId: user.tenantId, unit: { propertyId }, variableSymbol: { not: null } },
        select: { variableSymbol: true },
      })
      let maxNum = 0
      for (const o of existing) {
        const num = parseInt(o.variableSymbol ?? '0', 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
      variableSymbol = String(maxNum + 1).padStart(6, '0')
    }

    // Parse ownership share
    const ownershipShare = dto.ownershipShare
      ? parseFloat(dto.ownershipShare)
      : current.ownershipShare
        ? Number(current.ownershipShare)
        : undefined

    // Execute transfer in transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. End current occupancy
      const ended = await tx.occupancy.update({
        where: { id: current.id },
        data: {
          isActive: false,
          endDate: transferDate,
          note: current.note
            ? `${current.note}\n[Stěhování ${transferDate.toLocaleDateString('cs-CZ')}] ${dto.note ?? ''}`
            : `[Stěhování ${transferDate.toLocaleDateString('cs-CZ')}] ${dto.note ?? ''}`,
        },
        include: { resident: { select: { firstName: true, lastName: true } } },
      })

      // 2. Create new occupancy (start = transferDate for SVJ, transferDate+1 for rental)
      const startDate = unit.property.legalMode === 'SVJ' || unit.property.legalMode === 'BD'
        ? transferDate
        : new Date(transferDate.getTime() + 86_400_000) // +1 day for rental

      const created = await tx.occupancy.create({
        data: {
          tenantId: user.tenantId,
          unitId,
          residentId: newResidentId,
          role: current.role,
          startDate,
          ownershipShare,
          isPrimaryPayer: true,
          variableSymbol,
          isActive: true,
          note: dto.note ? `[Stěhování] ${dto.note}` : undefined,
        },
        include: { resident: { select: { firstName: true, lastName: true } } },
      })

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'TRANSFER',
          entity: 'Occupancy',
          entityId: unitId,
          newData: {
            from: `${ended.resident.firstName} ${ended.resident.lastName}`,
            to: `${created.resident.firstName} ${created.resident.lastName}`,
            transferDate: dto.transferDate,
            unitId,
            propertyId,
          },
        },
      })

      this.logger.log(
        `Transfer: unit ${unitId} from ${ended.resident.lastName} to ${created.resident.lastName} on ${dto.transferDate}`,
      )

      return { ended, created }
    })
  }
}

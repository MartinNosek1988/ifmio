import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateFinancialContextDto } from './dto/create-financial-context.dto'
import type { UpdateFinancialContextDto } from './dto/update-financial-context.dto'
import type { FinancialScopeType } from '@prisma/client'

@Injectable()
export class FinancialContextService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateFinancialContextDto) {
    // Validate scopeType rules
    if (dto.scopeType === 'property' && !dto.propertyId) {
      throw new BadRequestException('Pro typ "property" je vyžadováno propertyId')
    }
    if (dto.scopeType === 'principal' && !dto.principalId) {
      throw new BadRequestException('Pro typ "principal" je vyžadováno principalId')
    }

    // Validate referenced entities exist
    if (dto.principalId) {
      const principal = await this.prisma.principal.findFirst({
        where: { id: dto.principalId, tenantId },
      })
      if (!principal) throw new NotFoundException('Principál nenalezen')
    }

    if (dto.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, tenantId },
      })
      if (!property) throw new NotFoundException('Nemovitost nenalezena')
    }

    if (dto.managementContractId) {
      const contract = await this.prisma.managementContract.findFirst({
        where: { id: dto.managementContractId, tenantId },
      })
      if (!contract) throw new NotFoundException('Smlouva o správě nenalezena')
    }

    // Check code uniqueness
    if (dto.code) {
      const existing = await this.prisma.financialContext.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      })
      if (existing) throw new ConflictException(`Finanční kontext s kódem "${dto.code}" již existuje`)
    }

    return this.prisma.financialContext.create({
      data: {
        tenantId,
        scopeType: dto.scopeType as FinancialScopeType,
        displayName: dto.displayName,
        principalId: dto.principalId,
        propertyId: dto.propertyId,
        managementContractId: dto.managementContractId,
        code: dto.code,
        currency: dto.currency ?? 'CZK',
        vatEnabled: dto.vatEnabled ?? false,
        vatPayer: dto.vatPayer ?? false,
        invoicePrefix: dto.invoicePrefix,
        creditNotePrefix: dto.creditNotePrefix,
        orderPrefix: dto.orderPrefix,
        accountingSystem: dto.accountingSystem,
        brandingName: dto.brandingName,
        brandingEmail: dto.brandingEmail,
        brandingPhone: dto.brandingPhone,
        brandingWebsite: dto.brandingWebsite,
        dopisOnlineUsername: dto.dopisOnlineUsername,
        dopisOnlineSender: dto.dopisOnlineSender,
        note: dto.note,
      },
      include: {
        principal: { select: { id: true, displayName: true } },
        property: { select: { id: true, name: true } },
      },
    })
  }

  async findAll(tenantId: string, query?: { principalId?: string; propertyId?: string; scopeType?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = { tenantId }
    if (query?.principalId) where.principalId = query.principalId
    if (query?.propertyId) where.propertyId = query.propertyId
    if (query?.scopeType) where.scopeType = query.scopeType
    if (query?.isActive !== undefined) where.isActive = query.isActive
    else where.isActive = true

    return this.prisma.financialContext.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        principal: { select: { id: true, displayName: true } },
        property: { select: { id: true, name: true } },
        _count: { select: { bankAccounts: true } },
      },
    })
  }

  async findOne(tenantId: string, id: string) {
    const fc = await this.prisma.financialContext.findFirst({
      where: { id, tenantId },
      include: {
        principal: true,
        property: true,
        managementContract: true,
        bankAccounts: true,
      },
    })
    if (!fc) throw new NotFoundException('Finanční kontext nenalezen')
    return fc
  }

  async update(tenantId: string, id: string, dto: UpdateFinancialContextDto) {
    const existing = await this.prisma.financialContext.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Finanční kontext nenalezen')

    // Check code uniqueness if changing
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.financialContext.findUnique({
        where: { tenantId_code: { tenantId, code: dto.code } },
      })
      if (dup && dup.id !== id) throw new ConflictException(`Kód "${dto.code}" je již použit`)
    }

    // Validate managementContractId if provided
    if (dto.managementContractId) {
      const contract = await this.prisma.managementContract.findFirst({
        where: { id: dto.managementContractId, tenantId },
      })
      if (!contract) throw new NotFoundException('Smlouva o správě nenalezena')
    }

    const data: Record<string, unknown> = {}
    if (dto.displayName !== undefined) data.displayName = dto.displayName
    if (dto.managementContractId !== undefined) data.managementContractId = dto.managementContractId || null
    if (dto.code !== undefined) data.code = dto.code
    if (dto.currency !== undefined) data.currency = dto.currency
    if (dto.vatEnabled !== undefined) data.vatEnabled = dto.vatEnabled
    if (dto.vatPayer !== undefined) data.vatPayer = dto.vatPayer
    if (dto.invoicePrefix !== undefined) data.invoicePrefix = dto.invoicePrefix
    if (dto.creditNotePrefix !== undefined) data.creditNotePrefix = dto.creditNotePrefix
    if (dto.orderPrefix !== undefined) data.orderPrefix = dto.orderPrefix
    if (dto.accountingSystem !== undefined) data.accountingSystem = dto.accountingSystem
    if (dto.brandingName !== undefined) data.brandingName = dto.brandingName
    if (dto.brandingEmail !== undefined) data.brandingEmail = dto.brandingEmail
    if (dto.brandingPhone !== undefined) data.brandingPhone = dto.brandingPhone
    if (dto.brandingWebsite !== undefined) data.brandingWebsite = dto.brandingWebsite
    if (dto.dopisOnlineUsername !== undefined) data.dopisOnlineUsername = dto.dopisOnlineUsername
    if (dto.dopisOnlineSender !== undefined) data.dopisOnlineSender = dto.dopisOnlineSender
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    if (dto.note !== undefined) data.note = dto.note

    return this.prisma.financialContext.update({
      where: { id },
      data,
      include: {
        principal: { select: { id: true, displayName: true } },
        property: { select: { id: true, name: true } },
      },
    })
  }

  async remove(tenantId: string, id: string) {
    const fc = await this.prisma.financialContext.findFirst({ where: { id, tenantId } })
    if (!fc) throw new NotFoundException('Finanční kontext nenalezen')

    const bankAccountCount = await this.prisma.bankAccount.count({
      where: { financialContextId: id },
    })
    if (bankAccountCount > 0) {
      throw new ConflictException('Nelze deaktivovat finanční kontext s přiřazenými bankovními účty')
    }

    await this.prisma.financialContext.update({ where: { id }, data: { isActive: false } })
  }

  async getByProperty(tenantId: string, propertyId: string) {
    return this.prisma.financialContext.findMany({
      where: { tenantId, propertyId, isActive: true },
      include: {
        principal: { select: { id: true, displayName: true } },
        _count: { select: { bankAccounts: true } },
      },
      orderBy: { displayName: 'asc' },
    })
  }
}

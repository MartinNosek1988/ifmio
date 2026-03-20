import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

export interface GdprErasureReport {
  subjectId: string
  type: 'party' | 'resident'
  erasedFields: string[]
  anonymizedAuditLogs: number
  erasureProofId: string
}

const GDPR_PLACEHOLDER = '[GDPR VYMAZÁNO]'

const PARTY_ERASURE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'website',
  'bankAccount', 'bankCode', 'iban', 'dataBoxId',
  'street', 'street2', 'city', 'postalCode', 'countryCode',
] as const

const RESIDENT_ERASURE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone',
  'correspondenceAddress', 'correspondenceCity', 'correspondencePostalCode',
  'dataBoxId', 'note',
] as const

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name)

  constructor(private prisma: PrismaService) {}

  async eraseSubjectData(tenantId: string, params: {
    type: 'party' | 'resident'
    subjectId: string
    requestedBy: string
    reason: string
  }): Promise<GdprErasureReport> {
    const { type, subjectId, requestedBy, reason } = params

    return this.prisma.$transaction(async (tx) => {
      let erasedFields: string[]

      if (type === 'party') {
        const party = await tx.party.findFirst({ where: { id: subjectId, tenantId } })
        if (!party) throw new NotFoundException('Subjekt nenalezen')
        if (party.gdprErased) throw new NotFoundException('Subjekt již byl anonymizován')

        await tx.party.update({
          where: { id: subjectId },
          data: {
            firstName: GDPR_PLACEHOLDER,
            lastName: GDPR_PLACEHOLDER,
            displayName: GDPR_PLACEHOLDER,
            companyName: party.companyName ? GDPR_PLACEHOLDER : null,
            email: null,
            phone: null,
            website: null,
            bankAccount: null,
            bankCode: null,
            iban: null,
            dataBoxId: null,
            street: null,
            street2: null,
            city: null,
            postalCode: null,
            countryCode: null,
            note: null,
            zastupci: Prisma.DbNull,
            gdprErased: true,
            gdprErasedAt: new Date(),
          },
        })
        erasedFields = [...PARTY_ERASURE_FIELDS, 'displayName', 'companyName', 'note', 'zastupci']
      } else {
        const resident = await tx.resident.findFirst({ where: { id: subjectId, tenantId } })
        if (!resident) throw new NotFoundException('Subjekt nenalezen')
        if (resident.gdprErased) throw new NotFoundException('Subjekt již byl anonymizován')

        await tx.resident.update({
          where: { id: subjectId },
          data: {
            firstName: GDPR_PLACEHOLDER,
            lastName: GDPR_PLACEHOLDER,
            email: null,
            phone: null,
            correspondenceAddress: null,
            correspondenceCity: null,
            correspondencePostalCode: null,
            dataBoxId: null,
            birthDate: null,
            note: null,
            gdprErased: true,
            gdprErasedAt: new Date(),
          },
        })
        erasedFields = [...RESIDENT_ERASURE_FIELDS, 'birthDate']
      }

      // Anonymize audit log data snapshots for this subject
      const auditResult = await tx.auditLog.updateMany({
        where: { tenantId, entityId: subjectId },
        data: {
          oldData: Prisma.DbNull,
          newData: Prisma.DbNull,
        },
      })

      // Create GDPR erasure proof record (this MUST NEVER be deleted by retention)
      const proof = await tx.auditLog.create({
        data: {
          tenantId,
          userId: requestedBy,
          action: 'GDPR_ERASURE',
          entity: type === 'party' ? 'Party' : 'Resident',
          entityId: subjectId,
          newData: {
            reason,
            erasedFields,
            anonymizedAuditLogs: auditResult.count,
            erasedAt: new Date().toISOString(),
          },
          ipAddress: 'system',
          userAgent: 'gdpr-erasure-service',
        },
      })

      this.logger.log(
        `GDPR erasure: ${type} ${subjectId} by user ${requestedBy} — ` +
        `${erasedFields.length} fields anonymized, ${auditResult.count} audit logs cleared`,
      )

      return {
        subjectId,
        type,
        erasedFields,
        anonymizedAuditLogs: auditResult.count,
        erasureProofId: proof.id,
      }
    }, { timeout: 30_000 })
  }

  async exportSubjectData(tenantId: string, subjectId: string, type: 'party' | 'resident') {
    if (type === 'party') {
      const party = await this.prisma.party.findFirst({
        where: { id: subjectId, tenantId },
        include: {
          unitOwnerships: { select: { id: true, shareNumerator: true, shareDenominator: true } },
          propertyOwnerships: { select: { id: true, shareNumerator: true, shareDenominator: true } },
          tenancies: { select: { id: true, validFrom: true, validTo: true } },
        },
      })
      if (!party) throw new NotFoundException('Subjekt nenalezen')
      return {
        exportedAt: new Date().toISOString(),
        type: 'party',
        data: party,
      }
    }

    const resident = await this.prisma.resident.findFirst({
      where: { id: subjectId, tenantId },
      include: {
        occupancies: { select: { id: true, startDate: true, endDate: true } },
        leaseAgreements: { select: { id: true, startDate: true, endDate: true } },
      },
    })
    if (!resident) throw new NotFoundException('Subjekt nenalezen')
    return {
      exportedAt: new Date().toISOString(),
      type: 'resident',
      data: resident,
    }
  }

  async getErasureLog(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId, action: 'GDPR_ERASURE' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: { user: { select: { name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where: { tenantId, action: 'GDPR_ERASURE' } }),
    ])
    return { data, total, page, limit }
  }
}

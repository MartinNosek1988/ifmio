import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PropertyScopeService } from '../../common/services/property-scope.service'
import { KontoService } from '../../konto/konto.service'
import { Decimal } from '@prisma/client/runtime/library'
import type { MatchTarget, Prescription } from '@prisma/client'
import type { BankTransaction } from '@prisma/client'
import type { ManualMatchDto, AutoMatchResponse, MatchResult, MatchSuggestion } from './matching.dto'
import type { AuthUser } from '@ifmio/shared-types'

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name)

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private konto: KontoService,
  ) {}

  // ─── 2A: ENHANCED AUTO-MATCH ──────────────────────────────────

  async autoMatchTransactions(
    user: AuthUser,
    propertyId?: string,
    bankAccountId?: string,
  ): Promise<AutoMatchResponse> {
    const txScopeWhere = await this.scope.scopeByRelation(user, 'bankAccount')
    const where: any = {
      tenantId: user.tenantId,
      status: 'unmatched',
      type: 'credit',
      ...txScopeWhere,
      ...(bankAccountId ? { bankAccountId } : {}),
    }

    const prescriptionScope = await this.scope.scopeByPropertyId(user)
    const prescriptionWhere: any = {
      tenantId: user.tenantId,
      status: 'active',
      paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      ...prescriptionScope,
      ...(propertyId ? { propertyId } : {}),
    }

    const [transactions, prescriptions] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        include: { bankAccount: { select: { propertyId: true } } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.prescription.findMany({
        where: prescriptionWhere,
        include: {
          items: true,
          unit: { select: { id: true, name: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { validFrom: 'asc' },
      }),
    ])

    const results: MatchResult[] = []
    let matched = 0
    let unmatched = 0
    const matchedPrescriptionIds = new Set<string>()

    for (const tx of transactions) {
      const txAmount = Number(tx.amount)
      const txVs = (tx.variableSymbol ?? '').trim().toLowerCase()

      // Strategy 1: VS exact match
      if (txVs) {
        const vsMatch = prescriptions.find(
          p => !matchedPrescriptionIds.has(p.id) &&
            (p.variableSymbol ?? '').trim().toLowerCase() === txVs,
        )

        if (vsMatch) {
          const prescAmount = Number(vsMatch.amount)
          const paidSoFar = Number(vsMatch.paidAmount ?? 0)
          const outstanding = prescAmount - paidSoFar
          const amountMatch = Math.abs(txAmount - outstanding) < 1 // 1 Kč tolerance

          await this.applyMatch(tx, vsMatch, 'KONTO', txAmount, 'auto', user.tenantId)
          matchedPrescriptionIds.add(vsMatch.id)
          matched++

          results.push({
            txId: tx.id,
            matchedTo: vsMatch.id,
            confidence: amountMatch ? 'exact' : 'vs_only',
            target: 'KONTO',
            amount: txAmount,
          })
          continue
        }
      }

      // Strategy 2: VS match against invoice numbers (for debit/outgoing — skip credit)
      // Credit transactions without VS match → leave unmatched for manual

      unmatched++
      results.push({
        txId: tx.id,
        matchedTo: null,
        confidence: 'none',
        target: null,
        amount: txAmount,
      })
    }

    // Also auto-match debit transactions to invoices
    const debitTxs = await this.prisma.bankTransaction.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'unmatched',
        type: 'debit',
        ...txScopeWhere,
        ...(bankAccountId ? { bankAccountId } : {}),
      },
      orderBy: { date: 'asc' },
    })

    for (const tx of debitTxs) {
      const txVs = (tx.variableSymbol ?? '').trim().toLowerCase()
      if (!txVs) continue

      const invoice = await this.prisma.invoice.findFirst({
        where: {
          tenantId: user.tenantId,
          isPaid: false,
          OR: [
            { variableSymbol: { equals: txVs, mode: 'insensitive' } },
            { number: { equals: txVs, mode: 'insensitive' } },
          ],
        },
      })

      if (invoice) {
        await this.applyInvoiceMatch(tx, invoice, 'auto', user.tenantId)
        matched++
        results.push({
          txId: tx.id,
          matchedTo: invoice.id,
          confidence: 'exact',
          target: 'INVOICE',
          amount: Math.abs(Number(tx.amount)),
        })
      }
    }

    return { total: transactions.length + debitTxs.length, matched, unmatched, results }
  }

  // ─── 2B: MANUAL MATCH ─────────────────────────────────────────

  async manualMatch(
    user: AuthUser,
    transactionId: string,
    dto: ManualMatchDto,
  ) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, tenantId: user.tenantId },
      include: { bankAccount: { select: { propertyId: true } } },
    })
    if (!tx) throw new NotFoundException('Transakce nenalezena')
    if (tx.status === 'matched') throw new BadRequestException('Transakce je již spárována')

    await this.scope.verifyEntityAccess(user, (tx as any).bankAccount?.propertyId ?? null)

    const matchAmount = dto.amount ?? Math.abs(Number(tx.amount))
    const txAmount = Math.abs(Number(tx.amount))

    // Split if partial amount specified
    let targetTx: BankTransaction = tx
    if (dto.amount && dto.amount < txAmount - 0.01) {
      targetTx = await this.splitTransaction(tx, dto.amount, user.tenantId)
    }

    switch (dto.target) {
      case 'KONTO': {
        if (!dto.entityId) throw new BadRequestException('entityId (prescriptionId) je povinné pro KONTO')
        const prescription = await this.prisma.prescription.findFirst({
          where: { id: dto.entityId, tenantId: user.tenantId },
        })
        if (!prescription) throw new NotFoundException('Předpis nenalezen')
        await this.scope.verifyPropertyAccess(user, prescription.propertyId)
        await this.applyMatch(targetTx, prescription, 'KONTO', matchAmount, user.id ?? 'manual', user.tenantId, dto.note)
        break
      }

      case 'INVOICE': {
        if (!dto.entityId) throw new BadRequestException('entityId (invoiceId) je povinné pro INVOICE')
        const invoice = await this.prisma.invoice.findFirst({
          where: { id: dto.entityId, tenantId: user.tenantId },
        })
        if (!invoice) throw new NotFoundException('Doklad nenalezen')
        await this.applyInvoiceMatch(targetTx, invoice, user.id ?? 'manual', user.tenantId, dto.note)
        break
      }

      case 'COMPONENT': {
        if (!dto.entityId) throw new BadRequestException('entityId (componentId) je povinné pro COMPONENT')
        await this.prisma.bankTransaction.update({
          where: { id: targetTx.id },
          data: {
            status: 'matched',
            matchTarget: 'COMPONENT',
            matchedEntityId: dto.entityId,
            matchedEntityType: 'component',
            matchedAt: new Date(),
            matchedBy: user.id ?? 'manual',
            matchNote: dto.note,
          },
        })
        break
      }

      case 'NO_EFFECT': {
        await this.prisma.bankTransaction.update({
          where: { id: targetTx.id },
          data: {
            status: 'matched',
            matchTarget: 'NO_EFFECT',
            matchedEntityId: null,
            matchedEntityType: null,
            matchedAt: new Date(),
            matchedBy: user.id ?? 'manual',
            matchNote: dto.note || 'Bez finančního vlivu',
          },
        })
        break
      }

      case 'UNSPECIFIED':
      default: {
        await this.prisma.bankTransaction.update({
          where: { id: targetTx.id },
          data: {
            matchTarget: 'UNSPECIFIED',
            matchNote: dto.note,
          },
        })
        break
      }
    }

    return this.prisma.bankTransaction.findUnique({
      where: { id: targetTx.id },
      include: {
        prescription: { select: { id: true, description: true, variableSymbol: true } },
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
    })
  }

  // ─── 2C: UNMATCH ──────────────────────────────────────────────

  async unmatchTransaction(user: AuthUser, transactionId: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, tenantId: user.tenantId, status: 'matched' },
      include: { bankAccount: { select: { propertyId: true } } },
    })
    if (!tx) throw new NotFoundException('Spárovaná transakce nenalezena')
    await this.scope.verifyEntityAccess(user, (tx as any).bankAccount?.propertyId ?? null)

    // Reverse konto posting if exists
    if (tx.ledgerEntryId) {
      try {
        const entry = await this.prisma.ledgerEntry.findUnique({ where: { id: tx.ledgerEntryId } })
        if (entry) {
          await this.konto.postDebit(
            entry.accountId, Number(entry.amount),
            'MANUAL_ADJUSTMENT', transactionId,
            `Storno platby ${tx.variableSymbol ?? transactionId}`,
          )
        }
      } catch (err) {
        this.logger.error(`Reversal for unmatch ${transactionId} failed: ${err}`)
      }
    }

    // Reverse prescription payment status if matched to prescription
    if (tx.prescriptionId) {
      await this.recalculatePrescriptionPayment(tx.prescriptionId, transactionId)
    }

    // Reverse invoice payment if matched to invoice
    if (tx.matchTarget === 'INVOICE' && tx.matchedEntityId) {
      await this.prisma.invoice.update({
        where: { id: tx.matchedEntityId },
        data: { isPaid: false, paidAmount: null, paymentDate: null, transactionId: null },
      }).catch(() => { /* invoice may have been deleted */ })
    }

    // Reset transaction
    await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'unmatched',
        prescriptionId: null,
        ledgerEntryId: null,
        matchTarget: null,
        matchedEntityId: null,
        matchedEntityType: null,
        matchedAt: null,
        matchedBy: null,
        matchNote: null,
      },
    })

    // Merge split children back if this was a split parent
    await this.mergeSplitChildren(transactionId, user.tenantId)

    return { unmatched: true, transactionId }
  }

  // ─── 2D: BULK OPERATIONS ──────────────────────────────────────

  async matchAllUnprocessed(user: AuthUser, propertyId: string) {
    await this.scope.verifyPropertyAccess(user, propertyId)

    // First run auto-match
    const autoResult = await this.autoMatchTransactions(user, propertyId)

    // Then classify remaining unmatched debit transactions with small amounts as NO_EFFECT (bank fees)
    const bankFees = await this.prisma.bankTransaction.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'unmatched',
        type: 'debit',
        matchTarget: null,
        bankAccount: { propertyId },
        amount: { gte: -100 }, // fees typically < 100 CZK (stored as negative)
      },
    })

    let feesMarked = 0
    for (const tx of bankFees) {
      const absAmount = Math.abs(Number(tx.amount))
      if (absAmount < 100) { // bank fees typically < 100 CZK
        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'matched',
            matchTarget: 'NO_EFFECT',
            matchedAt: new Date(),
            matchedBy: 'auto',
            matchNote: 'Automaticky: bankovní poplatek',
          },
        })
        feesMarked++
      }
    }

    return {
      ...autoResult,
      feesMarked,
      summary: `Spárováno ${autoResult.matched} transakcí, ${feesMarked} poplatků označeno, ${autoResult.unmatched} zbývá k ručnímu párování`,
    }
  }

  // ─── MATCH SUGGESTIONS ────────────────────────────────────────

  async getMatchSuggestions(
    user: AuthUser,
    transactionId: string,
  ): Promise<MatchSuggestion[]> {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, tenantId: user.tenantId },
      include: { bankAccount: { select: { propertyId: true } } },
    })
    if (!tx) throw new NotFoundException('Transakce nenalezena')

    const txAmount = Math.abs(Number(tx.amount))
    const txVs = (tx.variableSymbol ?? '').trim().toLowerCase()
    const suggestions: MatchSuggestion[] = []

    if (tx.type === 'credit') {
      // Suggest prescriptions for incoming payments
      const prescriptionScope = await this.scope.scopeByPropertyId(user)
      const prescriptions = await this.prisma.prescription.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'active',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          ...prescriptionScope,
        } as any,
        include: {
          unit: { select: { id: true, name: true } },
          resident: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { validFrom: 'asc' },
        take: 50,
      })

      for (const p of prescriptions) {
        const prescAmount = Number(p.amount)
        const paidSoFar = Number(p.paidAmount ?? 0)
        const outstanding = prescAmount - paidSoFar
        const pVs = (p.variableSymbol ?? '').trim().toLowerCase()

        let confidence: MatchSuggestion['confidence'] = 'none'
        if (txVs && pVs && txVs === pVs) {
          confidence = Math.abs(txAmount - outstanding) < 1 ? 'exact' : 'vs_match'
        } else if (Math.abs(txAmount - outstanding) < 1) {
          confidence = 'amount_match'
        }

        const from = new Date(p.validFrom)
        suggestions.push({
          entityId: p.id,
          entityType: 'prescription',
          label: p.description,
          amount: prescAmount,
          vs: p.variableSymbol ?? undefined,
          confidence,
          period: `${from.getMonth() + 1}/${from.getFullYear()}`,
          residentName: p.resident ? `${p.resident.firstName} ${p.resident.lastName}`.trim() : undefined,
          outstanding,
        })
      }

      // Sort: exact > vs_match > amount_match > none, then by validFrom
      const order: Record<string, number> = { exact: 0, vs_match: 1, amount_match: 2, none: 3 }
      suggestions.sort((a, b) => (order[a.confidence] ?? 4) - (order[b.confidence] ?? 4))
    } else {
      // Suggest invoices for outgoing payments
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId: user.tenantId,
          isPaid: false,
          deletedAt: null,
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      })

      for (const inv of invoices) {
        const invAmount = Number(inv.amountTotal)
        const invVs = (inv.variableSymbol ?? inv.number ?? '').trim().toLowerCase()

        let confidence: MatchSuggestion['confidence'] = 'none'
        if (txVs && invVs && txVs === invVs) {
          confidence = Math.abs(txAmount - invAmount) < 1 ? 'exact' : 'vs_match'
        } else if (Math.abs(txAmount - invAmount) < 1) {
          confidence = 'amount_match'
        }

        suggestions.push({
          entityId: inv.id,
          entityType: 'invoice',
          label: `${inv.number} — ${inv.supplierName ?? inv.description ?? ''}`,
          amount: invAmount,
          vs: inv.variableSymbol ?? undefined,
          confidence,
          outstanding: invAmount - Number(inv.paidAmount ?? 0),
        })
      }

      const order: Record<string, number> = { exact: 0, vs_match: 1, amount_match: 2, none: 3 }
      suggestions.sort((a, b) => (order[a.confidence] ?? 4) - (order[b.confidence] ?? 4))
    }

    return suggestions
  }

  // ─── UNMATCHED LIST ───────────────────────────────────────────

  async getUnmatchedTransactions(
    user: AuthUser,
    propertyId?: string,
    bankAccountId?: string,
    page = 1,
    limit = 50,
  ) {
    const txScopeWhere = await this.scope.scopeByRelation(user, 'bankAccount')
    const where: any = {
      tenantId: user.tenantId,
      status: 'unmatched',
      ...txScopeWhere,
      ...(bankAccountId ? { bankAccountId } : {}),
      ...(propertyId ? { bankAccount: { propertyId } } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        include: {
          bankAccount: { select: { id: true, name: true, propertyId: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bankTransaction.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private async applyMatch(
    tx: Pick<BankTransaction, 'id' | 'amount' | 'variableSymbol' | 'date'>,
    prescription: Prescription,
    target: MatchTarget,
    amount: number,
    matchedBy: string,
    tenantId: string,
    note?: string,
  ) {
    // Update transaction
    await this.prisma.bankTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'matched',
        prescriptionId: prescription.id,
        matchTarget: target,
        matchedEntityId: prescription.id,
        matchedEntityType: 'prescription',
        matchedAt: new Date(),
        matchedBy,
        matchNote: note,
      },
    })

    // Update prescription payment
    const prescAmount = Number(prescription.amount)
    const prevPaid = Number(prescription.paidAmount ?? 0)
    const newPaid = prevPaid + amount
    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID' = 'UNPAID'
    if (newPaid >= prescAmount) paymentStatus = newPaid > prescAmount + 0.01 ? 'OVERPAID' : 'PAID'
    else if (newPaid > 0.01) paymentStatus = 'PARTIAL'

    await this.prisma.prescription.update({
      where: { id: prescription.id },
      data: {
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paidAt: paymentStatus === 'PAID' || paymentStatus === 'OVERPAID' ? new Date() : undefined,
        paymentStatus,
      },
    })

    // Post to konto
    if (prescription.unitId && prescription.residentId) {
      try {
        const account = await this.konto.getOrCreateAccount(
          tenantId, prescription.propertyId, prescription.unitId, prescription.residentId,
        )
        const entry = await this.konto.postCredit(
          account.id, amount, 'BANK_TRANSACTION', tx.id,
          `Platba ${tx.variableSymbol ?? 'bez VS'}`, tx.date,
        )
        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { ledgerEntryId: entry.id },
        })
      } catch (err) {
        this.logger.error(`Auto-posting match ${tx.id} to konto failed: ${err}`)
      }
    }
  }

  private async applyInvoiceMatch(
    tx: Pick<BankTransaction, 'id' | 'amount' | 'variableSymbol'>,
    invoice: { id: string; amountTotal: any; paidAmount: any },
    matchedBy: string,
    tenantId: string,
    note?: string,
  ) {
    const txAmount = Math.abs(Number(tx.amount))

    await this.prisma.bankTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'matched',
        matchTarget: 'INVOICE',
        matchedEntityId: invoice.id,
        matchedEntityType: 'invoice',
        matchedAt: new Date(),
        matchedBy,
        matchNote: note,
      },
    })

    const totalAmount = Number(invoice.amountTotal)
    const prevPaid = Number(invoice.paidAmount ?? 0)
    const newPaid = prevPaid + txAmount

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        isPaid: newPaid >= totalAmount - 0.01,
        paidAmount: new Decimal(newPaid.toFixed(2)),
        paymentDate: new Date(),
        transactionId: tx.id,
      },
    })
  }

  private async splitTransaction(
    originalTx: BankTransaction & Record<string, any>,
    matchAmount: number,
    tenantId: string,
  ): Promise<BankTransaction> {
    const originalAmount = Number(originalTx.amount)
    const remainder = originalAmount - matchAmount

    // Create remainder transaction (virtual split child)
    const child = await this.prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: originalTx.bankAccountId,
        amount: new Decimal(remainder.toFixed(2)),
        type: originalTx.type,
        status: 'unmatched',
        date: originalTx.date,
        bookingDate: originalTx.bookingDate,
        counterparty: originalTx.counterparty,
        counterpartyIban: originalTx.counterpartyIban,
        counterpartyAccount: originalTx.counterpartyAccount,
        counterpartyBankCode: originalTx.counterpartyBankCode,
        variableSymbol: originalTx.variableSymbol,
        specificSymbol: originalTx.specificSymbol,
        constantSymbol: originalTx.constantSymbol,
        description: `${originalTx.description ?? ''} (zbytek)`.trim(),
        messageForRecipient: originalTx.messageForRecipient,
        residentId: originalTx.residentId,
        importSource: originalTx.importSource,
        financialContextId: originalTx.financialContextId,
        splitParentId: originalTx.id,
      },
    })

    // Update original to the matched amount
    await this.prisma.bankTransaction.update({
      where: { id: originalTx.id },
      data: { amount: new Decimal(matchAmount.toFixed(2)) },
    })

    // Return the original tx (now with reduced amount) for matching
    return { ...originalTx, amount: new Decimal(matchAmount.toFixed(2)) } as BankTransaction
  }

  private async mergeSplitChildren(parentId: string, tenantId: string) {
    const children = await this.prisma.bankTransaction.findMany({
      where: { splitParentId: parentId, tenantId },
    })

    if (children.length === 0) return

    const parent = await this.prisma.bankTransaction.findUnique({ where: { id: parentId } })
    if (!parent) return

    // Merge amounts back
    let totalAmount = Number(parent.amount)
    for (const child of children) {
      if (child.status === 'unmatched') {
        totalAmount += Number(child.amount)
        await this.prisma.bankTransaction.delete({ where: { id: child.id } })
      }
    }

    await this.prisma.bankTransaction.update({
      where: { id: parentId },
      data: { amount: new Decimal(totalAmount.toFixed(2)) },
    })
  }

  private async recalculatePrescriptionPayment(
    prescriptionId: string,
    excludeTransactionId: string,
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    })
    if (!prescription) return

    // Sum all matched transactions for this prescription except the excluded one
    const matchedTxs = await this.prisma.bankTransaction.findMany({
      where: {
        prescriptionId: prescriptionId,
        status: 'matched',
        id: { not: excludeTransactionId },
      },
    })

    const totalPaid = matchedTxs.reduce((sum, tx) => sum + Number(tx.amount), 0)
    const prescAmount = Number(prescription.amount)

    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID' = 'UNPAID'
    if (totalPaid >= prescAmount) paymentStatus = totalPaid > prescAmount + 0.01 ? 'OVERPAID' : 'PAID'
    else if (totalPaid > 0.01) paymentStatus = 'PARTIAL'

    await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        paidAmount: new Decimal(totalPaid.toFixed(2)),
        paidAt: paymentStatus === 'PAID' || paymentStatus === 'OVERPAID' ? new Date() : null,
        paymentStatus,
      },
    })
  }
}

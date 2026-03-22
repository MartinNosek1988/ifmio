import { Decimal } from '@prisma/client/runtime/library'
import type { PrismaService } from '../prisma/prisma.service'

/**
 * Recalculates prescription.paymentStatus from all matched transactions.
 * Single source of truth — called after every match/unmatch.
 */
export async function recalculatePrescriptionPaymentStatus(
  prisma: PrismaService,
  prescriptionId: string,
  excludeTransactionId?: string,
): Promise<{ paymentStatus: string; paidAmount: number }> {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
  })
  if (!prescription) return { paymentStatus: 'UNPAID', paidAmount: 0 }

  // Sum all matched transactions for this prescription
  const matchedTxs = await prisma.bankTransaction.findMany({
    where: {
      prescriptionId,
      status: 'matched',
      ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
    },
    select: { amount: true },
  })

  const totalPaid = matchedTxs.reduce((sum, tx) => sum + Number(tx.amount), 0)
  const prescAmount = Number(prescription.amount)

  let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID' = 'UNPAID'
  if (totalPaid >= prescAmount) {
    paymentStatus = totalPaid > prescAmount + 0.01 ? 'OVERPAID' : 'PAID'
  } else if (totalPaid > 0.01) {
    paymentStatus = 'PARTIAL'
  }

  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: {
      paidAmount: new Decimal(totalPaid.toFixed(2)),
      paidAt: paymentStatus === 'PAID' || paymentStatus === 'OVERPAID' ? new Date() : null,
      paymentStatus,
    },
  })

  return { paymentStatus, paidAmount: totalPaid }
}

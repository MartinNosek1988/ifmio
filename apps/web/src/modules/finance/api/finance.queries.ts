import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from './finance.api';
import type { MatchTarget } from './finance.api';

export const financeKeys = {
  summary: (pid?: string) => ['finance', 'summary', pid] as const,
  bankAccounts: () => ['finance', 'bank-accounts'] as const,
  transactions: (p?: Record<string, unknown>) => ['finance', 'transactions', p] as const,
  prescriptions: (p?: Record<string, unknown>) => ['finance', 'prescriptions', p] as const,
  billingPeriods: (pid?: string) => ['finance', 'billing-periods', pid] as const,
  invoices: (p?: Record<string, unknown>) => ['finance', 'invoices', p] as const,
  invoiceStats: () => ['finance', 'invoices', 'stats'] as const,
};

export function useFinanceSummary(propertyId?: string) {
  return useQuery({
    queryKey: financeKeys.summary(propertyId),
    queryFn: () => financeApi.summary(propertyId),
  });
}

export function useBankAccounts() {
  return useQuery({
    queryKey: financeKeys.bankAccounts(),
    queryFn: () => financeApi.bankAccounts.list(),
  });
}

export function useTransactions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: financeKeys.transactions(params),
    queryFn: () => financeApi.transactions.list(params),
  });
}

export function usePrescriptions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: financeKeys.prescriptions(params),
    queryFn: () => financeApi.prescriptions.list(params),
  });
}

export function useBillingPeriods(propertyId?: string) {
  return useQuery({
    queryKey: financeKeys.billingPeriods(propertyId),
    queryFn: () => financeApi.billingPeriods.list(propertyId),
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; accountNumber: string; bankCode: string; iban?: string; currency?: string; propertyId?: string; accountType?: string; isDefault?: boolean }) =>
      financeApi.bankAccounts.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.bankAccounts() }),
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; accountNumber?: string; bankCode?: string; iban?: string; currency?: string; accountType?: string; isDefault?: boolean; isActive?: boolean } }) =>
      financeApi.bankAccounts.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.bankAccounts() }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.bankAccounts.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.bankAccounts() }),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => financeApi.transactions.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => financeApi.prescriptions.create(dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['finance', 'prescriptions'] }),
  });
}

export function useCreateBillingPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { propertyId: string; name: string; dateFrom: string; dateTo: string }) =>
      financeApi.billingPeriods.create(dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['finance', 'billing-periods'] }),
  });
}

export function useImportTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bankAccountId, file }: { bankAccountId: string; file: File }) =>
      financeApi.importTransactions(bankAccountId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

/** Invalidate all finance-related queries after match/unmatch */
function invalidateMatchRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
  qc.invalidateQueries({ queryKey: ['finance', 'prescriptions'] });
  qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
  qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
  // Cross-module: debtors, konto, reminders
  qc.invalidateQueries({ queryKey: ['debtors'] });
  qc.invalidateQueries({ queryKey: ['konto'] });
  qc.invalidateQueries({ queryKey: ['konto-reminders'] });
}

export function useMatchTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bankAccountId?: string) =>
      financeApi.matchTransactions(bankAccountId),
    onSuccess: () => invalidateMatchRelated(qc),
  });
}

export function useGeneratePrescriptions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { propertyId: string; month: string; dueDay?: number; amount?: number }) =>
      financeApi.generatePrescriptions(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'prescriptions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.prescriptions.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'prescriptions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.transactions.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

export function useMatchSingle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      prescriptionId,
    }: {
      transactionId: string;
      prescriptionId: string;
    }) => financeApi.matchSingle(transactionId, prescriptionId),
    onSuccess: () => invalidateMatchRelated(qc),
  });
}

// ─── ENHANCED MATCHING ────────────────────────────────────────────

export function useAutoMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { propertyId?: string; bankAccountId?: string }) =>
      financeApi.matching.auto(dto),
    onSuccess: () => invalidateMatchRelated(qc),
  });
}

export function useMatchAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) =>
      financeApi.matching.matchAll(propertyId),
    onSuccess: () => invalidateMatchRelated(qc),
  });
}

export function useManualMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ txId, dto }: { txId: string; dto: { target: MatchTarget; entityId?: string; amount?: number; note?: string } }) =>
      financeApi.matching.manualMatch(txId, dto),
    onSuccess: () => invalidateMatchRelated(qc),
  });
}

export function useUnmatchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) =>
      financeApi.matching.unmatch(txId),
    onSuccess: () => invalidateMatchRelated(qc),
  });
}

export function useMatchSuggestions(txId: string | null) {
  return useQuery({
    queryKey: ['finance', 'match-suggestions', txId],
    queryFn: () => financeApi.matching.suggestions(txId!),
    enabled: !!txId,
  });
}

// ─── INVOICES (Doklady) ───────────────────────────────────────────

export function useInvoices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: financeKeys.invoices(params),
    queryFn: () => financeApi.invoices.list(params),
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: financeKeys.invoiceStats(),
    queryFn: () => financeApi.invoices.stats(),
    staleTime: 30_000,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => financeApi.invoices.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) =>
      financeApi.invoices.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.invoices.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
    },
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: { paidAt?: string; paymentMethod?: string; paidAmount?: number; note?: string } }) =>
      financeApi.invoices.markPaid(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

export function usePairInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, transactionId }: { invoiceId: string; transactionId: string }) =>
      financeApi.invoices.pair(invoiceId, transactionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}

export function useImportIsdoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (xmlContent: string) => financeApi.invoices.importIsdoc(xmlContent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
    },
  });
}

export function useExportIsdoc() {
  return useMutation({
    mutationFn: (id: string) => financeApi.invoices.exportIsdoc(id),
  });
}

export function useSubmitInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.invoices.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
    },
  });
}

export function useApproveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.invoices.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
    },
  });
}

// ─── INVOICE ACTIONS ──────────────────────────────────────────────

export function useCopyInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeApi.invoices.copy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'invoices'] }),
  })
}

export function useCopyRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, period, count }: { id: string; period: 'monthly' | 'quarterly'; count: number }) =>
      financeApi.invoices.copyRecurring(id, { period, count }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'invoices'] }),
  })
}

export function useChangeInvoiceType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => financeApi.invoices.changeType(id, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'invoices'] }),
  })
}

export function useChangeInvoiceNumber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, number }: { id: string; number: string }) => financeApi.invoices.changeNumber(id, number),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'invoices'] }),
  })
}

export function useAddInvoiceTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tag }: { id: string; tag: string }) => financeApi.invoices.addTag(id, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'invoices'] }),
  })
}

export function useRemoveInvoiceTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tag }: { id: string; tag: string }) => financeApi.invoices.removeTag(id, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'invoices'] }),
  })
}

// ─── INVOICE ALLOCATIONS ──────────────────────────────────────────

export function useInvoiceAllocations(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'invoices', invoiceId, 'allocations'],
    queryFn: () => financeApi.invoices.getAllocations(invoiceId!),
    enabled: !!invoiceId,
  })
}

export function useAllocationSummary(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'invoices', invoiceId, 'allocation-summary'],
    queryFn: () => financeApi.invoices.getAllocationSummary(invoiceId!),
    enabled: !!invoiceId,
  })
}

export function useCreateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, dto }: { invoiceId: string; dto: Record<string, unknown> }) =>
      financeApi.invoices.createAllocation(invoiceId, dto),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices', vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      qc.invalidateQueries({ queryKey: ['components'] })
    },
  })
}

export function useUpdateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, allocationId, dto }: { invoiceId: string; allocationId: string; dto: Record<string, unknown> }) =>
      financeApi.invoices.updateAllocation(invoiceId, allocationId, dto),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices', vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      qc.invalidateQueries({ queryKey: ['components'] })
    },
  })
}

export function useDeleteAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, allocationId }: { invoiceId: string; allocationId: string }) =>
      financeApi.invoices.deleteAllocation(invoiceId, allocationId),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices', vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      qc.invalidateQueries({ queryKey: ['components'] })
    },
  })
}

export function useReturnInvoiceToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      financeApi.invoices.returnToDraft(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
    },
  });
}

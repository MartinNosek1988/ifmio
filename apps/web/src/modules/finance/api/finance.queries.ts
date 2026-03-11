import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from './finance.api';

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
    mutationFn: (dto: { name: string; accountNumber: string; iban?: string; bankCode?: string; currency?: string; propertyId?: string }) =>
      financeApi.bankAccounts.create(dto),
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

export function useMatchTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bankAccountId?: string) =>
      financeApi.matchTransactions(bankAccountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'prescriptions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'prescriptions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
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
    mutationFn: (id: string) => financeApi.invoices.markPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
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

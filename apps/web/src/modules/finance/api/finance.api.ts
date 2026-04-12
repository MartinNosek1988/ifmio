import { apiClient } from '../../../core/api/client';

export interface ApiBankAccount {
  id: string;
  tenantId: string;
  propertyId?: string;
  name: string;
  accountNumber: string;
  iban?: string;
  bankCode?: string;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  accountType?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
  property?: { id: string; name: string } | null;
}

export interface CreateBankAccountDto {
  name: string;
  accountNumber: string;
  bankCode: string;
  iban?: string;
  currency?: string;
  propertyId?: string;
  accountType?: string;
  isDefault?: boolean;
}

export interface UpdateBankAccountDto {
  name?: string;
  accountNumber?: string;
  bankCode?: string;
  iban?: string;
  currency?: string;
  accountType?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export type MatchTarget = 'KONTO' | 'INVOICE' | 'COMPONENT' | 'NO_EFFECT' | 'UNSPECIFIED';

export interface ApiBankTransaction {
  id: string;
  tenantId: string;
  bankAccountId: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'unmatched' | 'matched' | 'partially_matched' | 'ignored';
  date: string;
  counterparty?: string;
  variableSymbol?: string;
  description?: string;
  matchTarget?: MatchTarget | null;
  matchedEntityId?: string | null;
  matchedEntityType?: string | null;
  matchedAt?: string | null;
  matchedBy?: string | null;
  matchNote?: string | null;
  splitParentId?: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccount?: { id: string; name: string; propertyId?: string };
  prescription?: { id: string; description: string; variableSymbol?: string };
  resident?: { id: string; firstName: string; lastName: string };
}

export interface ApiPrescription {
  id: string;
  tenantId: string;
  propertyId: string;
  type: string;
  status: string;
  amount: number;
  vatAmount: number;
  dueDay: number;
  variableSymbol?: string;
  description: string;
  source?: string | null;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string };
  unit?: { id: string; name: string };
  resident?: { id: string; firstName: string; lastName: string };
  items: { id: string; name: string; amount: number; vatRate: number; unit?: string; quantity: number; componentId?: string | null }[];
}

export interface ApiBillingPeriod {
  id: string;
  tenantId: string;
  propertyId: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  _count?: { prescriptions: number };
}

export interface FinanceSummary {
  totalTransactions: number;
  totalVolume: number;
  unmatchedCount: number;
  activePrescriptions: number;
  openBillingPeriods: number;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  vatRate: number;
  vatAmount: number;
}

export type InvoiceApprovalStatus = 'draft' | 'submitted' | 'approved';

export interface ApiInvoice {
  id: string;
  tenantId: string;
  propertyId?: string;
  number: string;
  type: 'received' | 'issued' | 'proforma' | 'credit_note';
  supplierName?: string;
  supplierIco?: string;
  supplierDic?: string;
  buyerName?: string;
  buyerIco?: string;
  buyerDic?: string;
  description?: string;
  amountBase: number;
  vatRate: number;
  vatAmount: number;
  amountTotal: number;
  rounding?: number;
  currency: string;
  issueDate: string;
  duzp?: string | null;
  dueDate?: string | null;
  paymentDate?: string | null;
  isPaid: boolean;
  paymentMethod?: string | null;
  paidAmount?: number | null;
  variableSymbol?: string;
  constantSymbol?: string | null;
  specificSymbol?: string | null;
  paymentIban?: string | null;
  allocationStatus: string;
  tags: string[];
  transactionId?: string | null;
  supplierId?: string | null;
  buyerId?: string | null;
  lines?: InvoiceLine[] | null;
  isdocXml?: string | null;
  note?: string;
  pdfBase64?: string | null;
  hasPdf?: boolean;
  hasIsdoc?: boolean;
  approvalStatus: InvoiceApprovalStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string } | null;
  transaction?: { id: string; description: string; amount: number } | null;
}

export interface InvoiceStats {
  total: number;
  unpaid: number;
  overdue: number;
  totalAmount: number;
}

export interface MatchSuggestion {
  entityId: string;
  entityType: 'prescription' | 'invoice';
  label: string;
  amount: number;
  vs?: string;
  confidence: 'exact' | 'vs_match' | 'amount_match' | 'none';
  period?: string;
  residentName?: string;
  outstanding?: number;
}

export interface AutoMatchResponse {
  total: number;
  matched: number;
  unmatched: number;
  results: Array<{
    txId: string;
    matchedTo: string | null;
    confidence: string;
    target: MatchTarget | null;
    amount: number;
  }>;
}

export interface MatchAllResponse extends AutoMatchResponse {
  feesMarked: number;
  summary: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiAllocation {
  id: string
  invoiceId: string
  componentId: string
  amount: number
  vatRate: number | null
  vatAmount: number | null
  year: number | null
  periodFrom: string | null
  periodTo: string | null
  consumption: number | null
  consumptionUnit: string | null
  targetOwnerId: string | null
  unitIds: string[]
  note: string | null
  createdAt: string
  component: { id: string; name: string; componentType: string }
}

export interface AllocationSummary {
  totalAmount: number
  allocatedAmount: number
  remainingAmount: number
  allocationStatus: string
  allocations: ApiAllocation[]
}

export const financeApi = {
  summary: (propertyId?: string) =>
    apiClient.get<FinanceSummary>('/finance/summary', { params: { propertyId } }).then((r) => r.data),

  bankAccounts: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get<ApiBankAccount[]>('/finance/bank-accounts', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<ApiBankAccount>(`/finance/bank-accounts/${id}`).then((r) => r.data),
    create: (dto: CreateBankAccountDto) =>
      apiClient.post<ApiBankAccount>('/finance/bank-accounts', dto).then((r) => r.data),
    update: (id: string, dto: UpdateBankAccountDto) =>
      apiClient.patch<ApiBankAccount>(`/finance/bank-accounts/${id}`, dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/finance/bank-accounts/${id}`).then((r) => r.data),
  },

  transactions: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get<Paginated<ApiBankTransaction>>('/finance/transactions', { params }).then((r) => r.data),
    create: (dto: Record<string, unknown>) =>
      apiClient.post<ApiBankTransaction>('/finance/transactions', dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/finance/transactions/${id}`).then((r) => r.data),
  },

  prescriptions: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get<Paginated<ApiPrescription>>('/finance/prescriptions', { params }).then((r) => r.data),
    create: (dto: Record<string, unknown>) =>
      apiClient.post<ApiPrescription>('/finance/prescriptions', dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/finance/prescriptions/${id}`).then((r) => r.data),
  },

  billingPeriods: {
    list: (propertyId?: string) =>
      apiClient.get<ApiBillingPeriod[]>('/finance/billing-periods', { params: { propertyId } }).then((r) => r.data),
    create: (dto: { propertyId: string; name: string; dateFrom: string; dateTo: string }) =>
      apiClient.post<ApiBillingPeriod>('/finance/billing-periods', dto).then((r) => r.data),
  },

  importTransactions: (bankAccountId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post(`/finance/import/${bankAccountId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  matchTransactions: (bankAccountId?: string) =>
    apiClient
      .post('/finance/match', { bankAccountId })
      .then((r) => r.data),

  matching: {
    auto: (dto: { propertyId?: string; bankAccountId?: string }) =>
      apiClient.post<AutoMatchResponse>('/finance/matching/auto', dto).then((r) => r.data),
    matchAll: (propertyId: string) =>
      apiClient.post<MatchAllResponse>('/finance/matching/match-all', { propertyId }).then((r) => r.data),
    manualMatch: (txId: string, dto: { target: MatchTarget; entityId?: string; amount?: number; note?: string }) =>
      apiClient.post<ApiBankTransaction>(`/finance/matching/${txId}/match`, dto).then((r) => r.data),
    unmatch: (txId: string) =>
      apiClient.patch(`/finance/matching/${txId}/unmatch`).then((r) => r.data),
    unmatched: (params?: Record<string, unknown>) =>
      apiClient.get<Paginated<ApiBankTransaction>>('/finance/matching/unmatched', { params }).then((r) => r.data),
    suggestions: (txId: string) =>
      apiClient.get<MatchSuggestion[]>(`/finance/matching/${txId}/suggestions`).then((r) => r.data),
  },

  generatePrescriptions: (dto: {
    propertyId: string
    month:      string
    dueDay?:    number
    amount?:    number
  }) =>
    apiClient.post('/finance/prescriptions/generate', dto).then((r) => r.data),

  matchSingle: (transactionId: string, prescriptionId: string) =>
    apiClient
      .post('/finance/match-single', { transactionId, prescriptionId })
      .then((r) => r.data),

  invoices: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get<Paginated<ApiInvoice>>('/finance/invoices', { params }).then((r) => r.data),
    stats: (propertyId?: string) =>
      apiClient.get<InvoiceStats>('/finance/invoices/stats', { params: propertyId ? { propertyId } : undefined }).then((r) => r.data),
    getOne: (id: string) =>
      apiClient.get<ApiInvoice>(`/finance/invoices/${id}`).then((r) => r.data),
    create: (dto: Record<string, unknown>) =>
      apiClient.post<ApiInvoice>('/finance/invoices', dto).then((r) => r.data),
    update: (id: string, dto: Record<string, unknown>) =>
      apiClient.put<ApiInvoice>(`/finance/invoices/${id}`, dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/finance/invoices/${id}`).then((r) => r.data),
    markPaid: (id: string, dto?: { paidAt?: string; paymentMethod?: string; paidAmount?: number; note?: string }) =>
      apiClient.post(`/finance/invoices/${id}/mark-paid`, dto || {}).then((r) => r.data),
    pair: (id: string, transactionId: string) =>
      apiClient.post(`/finance/invoices/${id}/pair`, { transactionId }).then((r) => r.data),
    extractPdf: (pdfBase64: string, fileName?: string) =>
      apiClient.post<{ extracted: Record<string, unknown>; confidence: 'high' | 'medium' | 'low'; usage?: { inputTokens: number; outputTokens: number; costUsd: number } }>('/finance/invoices/extract-pdf', { pdfBase64, fileName }).then((r) => r.data),
    getAiExtractionStats: (period = 'month') =>
      apiClient.get<{ totalExtractions: number; successfulExtractions: number; totalInputTokens: number; totalOutputTokens: number; totalCostUsd: number; totalCostCzk: number; avgCostPerInvoice: number; byConfidence: { high: number; medium: number; low: number }; byModel: Array<{ model: string; count: number; costUsd: number; tokens: number }> }>(`/finance/invoices/ai-extraction-stats?period=${period}`).then((r) => r.data),
    saveExtractionPattern: (invoiceId: string, originalExtracted: Record<string, unknown>, pdfBase64?: string) =>
      apiClient.post<{ saved: boolean; supplierIco?: string; corrections?: number }>('/finance/invoices/save-extraction-pattern', { invoiceId, originalExtracted, pdfBase64 }).then((r) => r.data),
    getExtractionPatterns: () =>
      apiClient.get<Array<{ id: string; supplierIco: string; supplierName: string | null; fieldExamples: Record<string, string>; hints: string | null; usageCount: number; successRate: number | null; lastUsedAt: string | null; createdAt: string }>>('/finance/invoices/extraction-patterns').then((r) => r.data),
    deleteExtractionPattern: (supplierIco: string) =>
      apiClient.delete(`/finance/invoices/extraction-patterns/${encodeURIComponent(supplierIco)}`).then((r) => r.data),

    // Batch extraction
    createBatchExtract: (items: Array<{ pdfBase64: string; fileName?: string }>) =>
      apiClient.post<{ batchId: string; anthropicBatchId: string; itemCount: number; estimatedCostUsd: number; estimatedCostCzk: number }>('/finance/invoices/batch-extract', { items }).then((r) => r.data),
    listBatches: () =>
      apiClient.get<Array<{ id: string; status: string; totalCount: number; processedCount: number; failedCount: number; totalCostUsd: number | null; createdAt: string; submittedAt: string | null; completedAt: string | null; _count: { items: number } }>>('/finance/invoices/batch-extract').then((r) => r.data),
    checkBatch: (batchId: string) =>
      apiClient.get<{ id: string; status: string; totalCount: number; processedCount: number; failedCount: number; totalCostUsd: number | null; items: Array<{ id: string; customId: string; fileName: string | null; status: string; extractedData: Record<string, any> | null; confidence: string | null; invoiceId: string | null; errorMessage: string | null; costUsd: number | null; completedAt: string | null }>; requestCounts?: { processing: number; succeeded: number; errored: number } }>(`/finance/invoices/batch-extract/${batchId}`).then((r) => r.data),
    getBatchItemPdf: (batchId: string, itemId: string) =>
      apiClient.get<string>(`/finance/invoices/batch-extract/${batchId}/items/${itemId}/pdf`).then((r) => r.data),
    saveBatchInvoices: (batchId: string, approvedItems: Array<{ itemId: string; corrections?: Record<string, any> }>) =>
      apiClient.post<{ saved: number; failed: number; results: Array<{ itemId: string; success: boolean; invoiceId?: string; error?: string }> }>(`/finance/invoices/batch-extract/${batchId}/save`, { approvedItems }).then((r) => r.data),

    importIsdoc: (xmlContent: string) =>
      apiClient.post<ApiInvoice>('/finance/invoices/import-isdoc', { xmlContent }).then((r) => r.data),
    importIsdocBulk: (invoices: Array<{ xmlContent: string; pdfBase64?: string; pdfFileName?: string; isdocFileName: string }>) =>
      apiClient.post<{ results: Array<{ isdocFileName: string; success: boolean; invoiceId?: string; number?: string; error?: string }>; created: number; failed: number }>('/finance/invoices/import-isdoc-bulk', { invoices }).then((r) => r.data),
    getDocuments: (id: string) =>
      apiClient.get<Array<{ id: string; name: string; originalName: string; mimeType: string; size: number; storageKey: string; createdAt: string }>>(`/finance/invoices/${id}/documents`).then((r) => r.data),
    exportIsdoc: (id: string) =>
      apiClient.get<string>(`/finance/invoices/${id}/export-isdoc`).then((r) => r.data),
    getPaymentQr: (id: string, size = 200) =>
      apiClient.get<{ qrString: string | null; qrDataUrl: string | null }>(`/finance/invoices/${id}/payment-qr?size=${size}`).then((r) => r.data),
    submit: (id: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/submit`).then((r) => r.data),
    approve: (id: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/approve`).then((r) => r.data),
    returnToDraft: (id: string, reason?: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/return-to-draft`, { reason }).then((r) => r.data),

    // Actions
    copy: (id: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/copy`).then(r => r.data),
    copyRecurring: (id: string, data: { period: 'monthly' | 'quarterly'; count: number }) =>
      apiClient.post<{ created: ApiInvoice[]; count: number }>(`/finance/invoices/${id}/copy-recurring`, data).then(r => r.data),
    changeType: (id: string, type: string) =>
      apiClient.patch<ApiInvoice>(`/finance/invoices/${id}/change-type`, { type }).then(r => r.data),
    changeNumber: (id: string, number: string) =>
      apiClient.patch<ApiInvoice>(`/finance/invoices/${id}/change-number`, { number }).then(r => r.data),
    addTag: (id: string, tag: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/add-tag`, { tag }).then(r => r.data),
    removeTag: (id: string, tag: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/remove-tag`, { tag }).then(r => r.data),
    getHistory: (id: string) =>
      apiClient.get<unknown[]>(`/finance/invoices/${id}/history`).then(r => r.data),

    // Allocations
    getAllocations: (id: string) =>
      apiClient.get<ApiAllocation[]>(`/finance/invoices/${id}/allocations`).then(r => r.data),
    getAllocationSummary: (id: string) =>
      apiClient.get<AllocationSummary>(`/finance/invoices/${id}/allocation-summary`).then(r => r.data),
    createAllocation: (id: string, dto: Record<string, unknown>) =>
      apiClient.post<ApiAllocation>(`/finance/invoices/${id}/allocations`, dto).then(r => r.data),
    updateAllocation: (id: string, allocationId: string, dto: Record<string, unknown>) =>
      apiClient.put<ApiAllocation>(`/finance/invoices/${id}/allocations/${allocationId}`, dto).then(r => r.data),
    deleteAllocation: (id: string, allocationId: string) =>
      apiClient.delete(`/finance/invoices/${id}/allocations/${allocationId}`).then(r => r.data),
  },
};

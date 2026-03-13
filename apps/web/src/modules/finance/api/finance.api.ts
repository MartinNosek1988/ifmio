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
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
}

export interface ApiBankTransaction {
  id: string;
  tenantId: string;
  bankAccountId: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'unmatched' | 'matched' | 'partially_matched';
  date: string;
  counterparty?: string;
  variableSymbol?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  bankAccount?: { id: string; name: string };
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
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string };
  unit?: { id: string; name: string };
  resident?: { id: string; firstName: string; lastName: string };
  items: { id: string; name: string; amount: number; vatRate: number; unit?: string; quantity: number }[];
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
  currency: string;
  issueDate: string;
  duzp?: string | null;
  dueDate?: string | null;
  paymentDate?: string | null;
  isPaid: boolean;
  paymentMethod?: string | null;
  paidAmount?: number | null;
  variableSymbol?: string;
  transactionId?: string | null;
  supplierId?: string | null;
  buyerId?: string | null;
  lines?: InvoiceLine[] | null;
  isdocXml?: string | null;
  note?: string;
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

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const financeApi = {
  summary: (propertyId?: string) =>
    apiClient.get<FinanceSummary>('/finance/summary', { params: { propertyId } }).then((r) => r.data),

  bankAccounts: {
    list: () =>
      apiClient.get<ApiBankAccount[]>('/finance/bank-accounts').then((r) => r.data),
    create: (dto: { name: string; accountNumber: string; iban?: string; bankCode?: string; currency?: string; propertyId?: string }) =>
      apiClient.post<ApiBankAccount>('/finance/bank-accounts', dto).then((r) => r.data),
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
    stats: () =>
      apiClient.get<InvoiceStats>('/finance/invoices/stats').then((r) => r.data),
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
    importIsdoc: (xmlContent: string) =>
      apiClient.post<ApiInvoice>('/finance/invoices/import-isdoc', { xmlContent }).then((r) => r.data),
    exportIsdoc: (id: string) =>
      apiClient.get<string>(`/finance/invoices/${id}/export-isdoc`).then((r) => r.data),
    submit: (id: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/submit`).then((r) => r.data),
    approve: (id: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/approve`).then((r) => r.data),
    returnToDraft: (id: string, reason?: string) =>
      apiClient.post<ApiInvoice>(`/finance/invoices/${id}/return-to-draft`, { reason }).then((r) => r.data),
  },
};

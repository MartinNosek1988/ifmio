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
  },

  prescriptions: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get<Paginated<ApiPrescription>>('/finance/prescriptions', { params }).then((r) => r.data),
    create: (dto: Record<string, unknown>) =>
      apiClient.post<ApiPrescription>('/finance/prescriptions', dto).then((r) => r.data),
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
};

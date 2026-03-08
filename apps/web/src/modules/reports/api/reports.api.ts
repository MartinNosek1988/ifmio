import { apiClient } from '../../../core/api/client';

export interface MonthlyReport {
  period: { year: number; month: number };
  summary: {
    income: number;
    expense: number;
    balance: number;
    expectedIncome: number;
    collectionRate: number;
    activeResidents: number;
    activePrescriptions: number;
  };
  transactions: {
    id: string;
    date: string;
    amount: number;
    type: string;
    status: string;
    counterparty: string | null;
    variableSymbol: string | null;
    description: string | null;
    resident: string | null;
  }[];
  prescriptions: {
    id: string;
    description: string;
    amount: number;
    dueDay: number;
    property: string | null;
    resident: string | null;
  }[];
}

export interface YearlyOverview {
  year: number;
  months: {
    month: number;
    income: number;
    expense: number;
    balance: number;
    collectionRate: number;
  }[];
  totals: { income: number; expense: number; balance: number };
}

export const reportsApi = {
  monthly: (year: number, month: number) =>
    apiClient
      .get<MonthlyReport>('/reports/monthly', { params: { year, month } })
      .then((r) => r.data),

  exportMonthly: (year: number, month: number) =>
    apiClient
      .get('/reports/monthly/export', {
        params: { year, month },
        responseType: 'blob',
      })
      .then((r) => {
        const url = window.URL.createObjectURL(r.data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${year}-${String(month).padStart(2, '0')}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }),

  yearly: (year: number) =>
    apiClient
      .get<YearlyOverview>('/reports/yearly', { params: { year } })
      .then((r) => r.data),
};

import { apiClient } from '../../../core/api/client';

export interface DashboardKpi {
  properties: number;
  units: number;
  occupiedUnits: number;
  occupancyPct: number;
  activeResidents: number;
  debtResidents: number;
  openTickets: number;
  openWorkOrders: number;
  expiringLeases: number;
  calibrationDue: number;
  activePrescriptions: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  expectedMonthly: number;
  collectionRate: number;
}

export interface MonthlyRow {
  month: number;
  income: number;
  expense: number;
  balance: number;
  collectionRate: number;
}

export interface YearlyOverview {
  year: number;
  months: MonthlyRow[];
  totals: { income: number; expense: number; balance: number };
}

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

export interface PropertyReport {
  id: string;
  name: string;
  address: string;
  totalUnits: number;
  occupied: number;
  occupancyPct: number;
  monthlyPrescriptions: number;
  monthlyRent: number;
  openTickets: number;
  openWorkOrders: number;
  activeLeases: number;
}

export const reportsApi = {
  dashboard: async () => {
    const { data } = await apiClient.get<DashboardKpi>('/reports/dashboard');
    return data;
  },

  yearly: async (year: number) => {
    const { data } = await apiClient.get<YearlyOverview>('/reports/yearly', { params: { year } });
    return data;
  },

  monthly: async (year: number, month: number) => {
    const { data } = await apiClient.get<MonthlyReport>('/reports/monthly', { params: { year, month } });
    return data;
  },

  properties: async () => {
    const { data } = await apiClient.get<PropertyReport[]>('/reports/properties');
    return data;
  },

  exportMonthlyXlsx: (year: number, month: number) => {
    const token = sessionStorage.getItem('ifmio:access_token');
    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
    window.open(`${baseUrl}/reports/monthly/export?year=${year}&month=${month}&token=${token}`, '_blank');
  },
};

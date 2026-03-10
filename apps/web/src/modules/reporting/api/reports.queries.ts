import { useQuery } from '@tanstack/react-query';
import { reportsApi } from './reports.api';

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => ['reports', 'dashboard'] as const,
  yearly: (year: number) => ['reports', 'yearly', year] as const,
  monthly: (year: number, month: number) => ['reports', 'monthly', year, month] as const,
  properties: () => ['reports', 'properties'] as const,
};

export function useDashboardKpi() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => reportsApi.dashboard(),
    staleTime: 60_000,
  });
}

export function useYearlyOverview(year: number) {
  return useQuery({
    queryKey: reportKeys.yearly(year),
    queryFn: () => reportsApi.yearly(year),
    staleTime: 60_000,
  });
}

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: reportKeys.monthly(year, month),
    queryFn: () => reportsApi.monthly(year, month),
    enabled: !!year && !!month,
    staleTime: 60_000,
  });
}

export function usePropertyReport() {
  return useQuery({
    queryKey: reportKeys.properties(),
    queryFn: () => reportsApi.properties(),
    staleTime: 60_000,
  });
}

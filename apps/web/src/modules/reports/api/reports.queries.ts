import { useQuery } from '@tanstack/react-query';
import { reportsApi } from './reports.api';

export const reportsKeys = {
  all: ['reports'] as const,
  monthly: (y: number, m: number) => ['reports', 'monthly', y, m] as const,
  yearly: (y: number) => ['reports', 'yearly', y] as const,
};

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: reportsKeys.monthly(year, month),
    queryFn: () => reportsApi.monthly(year, month),
  });
}

export function useYearlyOverview(year: number) {
  return useQuery({
    queryKey: reportsKeys.yearly(year),
    queryFn: () => reportsApi.yearly(year),
  });
}

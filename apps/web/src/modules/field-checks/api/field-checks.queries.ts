import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fieldChecksApi, type CreateFieldCheckInput, type LogScanEventInput } from './field-checks.api';

export const fieldCheckKeys = {
  all: ['field-checks'] as const,
  scanEvents: (assetId: string) => [...fieldCheckKeys.all, 'scan-events', assetId] as const,
  checks: (assetId: string) => [...fieldCheckKeys.all, 'checks', assetId] as const,
  check: (checkId: string) => [...fieldCheckKeys.all, 'detail', checkId] as const,
};

export function useScanEvents(assetId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: fieldCheckKeys.scanEvents(assetId),
    queryFn: () => fieldChecksApi.listScanEvents(assetId, params),
  });
}

export function useFieldChecks(assetId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: fieldCheckKeys.checks(assetId),
    queryFn: () => fieldChecksApi.listFieldChecks(assetId, params),
  });
}

export function useFieldCheck(checkId: string) {
  return useQuery({
    queryKey: fieldCheckKeys.check(checkId),
    queryFn: () => fieldChecksApi.getFieldCheck(checkId),
  });
}

export function useLogScanEvent(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogScanEventInput) => fieldChecksApi.logScanEvent(assetId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldCheckKeys.scanEvents(assetId) });
    },
  });
}

export function useCreateFieldCheck(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, scanEventId }: { input: CreateFieldCheckInput; scanEventId?: string }) =>
      fieldChecksApi.createFieldCheck(assetId, input, scanEventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldCheckKeys.checks(assetId) });
    },
  });
}

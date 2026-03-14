import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetQrApi } from './asset-qr.api';

export function useAssetQr(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'qr'],
    queryFn: () => assetQrApi.getActive(assetId),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAssetQrHistory(assetId: string, enabled = false) {
  return useQuery({
    queryKey: ['assets', assetId, 'qr', 'history'],
    queryFn: () => assetQrApi.getHistory(assetId),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateQr(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => assetQrApi.create(assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', assetId, 'qr'] });
    },
  });
}

export function useReissueQr(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notes?: string) => assetQrApi.reissue(assetId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', assetId, 'qr'] });
    },
  });
}

export function useMarkQrPrinted(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => assetQrApi.markPrinted(assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', assetId, 'qr'] });
    },
  });
}

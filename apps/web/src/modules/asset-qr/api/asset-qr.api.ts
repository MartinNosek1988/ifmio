import { apiClient } from '../../../core/api/client';

export interface AssetQrCode {
  id: string;
  assetId: string;
  token: string;
  humanCode: string;
  status: 'active' | 'replaced' | 'disabled';
  labelVersion: number;
  generatedAt: string;
  printedAt: string | null;
  replacedAt: string | null;
  qrImageDataUrl: string;
}

export interface AssetQrHistoryItem {
  id: string;
  humanCode: string;
  status: 'active' | 'replaced' | 'disabled';
  labelVersion: number;
  generatedAt: string;
  printedAt: string | null;
  replacedAt: string | null;
}

export interface QrResolveResult {
  assetId: string;
  status: 'active' | 'replaced' | 'disabled';
  message?: string;
}

export const assetQrApi = {
  getActive: (assetId: string) =>
    apiClient.get<AssetQrCode | { active: false }>(`/assets/${assetId}/qr`).then((r) => r.data),

  create: (assetId: string) =>
    apiClient.post<AssetQrCode>(`/assets/${assetId}/qr`).then((r) => r.data),

  reissue: (assetId: string, notes?: string) =>
    apiClient.post<AssetQrCode>(`/assets/${assetId}/qr/reissue`, { notes }).then((r) => r.data),

  markPrinted: (assetId: string) =>
    apiClient.post<AssetQrCode>(`/assets/${assetId}/qr/mark-printed`).then((r) => r.data),

  getHistory: (assetId: string) =>
    apiClient.get<AssetQrHistoryItem[]>(`/assets/${assetId}/qr/history`).then((r) => r.data),

  resolveToken: (token: string) =>
    apiClient.get<QrResolveResult>(`/qr/${token}`).then((r) => r.data),

  labelPdfUrl: (assetId: string) => `/api/v1/assets/${assetId}/qr/label.pdf`,
};

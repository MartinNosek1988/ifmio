import { apiClient } from '../../../core/api/client';

export type QrScanOutcome = 'resolved' | 'invalid' | 'replaced' | 'disabled' | 'unauthorized';
export type QrScanSource = 'qr_scan' | 'manual_open' | 'redirected_after_login';
export type FieldCheckType = 'daily_check' | 'inspection' | 'service_check' | 'route_check' | 'custom';
export type FieldCheckStatus = 'started' | 'completed' | 'failed' | 'cancelled';
export type FieldCheckResult = 'ok' | 'issue_found' | 'needs_follow_up' | 'not_accessible';
export type FieldCheckConfidenceLevel = 'low' | 'medium' | 'high';
export type FieldCheckSignalType = 'qr_scan' | 'gps' | 'photo' | 'reading' | 'checklist' | 'manual_code';

export interface LogScanEventInput {
  outcome?: QrScanOutcome;
  source?: QrScanSource;
  assetQrCodeId?: string;
  appVersion?: string;
  deviceInfo?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  notes?: string;
}

export interface ScanEventResult {
  id: string;
  outcome: QrScanOutcome;
  source: QrScanSource;
  scannedAt: string;
}

export interface FieldCheckSignalInput {
  signalType: FieldCheckSignalType;
  isValid?: boolean;
  payloadJson: Record<string, unknown>;
}

export interface CreateFieldCheckInput {
  checkType?: FieldCheckType;
  revisionPlanId?: string;
  notes?: string;
  signals?: FieldCheckSignalInput[];
  result?: FieldCheckResult;
}

export interface FieldCheckSignal {
  id: string;
  signalType: FieldCheckSignalType;
  isValid: boolean | null;
}

export interface FieldCheckItem {
  id: string;
  assetId: string;
  checkType: FieldCheckType;
  status: FieldCheckStatus;
  result: FieldCheckResult | null;
  startedAt: string;
  completedAt: string | null;
  confidenceLevel: FieldCheckConfidenceLevel;
  confidenceScore: number;
  notes: string | null;
  signals: FieldCheckSignal[];
  user: { id: string; name: string } | null;
  scanEvent: { id: string; outcome: QrScanOutcome; scannedAt: string } | null;
}

export interface ScanEvent {
  id: string;
  outcome: QrScanOutcome;
  source: QrScanSource;
  scannedAt: string;
  latitude: string | null;
  longitude: string | null;
  accuracyMeters: string | null;
  notes: string | null;
  user: { id: string; name: string } | null;
  fieldChecks: { id: string; status: FieldCheckStatus; result: FieldCheckResult | null; confidenceLevel: FieldCheckConfidenceLevel }[];
}

export const fieldChecksApi = {
  logScanEvent: (assetId: string, input: LogScanEventInput) =>
    apiClient.post<ScanEventResult>(`/assets/${assetId}/scan-events`, input).then((r) => r.data),

  listScanEvents: (assetId: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<{ data: ScanEvent[]; total: number }>(`/assets/${assetId}/scan-events`, { params }).then((r) => r.data),

  createFieldCheck: (assetId: string, input: CreateFieldCheckInput, scanEventId?: string) =>
    apiClient
      .post<FieldCheckItem>(`/assets/${assetId}/field-checks`, input, {
        params: scanEventId ? { scanEventId } : undefined,
      })
      .then((r) => r.data),

  listFieldChecks: (assetId: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<{ data: FieldCheckItem[]; total: number }>(`/assets/${assetId}/field-checks`, { params }).then((r) => r.data),

  getFieldCheck: (checkId: string) =>
    apiClient.get<FieldCheckItem>(`/field-checks/${checkId}`).then((r) => r.data),
};

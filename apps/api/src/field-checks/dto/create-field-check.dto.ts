import { z } from 'zod';

export const CreateFieldCheckDto = z.object({
  checkType: z.enum(['daily_check', 'inspection', 'service_check', 'route_check', 'custom']).default('daily_check'),
  revisionPlanId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  signals: z
    .array(
      z.object({
        signalType: z.enum(['qr_scan', 'gps', 'photo', 'reading', 'checklist', 'manual_code']),
        isValid: z.boolean().optional(),
        payloadJson: z.record(z.string(), z.unknown()),
      }),
    )
    .default([]),
  result: z.enum(['ok', 'issue_found', 'needs_follow_up', 'not_accessible']).optional(),
});

export type CreateFieldCheckDtoType = z.infer<typeof CreateFieldCheckDto>;

export const LogScanEventDto = z.object({
  outcome: z.enum(['resolved', 'invalid', 'replaced', 'disabled', 'unauthorized']).default('resolved'),
  source: z.enum(['qr_scan', 'manual_open', 'redirected_after_login']).default('qr_scan'),
  assetQrCodeId: z.string().optional(),
  appVersion: z.string().optional(),
  deviceInfo: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracyMeters: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export type LogScanEventDtoType = z.infer<typeof LogScanEventDto>;

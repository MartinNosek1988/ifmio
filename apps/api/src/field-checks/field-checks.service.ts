import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '@ifmio/shared-types';
import type { CreateFieldCheckDtoType, LogScanEventDtoType } from './dto/create-field-check.dto';
import {
  FieldCheckConfidenceLevel,
  FieldCheckSignalType,
} from '@prisma/client';

const SIGNAL_WEIGHTS: Record<FieldCheckSignalType, number> = {
  qr_scan: 30,
  gps: 25,
  photo: 20,
  checklist: 15,
  reading: 15,
  manual_code: 5,
};

function computeConfidence(signals: { signalType: FieldCheckSignalType; isValid: boolean | null }[]): {
  score: number;
  level: FieldCheckConfidenceLevel;
} {
  let score = 0;
  for (const s of signals) {
    if (s.isValid !== false) {
      score += SIGNAL_WEIGHTS[s.signalType] ?? 0;
    }
  }
  score = Math.min(score, 100);

  let level: FieldCheckConfidenceLevel;
  if (score >= 70) level = FieldCheckConfidenceLevel.high;
  else if (score >= 40) level = FieldCheckConfidenceLevel.medium;
  else level = FieldCheckConfidenceLevel.low;

  return { score, level };
}

@Injectable()
export class FieldChecksService {
  private readonly logger = new Logger(FieldChecksService.name);

  constructor(private prisma: PrismaService) {}

  private async assertAssetAccess(user: AuthUser, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!asset) throw new NotFoundException('Zařízení nebylo nalezeno');
    return asset;
  }

  /* ─── Log QR scan event (called from QR resolve endpoint) ──────── */

  async logScanEvent(user: AuthUser, assetId: string, dto: LogScanEventDtoType) {
    await this.assertAssetAccess(user, assetId);

    const event = await this.prisma.assetQrScanEvent.create({
      data: {
        tenantId: user.tenantId,
        assetId,
        userId: user.id,
        assetQrCodeId: dto.assetQrCodeId ?? null,
        outcome: dto.outcome,
        source: dto.source,
        appVersion: dto.appVersion ?? null,
        deviceInfo: dto.deviceInfo ?? null,
        ipAddress: null, // set by controller from request
        userAgent: null, // set by controller from request
        latitude: dto.latitude != null ? dto.latitude : null,
        longitude: dto.longitude != null ? dto.longitude : null,
        accuracyMeters: dto.accuracyMeters != null ? dto.accuracyMeters : null,
        locationCapturedAt: dto.latitude != null ? new Date() : null,
        notes: dto.notes ?? null,
      },
      select: {
        id: true,
        outcome: true,
        source: true,
        scannedAt: true,
      },
    });

    this.logger.log(`QR scan event logged for asset ${assetId} by user ${user.id} — outcome: ${dto.outcome}`);
    return event;
  }

  /* ─── Create field check execution (with signals) ──────────────── */

  async createFieldCheck(user: AuthUser, assetId: string, scanEventId: string | undefined, dto: CreateFieldCheckDtoType) {
    await this.assertAssetAccess(user, assetId);

    if (scanEventId) {
      const scanEvent = await this.prisma.assetQrScanEvent.findFirst({
        where: { id: scanEventId, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!scanEvent) throw new NotFoundException('Událost skenování nenalezena');
    }

    const signalsInput = (dto.signals ?? []).map(
      (s): Prisma.AssetFieldCheckSignalCreateWithoutExecutionInput => ({
        signalType: s.signalType as FieldCheckSignalType,
        isValid: s.isValid ?? null,
        payloadJson: s.payloadJson as Prisma.InputJsonValue,
      }),
    );

    const { score, level } = computeConfidence(
      signalsInput.map((s) => ({ signalType: s.signalType, isValid: s.isValid ?? null })),
    );

    const execution = await this.prisma.$transaction(async (tx) => {
      const exec = await tx.assetFieldCheckExecution.create({
        data: {
          tenantId: user.tenantId,
          assetId,
          userId: user.id,
          scanEventId: scanEventId ?? null,
          revisionPlanId: dto.revisionPlanId ?? null,
          checkType: dto.checkType,
          status: dto.result ? 'completed' : 'started',
          result: dto.result ?? null,
          completedAt: dto.result ? new Date() : null,
          notes: dto.notes ?? null,
          confidenceLevel: level,
          confidenceScore: score,
          signals: {
            create: signalsInput,
          },
        },
        include: {
          signals: { select: { id: true, signalType: true, isValid: true } },
        },
      });

      return exec;
    });

    this.logger.log(`Field check created for asset ${assetId} by user ${user.id} — confidence: ${level} (${score})`);
    return this.toResponse(execution);
  }

  /* ─── List field checks for asset ──────────────────────────────── */

  async listForAsset(user: AuthUser, assetId: string, limit = 20, offset = 0) {
    await this.assertAssetAccess(user, assetId);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assetFieldCheckExecution.findMany({
        where: { assetId, tenantId: user.tenantId },
        orderBy: { startedAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          checkType: true,
          status: true,
          result: true,
          startedAt: true,
          completedAt: true,
          confidenceLevel: true,
          confidenceScore: true,
          notes: true,
          user: { select: { id: true, name: true } },
          signals: { select: { id: true, signalType: true, isValid: true } },
        },
      }),
      this.prisma.assetFieldCheckExecution.count({
        where: { assetId, tenantId: user.tenantId },
      }),
    ]);

    return { data, total };
  }

  /* ─── Get scan events for asset ────────────────────────────────── */

  async listScanEvents(user: AuthUser, assetId: string, limit = 20, offset = 0) {
    await this.assertAssetAccess(user, assetId);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.assetQrScanEvent.findMany({
        where: { assetId, tenantId: user.tenantId },
        orderBy: { scannedAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          outcome: true,
          source: true,
          scannedAt: true,
          latitude: true,
          longitude: true,
          accuracyMeters: true,
          notes: true,
          user: { select: { id: true, name: true } },
          fieldChecks: {
            select: { id: true, status: true, result: true, confidenceLevel: true },
          },
        },
      }),
      this.prisma.assetQrScanEvent.count({
        where: { assetId, tenantId: user.tenantId },
      }),
    ]);

    return { data, total };
  }

  /* ─── Get single field check ──────────────────────────────────── */

  async getFieldCheck(user: AuthUser, checkId: string) {
    const exec = await this.prisma.assetFieldCheckExecution.findFirst({
      where: { id: checkId, tenantId: user.tenantId },
      include: {
        signals: true,
        user: { select: { id: true, name: true } },
        scanEvent: { select: { id: true, outcome: true, scannedAt: true } },
      },
    });
    if (!exec) throw new NotFoundException('Kontrola nenalezena');
    return this.toResponse(exec);
  }

  private toResponse(exec: any) {
    return {
      id: exec.id,
      assetId: exec.assetId,
      checkType: exec.checkType,
      status: exec.status,
      result: exec.result,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt,
      confidenceLevel: exec.confidenceLevel,
      confidenceScore: exec.confidenceScore,
      notes: exec.notes,
      signals: exec.signals,
      user: exec.user,
      scanEvent: exec.scanEvent ?? null,
    };
  }
}

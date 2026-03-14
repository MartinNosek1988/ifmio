import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '@ifmio/shared-types';
import { AssetQrStatus } from '@prisma/client';

export interface QrCodeResponse {
  id: string;
  assetId: string;
  token: string;
  humanCode: string;
  status: AssetQrStatus;
  labelVersion: number;
  generatedAt: string;
  printedAt: string | null;
  replacedAt: string | null;
  qrImageDataUrl: string; // base64 PNG for display
}

@Injectable()
export class AssetQrService {
  private readonly logger = new Logger(AssetQrService.name);

  constructor(private prisma: PrismaService) {}

  private generateToken(): string {
    return randomBytes(16).toString('hex'); // 32-char opaque hex token
  }

  private tokenToHumanCode(token: string): string {
    // Take first 8 chars, split into 4+4: e.g. "A3FB-B21E"
    const t = token.slice(0, 8).toUpperCase();
    return `${t.slice(0, 4)}-${t.slice(4, 8)}`;
  }

  private buildQrUrl(token: string, appBaseUrl?: string): string {
    const base = appBaseUrl ?? process.env['APP_BASE_URL'] ?? 'https://app.ifmio.cz';
    return `${base}/q/${token}`;
  }

  private async generateQrImage(token: string): Promise<string> {
    const url = this.buildQrUrl(token);
    return QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }

  private async assertAssetAccess(user: AuthUser, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, name: true, property: { select: { name: true } }, location: true },
    });
    if (!asset) throw new NotFoundException('Zařízení nebylo nalezeno');
    return asset;
  }

  /* ─── Get active QR ────────────────────────────────────────────── */

  async getActiveQr(user: AuthUser, assetId: string): Promise<QrCodeResponse | null> {
    await this.assertAssetAccess(user, assetId);

    const qr = await this.prisma.assetQrCode.findFirst({
      where: { assetId, tenantId: user.tenantId, status: 'active' },
      orderBy: { generatedAt: 'desc' },
    });
    if (!qr) return null;

    const qrImageDataUrl = await this.generateQrImage(qr.token);
    return this.toResponse(qr, qrImageDataUrl);
  }

  /* ─── Create QR (idempotent — returns existing active if present) ─ */

  async createOrGetQr(user: AuthUser, assetId: string): Promise<QrCodeResponse> {
    await this.assertAssetAccess(user, assetId);

    const existing = await this.prisma.assetQrCode.findFirst({
      where: { assetId, tenantId: user.tenantId, status: 'active' },
    });
    if (existing) {
      const qrImageDataUrl = await this.generateQrImage(existing.token);
      return this.toResponse(existing, qrImageDataUrl);
    }

    return this.issueNew(user, assetId);
  }

  /* ─── Reissue — deactivate current, issue new ──────────────────── */

  async reissue(user: AuthUser, assetId: string, notes?: string): Promise<QrCodeResponse> {
    await this.assertAssetAccess(user, assetId);

    return this.prisma.$transaction(async (tx) => {
      const newToken = this.generateToken();
      const newHumanCode = this.tokenToHumanCode(newToken);

      const newQr = await tx.assetQrCode.create({
        data: {
          tenantId: user.tenantId,
          assetId,
          token: newToken,
          humanCode: newHumanCode,
          status: 'active',
          notes: notes ?? null,
        },
      });

      // Mark all existing active as replaced
      await tx.assetQrCode.updateMany({
        where: {
          assetId,
          tenantId: user.tenantId,
          status: 'active',
          id: { not: newQr.id },
        },
        data: {
          status: 'replaced',
          replacedAt: new Date(),
          replacedByQrCodeId: newQr.id,
        },
      });

      this.logger.log(`QR reissued for asset ${assetId} by user ${user.id}, new token: ${newToken.slice(0, 8)}…`);
      const qrImageDataUrl = await this.generateQrImage(newQr.token);
      return this.toResponse(newQr, qrImageDataUrl);
    });
  }

  /* ─── Mark printed ──────────────────────────────────────────────── */

  async markPrinted(user: AuthUser, assetId: string): Promise<QrCodeResponse> {
    await this.assertAssetAccess(user, assetId);

    const qr = await this.prisma.assetQrCode.findFirst({
      where: { assetId, tenantId: user.tenantId, status: 'active' },
    });
    if (!qr) throw new NotFoundException('Žádný aktivní QR kód nenalezen');

    const updated = await this.prisma.assetQrCode.update({
      where: { id: qr.id },
      data: { printedAt: new Date() },
    });

    const qrImageDataUrl = await this.generateQrImage(updated.token);
    return this.toResponse(updated, qrImageDataUrl);
  }

  /* ─── Resolve token (public) ────────────────────────────────────── */

  async resolveToken(token: string): Promise<{ assetId: string; status: AssetQrStatus; message?: string }> {
    const qr = await this.prisma.assetQrCode.findUnique({
      where: { token },
      select: { assetId: true, status: true },
    });

    if (!qr) {
      return { assetId: '', status: 'disabled', message: 'QR kód není platný' };
    }
    if (qr.status === 'replaced') {
      return { assetId: '', status: 'replaced', message: 'Tento QR kód byl nahrazen novým' };
    }
    if (qr.status === 'disabled') {
      return { assetId: '', status: 'disabled', message: 'QR kód není platný' };
    }

    return { assetId: qr.assetId, status: 'active' };
  }

  /* ─── QR history for asset ──────────────────────────────────────── */

  async getHistory(user: AuthUser, assetId: string) {
    await this.assertAssetAccess(user, assetId);

    return this.prisma.assetQrCode.findMany({
      where: { assetId, tenantId: user.tenantId },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        humanCode: true,
        status: true,
        labelVersion: true,
        generatedAt: true,
        printedAt: true,
        replacedAt: true,
      },
    });
  }

  /* ─── Generate PDF label (returns PDFKit doc stream data) ─────────  */

  async generateLabelPdf(user: AuthUser, assetId: string): Promise<{ buffer: Buffer; filename: string }> {
    const asset = await this.assertAssetAccess(user, assetId);

    const qr = await this.prisma.assetQrCode.findFirst({
      where: { assetId, tenantId: user.tenantId, status: 'active' },
    });
    if (!qr) throw new ConflictException('Nejprve vygenerujte QR kód zařízení');

    const qrImageDataUrl = await this.generateQrImage(qr.token);

    // Generate PDF using pdfkit
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: [200, 280], margin: 12 }); // small label size

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const qrBase64 = qrImageDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');

    doc.image(qrBuffer, { fit: [176, 176], align: 'center' });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(14).text(qr.humanCode, { align: 'center' });
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').fontSize(9).text(asset.name, { align: 'center' });
    if (asset.property?.name) {
      doc.font('Helvetica').fontSize(7).fillColor('#555').text(asset.property.name, { align: 'center' });
    }
    if (asset.location) {
      doc.font('Helvetica').fontSize(7).fillColor('#555').text(asset.location, { align: 'center' });
    }

    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(6).fillColor('#888').text('ifmio.cz', { align: 'center' });

    doc.end();

    await new Promise<void>((resolve) => doc.on('end', resolve));
    const buffer = Buffer.concat(chunks);

    return {
      buffer,
      filename: `qr-stitek-${qr.humanCode.toLowerCase()}.pdf`,
    };
  }

  /* ─── Private helpers ───────────────────────────────────────────── */

  private async issueNew(user: AuthUser, assetId: string): Promise<QrCodeResponse> {
    const token = this.generateToken();
    const humanCode = this.tokenToHumanCode(token);

    const qr = await this.prisma.assetQrCode.create({
      data: {
        tenantId: user.tenantId,
        assetId,
        token,
        humanCode,
        status: 'active',
      },
    });

    this.logger.log(`QR issued for asset ${assetId} by user ${user.id}`);
    const qrImageDataUrl = await this.generateQrImage(qr.token);
    return this.toResponse(qr, qrImageDataUrl);
  }

  private toResponse(qr: any, qrImageDataUrl: string): QrCodeResponse {
    return {
      id: qr.id,
      assetId: qr.assetId,
      token: qr.token,
      humanCode: qr.humanCode,
      status: qr.status,
      labelVersion: qr.labelVersion,
      generatedAt: qr.generatedAt.toISOString(),
      printedAt: qr.printedAt?.toISOString() ?? null,
      replacedAt: qr.replacedAt?.toISOString() ?? null,
      qrImageDataUrl,
    };
  }
}

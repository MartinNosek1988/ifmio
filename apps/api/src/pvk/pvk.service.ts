import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import type { AuthUser } from '@ifmio/shared-types';
import * as api from './pvk-api.client';
import { PvkAuthError } from './pvk-api.client';

const PVK_SUPPLIER = 'Pražské vodovody a kanalizace, a.s.';
const PVK_ICO = '25656635';

@Injectable()
export class PvkService {
  private readonly logger = new Logger(PvkService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  // ─── Credentials ────────────────────────────────────────────

  async saveCredentials(user: AuthUser, email: string, password: string) {
    const passwordEncrypted = this.crypto.encrypt(password);

    try {
      await api.getToken(email, password);
    } catch {
      throw new BadRequestException('Přihlášení k PVK portálu se nezdařilo. Zkontrolujte email a heslo.');
    }

    return this.prisma.pvkCredential.upsert({
      where: { tenantId_email: { tenantId: user.tenantId, email } },
      create: { tenantId: user.tenantId, email, passwordEncrypted },
      update: { passwordEncrypted, lastSyncAt: null, lastSyncStatus: null },
      select: { id: true, email: true, lastSyncAt: true, lastSyncStatus: true, createdAt: true },
    });
  }

  async getCredentials(user: AuthUser) {
    return this.prisma.pvkCredential.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, email: true, lastSyncAt: true, lastSyncStatus: true, createdAt: true },
    });
  }

  async deleteCredentials(user: AuthUser, id: string) {
    const cred = await this.prisma.pvkCredential.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!cred) throw new NotFoundException('PVK credentials nenalezeny');
    await this.prisma.pvkCredential.delete({ where: { id } });
  }

  // ─── Sync ───────────────────────────────────────────────────

  async syncTenant(tenantId: string): Promise<{ invoices: number; payments: number; deductions: number; pdfs: number }> {
    const startMs = Date.now();
    const credentials = await this.prisma.pvkCredential.findMany({ where: { tenantId } });

    if (credentials.length === 0) {
      throw new NotFoundException('Žádné PVK credentials pro tohoto tenanta');
    }

    // Preload existing invoice VS to avoid N+1 queries (fix f)
    const existingVS = new Set(
      (await this.prisma.invoice.findMany({
        where: { tenantId, supplierName: PVK_SUPPLIER },
        select: { variableSymbol: true },
      })).map(i => i.variableSymbol),
    );

    let totalInvoices = 0;
    let totalPayments = 0;
    let totalDeductions = 0;
    let totalPdfs = 0;

    for (const cred of credentials) {
      try {
        const password = this.crypto.decrypt(cred.passwordEncrypted);
        const tokenRes = await api.getToken(cred.email, password);
        let token = tokenRes.access_token;
        const refresh = tokenRes.refresh_token;
        let tokenExpiry = Date.now() + (tokenRes.expires_in - 30) * 1000;

        const ensureToken = async () => {
          if (Date.now() > tokenExpiry) {
            const refreshed = await api.refreshAccessToken(refresh);
            token = refreshed.access_token;
            tokenExpiry = Date.now() + (refreshed.expires_in - 30) * 1000;
          }
          return token;
        };

        const accounts = await api.getCustomerAccounts(await ensureToken());
        const firstAccountId = accounts[0]?.id;
        const places = await api.getConsumptionPlaces(await ensureToken());

        for (const place of places) {
          const invoices = await api.getAllInvoices(await ensureToken(), place.id);
          for (const inv of invoices) {
            if (existingVS.has(inv.variableSymbol)) continue;

            await this.createInvoice(tenantId, inv, place);
            existingVS.add(inv.variableSymbol);
            totalInvoices++;

            if (inv.hasAttachment && firstAccountId) {
              try {
                const pdfBuf = await this.downloadInvoicePdf(
                  await ensureToken(), inv.id, firstAccountId, place.id,
                );
                if (pdfBuf) {
                  await this.attachPdfToInvoice(tenantId, inv.variableSymbol, pdfBuf);
                  totalPdfs++;
                }
              } catch (pdfErr) {
                this.logger.warn(`PDF download failed for invoice ${inv.id}: ${(pdfErr as Error).message}`);
              }
            }
          }

          const deductions = await api.getAllWaterDeductions(await ensureToken(), place.id);
          for (const ded of deductions) {
            await this.upsertWaterDeduction(tenantId, ded, place);
            totalDeductions++;
          }
        }

        for (const acc of accounts) {
          const payments = await api.getAllPayments(await ensureToken(), acc.id);
          totalPayments += payments.length;
        }

        await this.prisma.pvkCredential.update({
          where: { id: cred.id },
          data: { lastSyncAt: new Date(), lastSyncStatus: 'ok' },
        });
      } catch (err) {
        // Fix 2a: detect auth errors by type, not string matching
        const status = err instanceof PvkAuthError ? 'auth_error' : 'api_error';
        this.logger.error(`PVK sync failed for credential ${cred.id}: ${(err as Error).message}`);

        await this.prisma.pvkCredential.update({
          where: { id: cred.id },
          data: { lastSyncAt: new Date(), lastSyncStatus: status },
        });

        await this.prisma.pvkSyncLog.create({
          data: {
            tenantId,
            status,
            error: (err as Error).message.slice(0, 500),
            durationMs: Date.now() - startMs,
          },
        });

        // Fix 2d: continue to next credential instead of aborting entire sync
        continue;
      }
    }

    await this.prisma.pvkSyncLog.create({
      data: {
        tenantId,
        invoices: totalInvoices,
        payments: totalPayments,
        status: 'ok',
        durationMs: Date.now() - startMs,
      },
    });

    this.logger.log(`PVK sync OK for tenant ${tenantId}: ${totalInvoices} invoices, ${totalDeductions} deductions, ${totalPdfs} PDFs [${Date.now() - startMs}ms]`);

    return { invoices: totalInvoices, payments: totalPayments, deductions: totalDeductions, pdfs: totalPdfs };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private async createInvoice(
    tenantId: string,
    inv: api.PvkInvoice,
    place: api.PvkConsumptionPlace,
  ) {
    await this.prisma.invoice.create({
      data: {
        tenantId,
        number: inv.variableSymbol,
        type: 'received',
        supplierName: PVK_SUPPLIER,
        supplierIco: PVK_ICO,
        description: `Vodné/stočné — ${place.address} (${inv.periodFrom} – ${inv.periodTo})`,
        amountTotal: inv.total / 100,
        currency: 'CZK',
        issueDate: new Date(inv.created),
        dueDate: new Date(inv.due),
        isPaid: inv.state === 'paid',
        paymentDate: null, // Fix 2e: due date is not payment date
        variableSymbol: inv.variableSymbol,
        note: `PVK import (pvk:${inv.id}), odběrné místo: ${place.address}`,
        tags: ['pvk', 'vodné-stočné'],
        approvalStatus: 'draft',
      },
    });
  }

  private async downloadInvoicePdf(
    token: string,
    invoiceId: number,
    customerAccountId: number,
    consumptionPlaceId: number,
  ): Promise<Buffer | null> {
    const attachments = await api.getInvoiceAttachments(
      token, invoiceId, customerAccountId, consumptionPlaceId,
    );
    const pdfAtt = attachments.find(a => a.fileType === 'application/pdf' || a.fileName.endsWith('.pdf'));
    if (!pdfAtt) return null;
    return api.downloadDocument(token, pdfAtt.documentId);
  }

  private async attachPdfToInvoice(tenantId: string, variableSymbol: string, pdfBuffer: Buffer) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { tenantId, variableSymbol, supplierName: PVK_SUPPLIER },
    });
    if (!invoice || invoice.pdfBase64) return;

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfBase64: pdfBuffer.toString('base64') },
    });
  }

  private async upsertWaterDeduction(tenantId: string, ded: api.PvkWaterDeduction, place: api.PvkConsumptionPlace) {
    await this.prisma.pvkWaterDeduction.upsert({
      where: {
        tenantId_pvkPlaceId_dateFrom_meterNumber: {
          tenantId,
          pvkPlaceId: place.id,
          dateFrom: new Date(ded.measuredDateFrom),
          meterNumber: ded.waterMeterNumber,
        },
      },
      create: {
        tenantId, pvkPlaceId: place.id, placeAddress: place.address,
        dateFrom: new Date(ded.measuredDateFrom), dateTo: new Date(ded.measuredDateTo),
        meterNumber: ded.waterMeterNumber, valueFrom: ded.measuredValueFrom,
        valueTo: ded.measuredValueTo, amountM3: ded.amount,
        avgPerDay: ded.averagePerDay, measurementType: ded.measurementType,
        intervalDays: ded.intervalLengthDays,
      },
      update: {
        valueTo: ded.measuredValueTo, amountM3: ded.amount,
        avgPerDay: ded.averagePerDay, syncedAt: new Date(),
      },
    });
  }

  // ─── Sync logs ──────────────────────────────────────────────

  async getSyncLogs(user: AuthUser, limit = 20) {
    return this.prisma.pvkSyncLog.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { syncedAt: 'desc' },
      take: limit,
    });
  }
}

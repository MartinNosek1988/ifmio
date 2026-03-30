import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import type { AuthUser } from '@ifmio/shared-types';
import * as api from './pvk-api.client';

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

    // Verify credentials work before saving
    try {
      await api.getToken(email, password);
    } catch {
      throw new BadRequestException('Přihlášení k PVK portálu se nezdařilo. Zkontrolujte email a heslo.');
    }

    return this.prisma.pvkCredential.upsert({
      where: { tenantId_email: { tenantId: user.tenantId, email } },
      create: {
        tenantId: user.tenantId,
        email,
        passwordEncrypted,
      },
      update: {
        passwordEncrypted,
        lastSyncStatus: null,
      },
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

  async syncTenant(tenantId: string): Promise<{ invoices: number; payments: number }> {
    const startMs = Date.now();
    const credentials = await this.prisma.pvkCredential.findMany({
      where: { tenantId },
    });

    if (credentials.length === 0) {
      throw new NotFoundException('Žádné PVK credentials pro tohoto tenanta');
    }

    let totalInvoices = 0;
    let totalPayments = 0;

    for (const cred of credentials) {
      try {
        const password = this.crypto.decrypt(cred.passwordEncrypted);
        const tokenRes = await api.getToken(cred.email, password);
        const token = tokenRes.access_token;

        // Get consumption places for invoices
        const places = await api.getConsumptionPlaces(token);
        for (const place of places) {
          const invoices = await api.getAllInvoices(token, place.id);
          for (const inv of invoices) {
            await this.upsertInvoice(tenantId, inv, place);
            totalInvoices++;
          }
        }

        // Get customer accounts for payments
        const accounts = await api.getCustomerAccounts(token);
        for (const acc of accounts) {
          const payments = await api.getAllPayments(token, acc.id);
          totalPayments += payments.length;
        }

        await this.prisma.pvkCredential.update({
          where: { id: cred.id },
          data: { lastSyncAt: new Date(), lastSyncStatus: 'ok' },
        });
      } catch (err) {
        const status = (err as Error).message.includes('auth') ? 'auth_error' : 'api_error';
        this.logger.error(`PVK sync failed for tenant ${tenantId}: ${(err as Error).message}`);

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

        throw err;
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

    this.logger.log(`PVK sync OK for tenant ${tenantId}: ${totalInvoices} invoices, ${totalPayments} payments [${Date.now() - startMs}ms]`);

    return { invoices: totalInvoices, payments: totalPayments };
  }

  private async upsertInvoice(
    tenantId: string,
    inv: api.PvkInvoice,
    place: api.PvkConsumptionPlace,
  ) {
    const externalRef = `pvk:${inv.id}`;

    // Check if already imported (by variableSymbol + supplier)
    const existing = await this.prisma.invoice.findFirst({
      where: {
        tenantId,
        variableSymbol: inv.variableSymbol,
        supplierName: 'Pražské vodovody a kanalizace, a.s.',
      },
    });

    if (existing) return; // already imported

    await this.prisma.invoice.create({
      data: {
        tenantId,
        number: inv.variableSymbol,
        type: 'received',
        supplierName: 'Pražské vodovody a kanalizace, a.s.',
        supplierIco: '25656635',
        description: `Vodné/stočné — ${place.address} (${inv.periodFrom} – ${inv.periodTo})`,
        amountTotal: inv.total / 100, // haléře → CZK
        currency: 'CZK',
        issueDate: new Date(inv.created),
        dueDate: new Date(inv.due),
        isPaid: inv.state === 'paid',
        paymentDate: inv.state === 'paid' ? new Date(inv.due) : null,
        variableSymbol: inv.variableSymbol,
        note: `PVK import (${externalRef}), odběrné místo: ${place.address}`,
        tags: ['pvk', 'vodné-stočné'],
        approvalStatus: 'draft',
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

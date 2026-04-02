import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../finance/invoices.service';
import * as crypto from 'crypto';
import type { AuthUser } from '@ifmio/shared-types';

interface EmailMeta {
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  messageId: string | null;
}

@Injectable()
export class EmailInboundService {
  private readonly logger = new Logger(EmailInboundService.name);
  private readonly signingKey: string;
  private readonly domain: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private invoices: InvoicesService,
  ) {
    this.signingKey = this.config.get('MAILGUN_WEBHOOK_SIGNING_KEY') ?? '';
    this.domain = this.config.get('EMAIL_INBOUND_DOMAIN') ?? 'ifmio.com';
  }

  // ─── Signature verification ───────────────────────────────

  verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
    if (!this.signingKey) {
      this.logger.warn('MAILGUN_WEBHOOK_SIGNING_KEY not configured');
      return false;
    }

    // Reject if older than 5 minutes (replay protection)
    const ts = parseInt(timestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const hmac = crypto.createHmac('sha256', this.signingKey);
    hmac.update(timestamp + token);
    const expected = hmac.digest('hex');
    try {
      const signatureBuf = Buffer.from(signature, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      if (signatureBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(signatureBuf, expectedBuf);
    } catch {
      this.logger.warn('Invalid Mailgun signature format');
      return false;
    }
  }

  // ─── Main handler ─────────────────────────────────────────

  async handleInbound(
    body: Record<string, string>,
    files: Array<{ originalname: string; mimetype: string; buffer: Buffer }>,
  ): Promise<void> {
    const recipient = body['recipient'] ?? '';
    const sender = body['sender'] ?? '';
    const from = body['from'] ?? sender;
    const subject = body['subject'] ?? null;
    const messageId = body['Message-Id'] ?? null;

    // Extract slug from recipient: "invoice@svj789.ifmio.com" → "svj789"
    const slugMatch = recipient.match(/^invoice@([^.]+)\./);
    if (!slugMatch) {
      this.logger.warn(`Invalid recipient format: ${recipient}`);
      return;
    }
    const slug = slugMatch[1];

    // Find config
    const config = await this.prisma.emailInboundConfig.findUnique({
      where: { slug },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!config || !config.isActive) {
      this.logger.log(`Rejected: slug "${slug}" not found or inactive`);
      return;
    }

    const tenantId = config.tenantId;
    const fromEmail = this.extractEmail(from);
    const fromName = this.extractName(from);
    const emailMeta: EmailMeta = { fromEmail, fromName, subject, messageId };

    // Check allowed senders
    if (config.allowedFrom.length > 0 && !config.allowedFrom.includes(fromEmail)) {
      await this.log(tenantId, emailMeta, files.length, 'rejected', 'Sender not in allowedFrom');
      return;
    }

    // Filter to processable attachments
    const processable = files.filter(f =>
      f.mimetype === 'application/pdf' ||
      f.mimetype === 'application/xml' ||
      f.mimetype === 'text/xml' ||
      f.originalname.endsWith('.pdf') ||
      f.originalname.endsWith('.isdoc') ||
      f.originalname.endsWith('.xml'),
    );

    if (processable.length === 0) {
      await this.log(tenantId, emailMeta, files.length, 'no_attachments');
      return;
    }

    // Process each attachment
    let invoicesCreated = 0;
    const botUser: AuthUser = {
      id: 'email-inbound',
      tenantId,
      role: 'tenant_admin',
      email: 'email-inbound@ifmio.com',
      name: 'Email Inbound',
    };

    for (const file of processable) {
      try {
        const isPdf = file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf');

        if (isPdf) {
          const pdfBase64 = file.buffer.toString('base64');
          const result = await this.invoices.extractFromPdf(botUser, pdfBase64, file.originalname);
          if (result) invoicesCreated++;
        } else {
          // ISDOC XML — create invoice from XML content
          // TODO: implement ISDOC parser when available
          this.logger.log(`ISDOC file ${file.originalname} received — parser not yet implemented`);
        }
      } catch (err) {
        this.logger.error(`Failed to process attachment ${file.originalname}: ${(err as Error).message}`);
      }
    }

    await this.log(tenantId, emailMeta, files.length, 'processed', null, invoicesCreated);
    this.logger.log(`Email inbound: tenant ${tenantId}, ${invoicesCreated} invoices from ${processable.length} attachments`);
  }

  // ─── Config management ────────────────────────────────────

  async getConfig(tenantId: string) {
    const config = await this.prisma.emailInboundConfig.findUnique({
      where: { tenantId },
    });
    if (!config) return null;
    return { ...config, address: `invoice@${config.slug}.${this.domain}` };
  }

  async upsertConfig(tenantId: string, dto: { isActive?: boolean; autoApprove?: boolean; allowedFrom?: string[] }) {
    const existing = await this.prisma.emailInboundConfig.findUnique({ where: { tenantId } });

    if (existing) {
      const updated = await this.prisma.emailInboundConfig.update({
        where: { tenantId },
        data: {
          isActive: dto.isActive ?? existing.isActive,
          autoApprove: dto.autoApprove ?? existing.autoApprove,
          allowedFrom: dto.allowedFrom ?? existing.allowedFrom,
        },
      });
      return { ...updated, address: `invoice@${updated.slug}.${this.domain}` };
    }

    // Generate slug from tenant name
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } });
    let slug = (tenant?.slug ?? tenant?.name ?? tenantId)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);

    // Check for conflicts
    const conflict = await this.prisma.emailInboundConfig.findUnique({ where: { slug } });
    if (conflict) {
      slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const created = await this.prisma.emailInboundConfig.create({
      data: {
        tenantId,
        slug,
        isActive: dto.isActive ?? true,
        autoApprove: dto.autoApprove ?? false,
        allowedFrom: dto.allowedFrom ?? [],
      },
    });
    return { ...created, address: `invoice@${created.slug}.${this.domain}` };
  }

  async getLogs(tenantId: string, limit = 20) {
    return this.prisma.emailInboundLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  private extractEmail(from: string): string {
    const match = from.match(/<([^>]+)>/);
    return match ? match[1] : from.trim();
  }

  private extractName(from: string): string | null {
    const match = from.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : null;
  }

  private async log(
    tenantId: string,
    meta: EmailMeta,
    attachments: number,
    status: string,
    error?: string | null,
    invoicesCreated = 0,
  ) {
    await this.prisma.emailInboundLog.create({
      data: {
        tenantId,
        messageId: meta.messageId,
        fromEmail: meta.fromEmail,
        fromName: meta.fromName,
        subject: meta.subject,
        attachments,
        status,
        errorMessage: error ?? null,
        invoicesCreated,
      },
    });
  }
}

import {
  Controller, Post, Get, Body, Req, Logger, HttpCode,
} from '@nestjs/common';
import { EmailInboundService } from './email-inbound.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES_MANAGE } from '../common/constants/roles.constants';
import type { AuthUser } from '@ifmio/shared-types';
import type { FastifyRequest } from 'fastify';

@Controller('email')
export class EmailInboundController {
  private readonly logger = new Logger(EmailInboundController.name);

  constructor(private service: EmailInboundService) {}

  /**
   * POST /api/v1/email/inbound — Mailgun webhook (public, signature-verified)
   * Mailgun sends multipart/form-data with text fields + file attachments.
   * Always returns 200 to prevent Mailgun retries on business errors.
   */
  @Post('inbound')
  @Public()
  @HttpCode(200)
  async handleInbound(@Req() req: FastifyRequest) {
    // Parse multipart form data (Fastify @fastify/multipart)
    const parts = req.parts();
    const fields: Record<string, string> = {};
    const files: Array<{ originalname: string; mimetype: string; buffer: Buffer }> = [];

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        files.push({
          originalname: part.filename ?? 'attachment',
          mimetype: part.mimetype,
          buffer: Buffer.concat(chunks),
        });
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }

    // Verify Mailgun signature from fields (Mailgun sends them in body, not headers)
    const timestamp = fields['timestamp'] ?? '';
    const token = fields['token'] ?? '';
    const signature = fields['signature'] ?? '';

    if (!this.service.verifyMailgunSignature(timestamp, token, signature)) {
      this.logger.warn('Invalid Mailgun signature — rejected');
      return { status: 'rejected', reason: 'invalid_signature' };
    }

    try {
      await this.service.handleInbound(fields, files);
      return { status: 'ok' };
    } catch (err) {
      this.logger.error(`Inbound processing error: ${(err as Error).message}`);
      return { status: 'error' };
    }
  }

  /** GET /api/v1/email/inbound/config */
  @Get('inbound/config')
  @Roles(...ROLES_MANAGE)
  async getConfig(@Req() req: { user: AuthUser }) {
    return this.service.getConfig(req.user.tenantId);
  }

  /** POST /api/v1/email/inbound/config */
  @Post('inbound/config')
  @Roles(...ROLES_MANAGE)
  async upsertConfig(
    @Req() req: { user: AuthUser },
    @Body() dto: { isActive?: boolean; autoApprove?: boolean; allowedFrom?: string[] },
  ) {
    return this.service.upsertConfig(req.user.tenantId, dto);
  }

  /** GET /api/v1/email/inbound/log */
  @Get('inbound/log')
  @Roles(...ROLES_MANAGE)
  async getLogs(@Req() req: { user: AuthUser }) {
    return this.service.getLogs(req.user.tenantId);
  }
}

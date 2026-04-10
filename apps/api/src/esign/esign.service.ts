import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import type { AuthUser } from '@ifmio/shared-types'
import { EmailTemplateService } from '../email/email-template.service'
import type { CreateESignRequestDto, SignDocumentDto } from './dto/esign.dto'

@Injectable()
export class ESignService {
  private readonly logger = new Logger(ESignService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private templates: EmailTemplateService,
  ) {}

  async create(user: AuthUser, dto: CreateESignRequestDto) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 30 * 86_400_000)

    return this.prisma.eSignRequest.create({
      data: {
        tenantId: user.tenantId,
        documentType: dto.documentType as any,
        documentId: dto.documentId,
        documentTitle: dto.documentTitle,
        documentUrl: dto.documentUrl,
        message: dto.message,
        expiresAt,
        createdBy: user.id,
        signatories: {
          create: dto.signatories.map(s => ({
            email: s.email,
            name: s.name,
            role: s.role,
            order: s.order,
            tokenExpiresAt: expiresAt,
          })),
        },
      },
      include: { signatories: true },
    })
  }

  async list(user: AuthUser, status?: string, documentType?: string) {
    return this.prisma.eSignRequest.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status && { status: status as any }),
        ...(documentType && { documentType: documentType as any }),
      },
      include: { signatories: { select: { id: true, name: true, status: true, order: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getById(user: AuthUser, id: string) {
    const req = await this.prisma.eSignRequest.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { signatories: { orderBy: { order: 'asc' } } },
    })
    if (!req) throw new NotFoundException('Žádost o podpis nenalezena')
    return req
  }

  async sendRequest(user: AuthUser, id: string) {
    const req = await this.getById(user, id)
    if (req.status !== 'draft') throw new BadRequestException('Žádost již byla odeslána')

    const baseUrl = process.env.PUBLIC_WEB_URL || 'https://app.ifmio.com'
    for (const sig of req.signatories) {
      const signUrl = `${baseUrl}/sign/${sig.token}`
      const rendered = await this.templates.renderTemplate(req.tenantId ?? null, 'esign_request', {
        name: sig.name,
        documentTitle: req.documentTitle,
        message: req.message || 'Prosíme o elektronický podpis níže uvedeného dokumentu.',
        signUrl,
        expiresAt: req.expiresAt.toLocaleDateString('cs-CZ'),
      })
      await this.email.send({ to: sig.email, subject: rendered.subject, html: rendered.body })
        .catch(err => this.logger.warn(`Failed to send eSign email to ${sig.email}: ${err}`))
    }

    await this.prisma.eSignRequest.update({
      where: { id },
      data: { status: 'sent' },
    })

    return { sent: req.signatories.length }
  }

  async cancelRequest(user: AuthUser, id: string, reason?: string) {
    await this.getById(user, id)
    return this.prisma.eSignRequest.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
    })
  }

  // ─── Public token-based endpoints ─────────────────────

  async getByToken(token: string) {
    const sig = await this.prisma.eSignSignatory.findUnique({
      where: { token },
      include: { request: true },
    })
    if (!sig) throw new NotFoundException('Neplatný odkaz')
    if (sig.tokenExpiresAt < new Date()) throw new BadRequestException('Odkaz vypršel')
    if (sig.gdprErasedAt) throw new BadRequestException('Data byla smazána')

    return {
      signatory: { id: sig.id, name: sig.name, role: sig.role, status: sig.status },
      document: {
        title: sig.request.documentTitle,
        url: sig.request.documentUrl,
        message: sig.request.message,
        expiresAt: sig.request.expiresAt,
      },
    }
  }

  async markViewed(token: string, ip: string) {
    const sig = await this.findSignatory(token)
    if (sig.viewedAt) return sig // already viewed
    return this.prisma.eSignSignatory.update({
      where: { id: sig.id },
      data: { viewedAt: new Date(), status: 'viewed' },
    })
  }

  async signDocument(token: string, dto: SignDocumentDto, ip: string, userAgent: string) {
    const sig = await this.findSignatory(token)
    if (sig.status === 'signed') throw new BadRequestException('Již podepsáno')
    if (sig.status === 'declined') throw new BadRequestException('Podpis byl odmítnut')

    // Enforce order — previous signatories must have signed
    const request = await this.prisma.eSignRequest.findUnique({
      where: { id: sig.requestId },
      include: { signatories: { orderBy: { order: 'asc' } } },
    })
    if (!request) throw new NotFoundException()

    const previousUnsigned = request.signatories.find(
      s => s.order < sig.order && s.status !== 'signed',
    )
    if (previousUnsigned) {
      throw new BadRequestException(`Čeká se na podpis: ${previousUnsigned.name}`)
    }

    // Validate signature size
    if (dto.signatureBase64) {
      const base64Data = dto.signatureBase64.replace(/^data:image\/\w+;base64,/, '')
      if (Buffer.from(base64Data, 'base64').length > 51200) {
        throw new BadRequestException('Podpis je příliš velký (max 50KB)')
      }
    }

    await this.prisma.eSignSignatory.update({
      where: { id: sig.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signatureBase64: dto.signatureBase64,
        signedIp: ip,
        signedUserAgent: userAgent,
      },
    })

    // Check if all signed → complete request
    const allSigned = request.signatories.every(
      s => s.id === sig.id || s.status === 'signed',
    )
    if (allSigned) {
      await this.prisma.eSignRequest.update({
        where: { id: request.id },
        data: { status: 'completed', completedAt: new Date() },
      })
    } else {
      await this.prisma.eSignRequest.update({
        where: { id: request.id },
        data: { status: 'in_progress' },
      })
    }

    return { signed: true, allCompleted: allSigned }
  }

  async declineSignature(token: string, reason: string) {
    const sig = await this.findSignatory(token)
    return this.prisma.eSignSignatory.update({
      where: { id: sig.id },
      data: { status: 'declined', declinedAt: new Date(), declineReason: reason },
    })
  }

  async getAuditTrail(user: AuthUser, id: string) {
    const req = await this.getById(user, id)
    const events: Array<{ timestamp: Date; action: string; actor: string; detail?: string }> = []

    events.push({ timestamp: req.createdAt, action: 'created', actor: req.createdBy })
    if (req.status !== 'draft') {
      events.push({ timestamp: req.createdAt, action: 'sent', actor: req.createdBy })
    }
    for (const sig of req.signatories) {
      if (sig.viewedAt) events.push({ timestamp: sig.viewedAt, action: 'viewed', actor: sig.name })
      if (sig.signedAt) events.push({ timestamp: sig.signedAt, action: 'signed', actor: sig.name, detail: sig.signedIp ?? undefined })
      if (sig.declinedAt) events.push({ timestamp: sig.declinedAt, action: 'declined', actor: sig.name, detail: sig.declineReason ?? undefined })
    }
    if (req.completedAt) events.push({ timestamp: req.completedAt, action: 'completed', actor: 'system' })
    if (req.cancelledAt) events.push({ timestamp: req.cancelledAt, action: 'cancelled', actor: req.createdBy, detail: req.cancelReason ?? undefined })

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  async eraseSignatoryPii(id: string) {
    return this.prisma.eSignSignatory.update({
      where: { id },
      data: { email: '[erased]', name: '[erased]', signedIp: null, signatureBase64: null, gdprErasedAt: new Date() },
    })
  }

  private async findSignatory(token: string) {
    const sig = await this.prisma.eSignSignatory.findUnique({ where: { token } })
    if (!sig) throw new NotFoundException('Neplatný odkaz')
    if (sig.tokenExpiresAt < new Date()) throw new BadRequestException('Odkaz vypršel')
    return sig
  }
}

import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { randomBytes } from 'crypto'

const PORTAL_TOKEN_EXPIRY_DAYS = 90

@Injectable()
export class PortalAccessService {
  private readonly logger = new Logger(PortalAccessService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ─── TOKEN VALIDATION ──────────────────────────────────────────

  async validateToken(accessToken: string) {
    const access = await this.prisma.portalAccess.findUnique({
      where: { accessToken },
      include: {
        resident: {
          select: { id: true, firstName: true, lastName: true, companyName: true, isLegalEntity: true, email: true, propertyId: true },
        },
      },
    })

    if (!access) throw new UnauthorizedException('Neplatný přístupový odkaz')
    if (!access.isActive) throw new UnauthorizedException('Přístup byl deaktivován')
    if (access.expiresAt && access.expiresAt < new Date()) throw new UnauthorizedException('Přístupový odkaz vypršel')

    // Update last access
    await this.prisma.portalAccess.update({
      where: { id: access.id },
      data: { lastAccessAt: new Date() },
    }).catch(() => {})

    const residentName = access.resident.isLegalEntity && access.resident.companyName
      ? access.resident.companyName
      : `${access.resident.firstName} ${access.resident.lastName}`

    return {
      tenantId: access.tenantId,
      residentId: access.residentId,
      email: access.email,
      residentName,
      propertyId: access.resident.propertyId,
    }
  }

  // ─── ACCESS MANAGEMENT ─────────────────────────────────────────

  async generateAccess(tenantId: string, residentId: string, email: string) {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + PORTAL_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    const access = await this.prisma.portalAccess.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: {
        tenantId,
        residentId,
        email,
        accessToken: token,
        expiresAt,
      },
      update: {
        residentId,
        accessToken: token,
        isActive: true,
        expiresAt,
      },
    })

    return { id: access.id, accessToken: access.accessToken }
  }

  async refreshAccess(tenantId: string, accessId: string) {
    const access = await this.prisma.portalAccess.findFirst({
      where: { id: accessId, tenantId },
    })
    if (!access) throw new NotFoundException('Přístup nenalezen')

    return this.prisma.portalAccess.update({
      where: { id: accessId },
      data: {
        expiresAt: new Date(Date.now() + PORTAL_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    })
  }

  async bulkGenerateAccess(tenantId: string, propertyId: string) {
    // Find all active occupancies with residents that have emails
    const occupancies = await this.prisma.occupancy.findMany({
      where: {
        tenantId,
        unit: { propertyId },
        isActive: true,
        isPrimaryPayer: true,
      },
      include: {
        resident: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    let generated = 0, skipped = 0
    const errors: string[] = []

    for (const occ of occupancies) {
      if (!occ.resident?.email) { skipped++; continue }

      try {
        await this.generateAccess(tenantId, occ.residentId, occ.resident.email)
        generated++
      } catch (err: any) {
        errors.push(`${occ.resident.firstName} ${occ.resident.lastName}: ${err.message}`)
      }
    }

    return { generated, skipped, errors, total: occupancies.length }
  }

  async revokeAccess(tenantId: string, id: string) {
    const access = await this.prisma.portalAccess.findFirst({ where: { id, tenantId } })
    if (!access) throw new NotFoundException('Přístup nenalezen')

    await this.prisma.portalAccess.update({
      where: { id },
      data: { isActive: false },
    })
    return { revoked: true }
  }

  async getPropertyPortalStatus(tenantId: string, propertyId: string) {
    const occupancies = await this.prisma.occupancy.findMany({
      where: { tenantId, unit: { propertyId }, isActive: true, isPrimaryPayer: true },
      include: { resident: { select: { id: true, email: true } } },
    })

    const accesses = await this.prisma.portalAccess.findMany({
      where: {
        tenantId,
        residentId: { in: occupancies.map(o => o.residentId) },
        isActive: true,
      },
    })

    const activeAccessIds = new Set(accesses.map(a => a.residentId))

    return {
      totalResidents: occupancies.length,
      withAccess: activeAccessIds.size,
      withoutAccess: occupancies.length - activeAccessIds.size,
    }
  }

  async sendInvitation(tenantId: string, accessId: string) {
    const access = await this.prisma.portalAccess.findFirst({
      where: { id: accessId, tenantId },
      include: {
        resident: { select: { firstName: true, lastName: true, property: { select: { name: true } } } },
      },
    })
    if (!access) throw new NotFoundException('Přístup nenalezen')

    const propertyName = (access.resident as any).property?.name ?? 'nemovitosti'
    const name = `${access.resident.firstName} ${access.resident.lastName}`
    const portalUrl = `${process.env.WEB_URL ?? 'https://app.ifmio.com'}/portal-public/${access.accessToken}`

    const html = `
      <p>Dobrý den, ${name},</p>
      <p>byl Vám zřízen přístup do portálu vlastníka pro ${propertyName}.</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Otevřít portál vlastníka</a></p>
      ${access.pin ? `<p>Váš PIN: <strong>${access.pin}</strong></p>` : ''}
      <p style="color:#888;font-size:13px;">Tento odkaz je určen výhradně pro Vás. Nesdílejte jej s nikým.</p>
      <p>S pozdravem,<br>správa nemovitosti</p>
    `

    try {
      await this.email.send({
        to: access.email,
        subject: `Přístup do portálu vlastníka — ${propertyName}`,
        html,
      })
      return { sent: true }
    } catch (err) {
      this.logger.error(`Portal invitation email failed: ${err}`)
      return { sent: false, error: 'Odeslání emailu selhalo' }
    }
  }

  // ─── MESSAGING ─────────────────────────────────────────────────

  async getMessages(tenantId: string, residentId: string) {
    return this.prisma.portalMessage.findMany({
      where: { tenantId, residentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async sendMessage(tenantId: string, residentId: string, subject: string, body: string, direction: 'inbound' | 'outbound', propertyId?: string) {
    return this.prisma.portalMessage.create({
      data: {
        tenantId,
        residentId,
        propertyId,
        subject,
        body,
        direction,
      },
    })
  }

  async getUnreadCount(tenantId: string, direction: 'inbound' | 'outbound') {
    return this.prisma.portalMessage.count({
      where: { tenantId, direction, isRead: false },
    })
  }

  async markAsRead(tenantId: string, messageId: string) {
    return this.prisma.portalMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    })
  }
}

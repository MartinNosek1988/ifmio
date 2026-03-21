import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { PdfService } from './pdf.service';
import type { EvidencniListData, PrescriptionPdfData } from './pdf.service';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('PDF')
@ApiBearerAuth()
@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
    private readonly scope: PropertyScopeService,
  ) {}

  @Get('helpdesk/:id/protocol')
  @ApiOperation({ summary: 'Download helpdesk ticket protocol as PDF' })
  async helpdeskProtocol(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() reply: FastifyReply,
  ) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
        resident: { select: { firstName: true, lastName: true } },
        assignee: { select: { name: true } },
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Tiket nenalezen');

    await this.scope.verifyEntityAccess(user, ticket.propertyId);

    const doc = this.pdf.generateProtocol({
      ticketNumber: ticket.number,
      title: ticket.title,
      description: ticket.description ?? '',
      status: ticket.status,
      priority: ticket.priority,
      propertyName: ticket.property?.name,
      unitName: ticket.unit?.name,
      residentName: ticket.resident
        ? `${ticket.resident.firstName} ${ticket.resident.lastName}`
        : undefined,
      assigneeName: ticket.assignee?.name,
      createdAt: ticket.createdAt.toLocaleDateString('cs-CZ'),
      resolvedAt: ticket.resolvedAt?.toLocaleDateString('cs-CZ'),
      items: ticket.items.map((i) => ({
        text: i.description,
        createdAt: i.createdAt.toLocaleDateString('cs-CZ'),
      })),
    });

    const filename = `tiket-${ticket.number}-protokol.pdf`;
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(doc);
  }

  @Get('reminder/:id')
  @ApiOperation({ summary: 'Download reminder as PDF' })
  async reminderPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() reply: FastifyReply,
  ) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        resident: { select: { firstName: true, lastName: true, propertyId: true } },
        template: true,
      },
    });

    if (!reminder) throw new NotFoundException('Upominka nenalezena');

    await this.scope.verifyEntityAccess(user, reminder.resident.propertyId);

    const doc = this.pdf.generateReminder({
      residentName: `${reminder.resident.firstName} ${reminder.resident.lastName}`,
      propertyName: '',
      amount: Number(reminder.amount),
      dueDate: reminder.dueDate.toLocaleDateString('cs-CZ'),
      level: reminder.template?.level === 'first' ? 1 : reminder.template?.level === 'second' ? 2 : 3,
      templateSubject: reminder.template?.subject ?? 'Upominka',
      templateBody:
        reminder.template?.body ??
        'Vážený/á {{jmeno}}, evidujeme dlužnou částku {{castka}} se splatností {{splatnost}}.',
    });

    const filename = `upominka-${reminder.id.slice(0, 8)}.pdf`;
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(doc);
  }

  @Get('evidencni-list/resident/:residentId')
  @ApiOperation({ summary: 'Evidenční list pro bydlícího (PDF)' })
  async evidencniList(
    @Param('residentId') residentId: string,
    @Query('year') yearStr: string | undefined,
    @CurrentUser() user: AuthUser,
    @Res() reply: FastifyReply,
  ) {
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, tenantId: user.tenantId },
      include: {
        property: true,
        unit: true,
        occupancies: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });
    if (!resident) throw new NotFoundException('Bydlící nenalezen');
    if (resident.propertyId) await this.scope.verifyEntityAccess(user, resident.propertyId);

    const SPACE_LABELS: Record<string, string> = {
      RESIDENTIAL: 'Bytový prostor', NON_RESIDENTIAL: 'Nebytový prostor',
      GARAGE: 'Garáž', PARKING: 'Parkovací stání', CELLAR: 'Sklep', LAND: 'Pozemek',
    };
    const LEGAL_LABELS: Record<string, string> = {
      SVJ: 'SVJ', BD: 'Bytové družstvo', RENTAL: 'Pronájem', OWNERSHIP: 'Osobní vlastnictví', OTHER: 'Jiné',
    };

    const unit = resident.unit;
    const property = resident.property;
    const occ = resident.occupancies[0];

    const data: EvidencniListData = {
      year,
      propertyName: property?.name ?? '—',
      propertyIco: property?.ico,
      propertyAddress: property ? `${property.address}, ${property.postalCode} ${property.city}` : '—',
      propertyLegalMode: property?.legalMode ? LEGAL_LABELS[property.legalMode] ?? property.legalMode : undefined,
      city: property?.city,
      unitName: unit?.name ?? '—',
      unitKnDesignation: unit?.knDesignation,
      unitSpaceType: unit?.spaceType ? SPACE_LABELS[unit.spaceType] ?? unit.spaceType : undefined,
      unitDisposition: unit?.disposition,
      unitArea: unit?.area ? String(unit.area) : undefined,
      unitCommonShare: unit?.commonAreaShare ? `${(Number(unit.commonAreaShare) * 10000).toFixed(0)}/10000` : undefined,
      ownerName: resident.isLegalEntity && resident.companyName
        ? resident.companyName
        : `${resident.firstName} ${resident.lastName}`,
      ownerAddress: resident.correspondenceAddress
        ? `${resident.correspondenceAddress}, ${resident.correspondenceCity ?? ''}`
        : undefined,
      variableSymbol: occ?.variableSymbol,
      // TODO: Add prescription items when prescription component module is integrated
      prescriptionItems: undefined,
    };

    const doc = this.pdf.generateEvidencniList(data);
    const filename = `evidencni-list-${year}-${resident.lastName}.pdf`;
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(doc);
  }

  @Get('evidencni-listy/property/:propertyId')
  @ApiOperation({ summary: 'Hromadné evidenční listy pro celou nemovitost (PDF)' })
  async evidencniListyBulk(
    @Param('propertyId') propertyId: string,
    @Query('year') yearStr: string | undefined,
    @CurrentUser() user: AuthUser,
    @Res() reply: FastifyReply,
  ) {
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    await this.scope.verifyEntityAccess(user, propertyId);

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: user.tenantId },
    });
    if (!property) throw new NotFoundException('Nemovitost nenalezena');

    const occupancies = await this.prisma.occupancy.findMany({
      where: { tenantId: user.tenantId, unit: { propertyId }, isActive: true },
      include: {
        resident: true,
        unit: true,
      },
      orderBy: { unit: { name: 'asc' } },
    });

    if (occupancies.length === 0) throw new NotFoundException('Žádní aktivní bydlící');

    // Generate one combined document with page breaks
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const SPACE_LABELS: Record<string, string> = {
      RESIDENTIAL: 'Bytový prostor', NON_RESIDENTIAL: 'Nebytový prostor',
      GARAGE: 'Garáž', PARKING: 'Parkovací stání', CELLAR: 'Sklep', LAND: 'Pozemek',
    };
    const LEGAL_LABELS: Record<string, string> = {
      SVJ: 'SVJ', BD: 'Bytové družstvo', RENTAL: 'Pronájem', OWNERSHIP: 'Osobní vlastnictví', OTHER: 'Jiné',
    };

    for (let i = 0; i < occupancies.length; i++) {
      if (i > 0) doc.addPage();
      const occ = occupancies[i];
      const unit = occ.unit;
      const res = occ.resident;

      // Mini evidenční list per page (simplified for bulk)
      doc.fontSize(16).font('Helvetica-Bold').text('EVIDENČNÍ LIST', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`pro rok ${year}`, { align: 'center' }).moveDown(1);

      doc.font('Helvetica-Bold').text('Nemovitost: ', { continued: true }).font('Helvetica').text(property.name);
      if (property.ico) doc.text(`IČ: ${property.ico}`);
      doc.text(`Adresa: ${property.address}, ${property.postalCode} ${property.city}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Jednotka: ', { continued: true }).font('Helvetica').text(unit.name);
      if (unit.knDesignation) doc.text(`KN: ${unit.knDesignation}`);
      if (unit.spaceType) doc.text(`Typ: ${SPACE_LABELS[unit.spaceType] ?? unit.spaceType}`);
      if (unit.area) doc.text(`Plocha: ${unit.area} m²`);
      if (unit.commonAreaShare) doc.text(`Podíl: ${(Number(unit.commonAreaShare) * 10000).toFixed(0)}/10000`);
      doc.moveDown(0.5);

      const name = res.isLegalEntity && res.companyName ? res.companyName : `${res.firstName} ${res.lastName}`;
      doc.font('Helvetica-Bold').text('Vlastník: ', { continued: true }).font('Helvetica').text(name);
      if (occ.variableSymbol) doc.text(`VS: ${occ.variableSymbol}`);
      doc.moveDown(1);

      doc.fontSize(8).fillColor('#aaaaaa').text(`ifmio | ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' });
      doc.fillColor('#000000');
    }

    doc.end();

    const filename = `evidencni-listy-${year}-${property.name.replace(/\s+/g, '-')}.pdf`;
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(doc);
  }

  @Get('prescriptions/:id/pdf')
  @ApiOperation({ summary: 'Předpis/faktura PDF' })
  async prescriptionPdf(
    @Param('id') id: string,
    @Query('type') type: string | undefined,
    @CurrentUser() user: AuthUser,
    @Res() reply: FastifyReply,
  ) {
    const pdfType = type === 'faktura' ? 'faktura' : 'predpis';

    const p = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        items: true,
        property: true,
        unit: true,
        resident: true,
      },
    });
    if (!p) throw new NotFoundException('Předpis nenalezen');
    if (p.propertyId) await this.scope.verifyEntityAccess(user, p.propertyId);

    // Build QR payment code (SPD format)
    let qrBuffer: Buffer | null = null;
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { tenantId: user.tenantId, propertyId: p.propertyId },
      select: { accountNumber: true, bankCode: true, iban: true },
    });
    if (bankAccount) {
      const total = p.items.length > 0
        ? p.items.reduce((s, i) => s + Number(i.amount), 0)
        : Number(p.amount);
      const dueDate = new Date(p.validFrom);
      dueDate.setDate(p.dueDay);
      const dtStr = dueDate.toISOString().slice(0, 10).replace(/-/g, '');
      const acc = bankAccount.iban
        ? bankAccount.iban
        : `${bankAccount.accountNumber}/${bankAccount.bankCode}`;
      const spd = `SPD*1.0*ACC:${acc}*AM:${total.toFixed(2)}*CC:CZK*X-VS:${p.variableSymbol ?? ''}*MSG:Predpis ${p.description}*DT:${dtStr}*`;
      try {
        qrBuffer = await QRCode.toBuffer(spd, { width: 200, margin: 1 });
      } catch { /* QR generation failed — proceed without */ }
    }

    const data: PrescriptionPdfData = {
      type: pdfType as 'predpis' | 'faktura',
      number: p.variableSymbol ?? p.id.slice(0, 8),
      supplierName: p.property?.name ?? '—',
      supplierIco: p.property?.ico,
      supplierAddress: p.property ? `${p.property.address}, ${p.property.postalCode} ${p.property.city}` : '',
      customerName: p.resident
        ? (p.resident.isLegalEntity && p.resident.companyName ? p.resident.companyName : `${p.resident.firstName} ${p.resident.lastName}`)
        : '—',
      customerAddress: p.resident?.correspondenceAddress ?? undefined,
      issuedDate: p.validFrom.toLocaleDateString('cs-CZ'),
      dueDate: (() => { const d = new Date(p.validFrom); d.setDate(p.dueDay); return d.toLocaleDateString('cs-CZ'); })(),
      variableSymbol: p.variableSymbol,
      bankAccount: bankAccount
        ? (bankAccount.iban ?? `${bankAccount.accountNumber}/${bankAccount.bankCode}`)
        : undefined,
      isVatPayer: p.property?.isVatPayer ?? false,
      items: p.items.map(i => ({ name: i.name, amount: Number(i.amount), vatRate: i.vatRate })),
      qrCodeBuffer: qrBuffer,
    };

    const doc = await this.pdf.generatePrescriptionPdf(data);
    const filename = `${pdfType}-${p.variableSymbol ?? p.id.slice(0, 8)}.pdf`;
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(doc);
  }

  @Get('prescriptions/:id/qr-code')
  @ApiOperation({ summary: 'QR platební kód (PNG)' })
  async prescriptionQrCode(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() reply: FastifyReply,
  ) {
    const p = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!p) throw new NotFoundException('Předpis nenalezen');

    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { tenantId: user.tenantId, propertyId: p.propertyId },
      select: { accountNumber: true, bankCode: true, iban: true },
    });
    if (!bankAccount) throw new NotFoundException('Bankovní účet pro nemovitost nenalezen');

    const total = p.items.length > 0
      ? p.items.reduce((s, i) => s + Number(i.amount), 0)
      : Number(p.amount);
    const dueDate = new Date(p.validFrom);
    dueDate.setDate(p.dueDay);
    const dtStr = dueDate.toISOString().slice(0, 10).replace(/-/g, '');
    const acc = bankAccount.iban ?? `${bankAccount.accountNumber}/${bankAccount.bankCode}`;
    const spd = `SPD*1.0*ACC:${acc}*AM:${total.toFixed(2)}*CC:CZK*X-VS:${p.variableSymbol ?? ''}*MSG:Predpis ${p.description}*DT:${dtStr}*`;

    const png = await QRCode.toBuffer(spd, { width: 300, margin: 2 });
    reply.header('Content-Type', 'image/png');
    reply.header('Content-Disposition', `inline; filename="qr-${p.variableSymbol ?? p.id.slice(0, 8)}.png"`);
    return reply.send(png);
  }
}

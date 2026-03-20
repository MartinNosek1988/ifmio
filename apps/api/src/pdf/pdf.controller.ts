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
import type { EvidencniListData } from './pdf.service';
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
        'Vazeny/a {{jmeno}}, evidujeme dluznou castku {{castka}} se splatnosti {{splatnost}}.',
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
}

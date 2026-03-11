import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { PdfService } from './pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('PDF')
@ApiBearerAuth()
@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
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
        resident: { select: { firstName: true, lastName: true } },
        template: true,
      },
    });

    if (!reminder) throw new NotFoundException('Upominka nenalezena');

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
}

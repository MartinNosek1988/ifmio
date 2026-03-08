import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface ProtocolData {
  ticketNumber: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  propertyName?: string;
  unitName?: string;
  residentName?: string;
  assigneeName?: string;
  createdAt: string;
  resolvedAt?: string | null;
  items?: { text: string; createdAt: string; authorName?: string }[];
}

interface ReminderData {
  residentName: string;
  propertyName: string;
  unitName?: string;
  amount: number;
  dueDate: string;
  level: number;
  templateSubject: string;
  templateBody: string;
}

@Injectable()
export class PdfService {
  generateProtocol(data: ProtocolData): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('ifmio', { align: 'center' })
      .moveDown(0.3)
      .fontSize(14)
      .text('Protokol helpdesk tiketu', { align: 'center' })
      .moveDown(1);

    // Ticket info
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Tiket #${data.ticketNumber}`, { continued: true })
      .text(`    Status: ${data.status}    Priorita: ${data.priority}`, {
        align: 'right',
      })
      .moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(data.title)
      .moveDown(0.5);

    doc.font('Helvetica').fontSize(10);

    if (data.propertyName) {
      doc.text(`Nemovitost: ${data.propertyName}`);
    }
    if (data.unitName) {
      doc.text(`Jednotka: ${data.unitName}`);
    }
    if (data.residentName) {
      doc.text(`Nahlasil: ${data.residentName}`);
    }
    if (data.assigneeName) {
      doc.text(`Prirazeno: ${data.assigneeName}`);
    }

    doc.text(`Vytvoreno: ${data.createdAt}`);
    if (data.resolvedAt) {
      doc.text(`Vyreseno: ${data.resolvedAt}`);
    }

    doc.moveDown(1);

    // Description
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Popis')
      .moveDown(0.3)
      .font('Helvetica')
      .fontSize(10)
      .text(data.description || '—')
      .moveDown(1);

    // Items / comments
    if (data.items && data.items.length > 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Komentare')
        .moveDown(0.3);

      for (const item of data.items) {
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(`${item.authorName ?? 'System'} — ${item.createdAt}`)
          .font('Helvetica')
          .fontSize(10)
          .text(item.text)
          .moveDown(0.5);
      }
    }

    // Footer
    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor('#888')
      .text(
        `Vygenerovano: ${new Date().toLocaleDateString('cs-CZ')} | ifmio Property Management`,
        { align: 'center' },
      );

    doc.end();
    return doc;
  }

  generateReminder(data: ReminderData): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('ifmio', { align: 'center' })
      .moveDown(0.3)
      .fontSize(14)
      .text(data.templateSubject, { align: 'center' })
      .moveDown(1);

    // Recipient info
    doc.font('Helvetica').fontSize(10);
    doc.text(`Adresat: ${data.residentName}`);
    doc.text(`Nemovitost: ${data.propertyName}`);
    if (data.unitName) {
      doc.text(`Jednotka: ${data.unitName}`);
    }
    doc.moveDown(1);

    // Body
    const body = data.templateBody
      .replace('{{jmeno}}', data.residentName)
      .replace('{{castka}}', `${data.amount.toLocaleString('cs-CZ')} Kc`)
      .replace('{{splatnost}}', data.dueDate)
      .replace('{{nemovitost}}', data.propertyName);

    doc.fontSize(11).text(body).moveDown(1);

    // Amount box
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Dluzna castka: ${data.amount.toLocaleString('cs-CZ')} Kc`)
      .font('Helvetica')
      .fontSize(10)
      .text(`Splatnost: ${data.dueDate}`)
      .text(`Uroven upominky: ${data.level}`)
      .moveDown(2);

    // Footer
    doc
      .fontSize(8)
      .fillColor('#888')
      .text(
        `Vygenerovano: ${new Date().toLocaleDateString('cs-CZ')} | ifmio Property Management`,
        { align: 'center' },
      );

    doc.end();
    return doc;
  }
}

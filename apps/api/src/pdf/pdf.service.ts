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

export interface ProtocolDocumentData {
  number: string;
  protocolType: string;
  title?: string | null;
  description?: string | null;
  status: string;
  propertyName?: string | null;
  supplierSnapshot?: Record<string, unknown> | null;
  customerSnapshot?: Record<string, unknown> | null;
  requesterName?: string | null;
  dispatcherName?: string | null;
  resolverName?: string | null;
  categoryLabel?: string | null;
  activityLabel?: string | null;
  spaceLabel?: string | null;
  tenantUnitLabel?: string | null;
  submittedAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  handoverAt?: string | null;
  transportKm?: number | null;
  transportMode?: string | null;
  transportDescription?: string | null;
  publicNote?: string | null;
  satisfaction?: string | null;
  satisfactionComment?: string | null;
  supplierSignatureName?: string | null;
  customerSignatureName?: string | null;
  lines: { lineType: string; name: string; unit?: string | null; quantity: number; description?: string | null }[];
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

  generateProtocolDocument(data: ProtocolDocumentData): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const TYPE_LABEL: Record<string, string> = {
      work_report: 'Pracovní výkaz',
      handover: 'Předávací protokol',
      revision_report: 'Revizní zpráva',
      service_protocol: 'Servisní protokol',
    };
    const SATISFACTION_LABEL: Record<string, string> = {
      satisfied: 'Spokojený',
      partially_satisfied: 'Částečně spokojený',
      dissatisfied: 'Nespokojený',
      neutral: 'Neutrální',
    };

    const fmtDate = (v?: string | null) =>
      v ? new Date(v).toLocaleDateString('cs-CZ') : '—';

    // ─── Header ──────────────────────────────────────────────────
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('ifmio', { align: 'center' })
      .moveDown(0.2)
      .fontSize(13)
      .text(TYPE_LABEL[data.protocolType] ?? data.protocolType, { align: 'center' })
      .moveDown(0.2)
      .fontSize(10)
      .font('Helvetica')
      .text(`č. ${data.number}`, { align: 'center' })
      .moveDown(1);

    // ─── Title ───────────────────────────────────────────────────
    if (data.title) {
      doc.font('Helvetica-Bold').fontSize(12).text(data.title).moveDown(0.5);
    }

    // ─── Supplier / Customer blocks ──────────────────────────────
    const snapshotBlock = (label: string, snap?: Record<string, unknown> | null) => {
      if (!snap) return;
      doc.font('Helvetica-Bold').fontSize(10).text(label).moveDown(0.2);
      doc.font('Helvetica').fontSize(9);
      if (snap.name) doc.text(String(snap.name));
      if (snap.street) doc.text(String(snap.street));
      if (snap.city || snap.zip) doc.text([snap.zip, snap.city].filter(Boolean).join(' '));
      if (snap.ico) doc.text(`IČO: ${snap.ico}`);
      if (snap.dic) doc.text(`DIČ: ${snap.dic}`);
      doc.moveDown(0.5);
    };

    snapshotBlock('Dodavatel', data.supplierSnapshot);
    snapshotBlock('Odběratel', data.customerSnapshot);

    // ─── Metadata grid ───────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).text('Údaje').moveDown(0.3);
    doc.font('Helvetica').fontSize(9);

    const meta: [string, string | null | undefined][] = [
      ['Nemovitost', data.propertyName],
      ['Prostor', data.spaceLabel],
      ['Jednotka', data.tenantUnitLabel],
      ['Kategorie', data.categoryLabel],
      ['Činnost', data.activityLabel],
      ['Žadatel', data.requesterName],
      ['Dispečer', data.dispatcherName],
      ['Řešitel', data.resolverName],
      ['Podáno', fmtDate(data.submittedAt)],
      ['Termín', fmtDate(data.dueAt)],
      ['Dokončeno', fmtDate(data.completedAt)],
      ['Předáno', fmtDate(data.handoverAt)],
    ];

    for (const [label, value] of meta) {
      if (value && value !== '—') {
        doc.text(`${label}: ${value}`);
      }
    }

    if (data.transportKm || data.transportMode || data.transportDescription) {
      doc.moveDown(0.3);
      doc.text(`Doprava: ${[data.transportMode, data.transportKm ? `${data.transportKm} km` : null, data.transportDescription].filter(Boolean).join(', ')}`);
    }
    doc.moveDown(0.5);

    // ─── Description ─────────────────────────────────────────────
    if (data.description) {
      doc.font('Helvetica-Bold').fontSize(10).text('Popis').moveDown(0.2);
      doc.font('Helvetica').fontSize(9).text(data.description).moveDown(0.5);
    }

    if (data.publicNote) {
      doc.font('Helvetica-Bold').fontSize(10).text('Veřejná poznámka').moveDown(0.2);
      doc.font('Helvetica').fontSize(9).text(data.publicNote).moveDown(0.5);
    }

    // ─── Lines table ─────────────────────────────────────────────
    if (data.lines.length > 0) {
      doc.font('Helvetica-Bold').fontSize(10).text('Položky').moveDown(0.3);

      const tableTop = doc.y;
      const col = { num: 50, name: 80, qty: 380, unit: 420, desc: 460 };

      // Header row
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('#', col.num, tableTop);
      doc.text('Název', col.name, tableTop);
      doc.text('Množství', col.qty, tableTop);
      doc.text('Jedn.', col.unit, tableTop);

      doc.moveTo(50, tableTop + 12).lineTo(545, tableTop + 12).strokeColor('#ccc').stroke();

      doc.font('Helvetica').fontSize(8);
      let y = tableTop + 16;

      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        doc.text(String(i + 1), col.num, y);
        doc.text(line.name, col.name, y, { width: 290 });
        doc.text(String(line.quantity), col.qty, y);
        doc.text(line.unit ?? 'ks', col.unit, y);
        if (line.description) {
          y += 12;
          doc.fontSize(7).fillColor('#666').text(line.description, col.name, y, { width: 290 });
          doc.fillColor('#000').fontSize(8);
        }
        y += 14;
      }

      doc.y = y;
      doc.moveDown(0.5);
    }

    // ─── Satisfaction ────────────────────────────────────────────
    if (data.satisfaction) {
      doc.font('Helvetica-Bold').fontSize(10).text('Spokojenost').moveDown(0.2);
      doc.font('Helvetica').fontSize(9).text(SATISFACTION_LABEL[data.satisfaction] ?? data.satisfaction);
      if (data.satisfactionComment) {
        doc.text(data.satisfactionComment);
      }
      doc.moveDown(0.5);
    }

    // ─── Signatures ──────────────────────────────────────────────
    doc.moveDown(1);
    const sigY = doc.y;
    doc.font('Helvetica').fontSize(9);

    doc.text('Dodavatel:', 50, sigY);
    doc.moveTo(50, sigY + 30).lineTo(250, sigY + 30).strokeColor('#999').stroke();
    doc.text(data.supplierSignatureName ?? '', 50, sigY + 34);

    doc.text('Odběratel:', 300, sigY);
    doc.moveTo(300, sigY + 30).lineTo(500, sigY + 30).strokeColor('#999').stroke();
    doc.text(data.customerSignatureName ?? '', 300, sigY + 34);

    // ─── Footer ──────────────────────────────────────────────────
    doc
      .moveDown(3)
      .fontSize(7)
      .fillColor('#888')
      .text(
        `Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')} | ifmio Property Management`,
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

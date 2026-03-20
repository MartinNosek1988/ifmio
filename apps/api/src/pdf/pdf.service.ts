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

  // ─── Evidenční list ──────────────────────────────────────────────

  generateEvidencniList(data: EvidencniListData): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Header
    doc
      .fontSize(20).font('Helvetica-Bold')
      .text('ifmio', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16).font('Helvetica-Bold')
      .text('EVIDENČNÍ LIST', { align: 'center' })
      .fontSize(12).font('Helvetica')
      .text(`pro rok ${data.year}`, { align: 'center' })
      .moveDown(1.5);

    // Property section
    doc.fontSize(10).font('Helvetica-Bold').text('NEMOVITOST');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Název: ${data.propertyName}`);
    if (data.propertyIco) doc.text(`IČ: ${data.propertyIco}`);
    doc.text(`Adresa: ${data.propertyAddress}`);
    if (data.propertyLegalMode) doc.text(`Forma: ${data.propertyLegalMode}`);
    doc.moveDown(1);

    // Unit section
    doc.font('Helvetica-Bold').text('JEDNOTKA');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);
    doc.font('Helvetica');
    doc.text(`Označení: ${data.unitName}`);
    if (data.unitKnDesignation) doc.text(`KN označení: ${data.unitKnDesignation}`);
    if (data.unitSpaceType) doc.text(`Typ: ${data.unitSpaceType}`);
    if (data.unitDisposition) doc.text(`Dispozice: ${data.unitDisposition}`);
    if (data.unitArea) doc.text(`Podlahová plocha: ${data.unitArea} m²`);
    if (data.unitCommonShare) doc.text(`Podíl na spol. částech: ${data.unitCommonShare}`);
    doc.moveDown(1);

    // Owner section
    doc.font('Helvetica-Bold').text('VLASTNÍK / NÁJEMCE');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);
    doc.font('Helvetica');
    doc.text(`Jméno: ${data.ownerName}`);
    if (data.ownerAddress) doc.text(`Adresa: ${data.ownerAddress}`);
    if (data.variableSymbol) doc.text(`Variabilní symbol: ${data.variableSymbol}`);
    doc.moveDown(1);

    // Prescription section (if available)
    if (data.prescriptionItems && data.prescriptionItems.length > 0) {
      doc.font('Helvetica-Bold').text('MĚSÍČNÍ PŘEDPIS PLATEB');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);

      const colX = 50;
      const amtX = 420;

      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Složka', colX, doc.y);
      doc.text('Částka', amtX, doc.y - 10, { align: 'right', width: 125 });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e0e0e0');
      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(10);
      let total = 0;
      for (const item of data.prescriptionItems) {
        doc.text(item.name, colX, doc.y);
        doc.text(this.formatCzk(item.amount), amtX, doc.y - 10, { align: 'right', width: 125 });
        total += item.amount;
        doc.moveDown(0.3);
      }

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold');
      doc.text('CELKEM', colX, doc.y);
      doc.text(this.formatCzk(total), amtX, doc.y - 10, { align: 'right', width: 125 });
      doc.moveDown(1);

      if (data.bankAccount) {
        doc.font('Helvetica').fontSize(10);
        doc.text(`Platba na účet: ${data.bankAccount}`);
        doc.text('Splatnost: do 25. dne v měsíci');
      }
    } else {
      // TODO: Add prescription section when prescription components module is ready
      doc.font('Helvetica').fontSize(9).fillColor('#888888');
      doc.text('Sekce předpisu plateb bude doplněna po nastavení složek předpisu.', { align: 'center' });
      doc.fillColor('#000000');
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(10);
    doc.text(`V ${data.city ?? 'Praze'} dne ${new Date().toLocaleDateString('cs-CZ')}`);
    doc.moveDown(2);
    doc.text('Správce nemovitosti', { align: 'right' });
    doc.text('(podpis, razítko)', { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(7).fillColor('#aaaaaa')
      .text(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')} | ifmio Property Management`, { align: 'center' });

    doc.end();
    return doc;
  }

  private formatCzk(amount: number): string {
    return amount.toLocaleString('cs-CZ') + ' Kč';
  }

  // ─── Předpis / Faktura PDF ──────────────────────────────────────

  async generatePrescriptionPdf(data: PrescriptionPdfData): Promise<PDFKit.PDFDocument> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const isInvoice = data.type === 'faktura';

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('ifmio', { align: 'center' }).moveDown(0.3);
    doc.fontSize(14).font('Helvetica-Bold')
      .text(isInvoice ? `FAKTURA - PŘEDPIS č. ${data.number}` : `PŘEDPIS č. ${data.number}`, { align: 'center' })
      .moveDown(1);

    // Supplier + Customer columns
    if (isInvoice) {
      const startY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').text('Dodavatel:', 50, startY);
      doc.font('Helvetica').fontSize(9);
      doc.text(data.supplierName, 50, startY + 14);
      if (data.supplierIco) doc.text(`IČ: ${data.supplierIco}`);
      doc.text(data.supplierAddress);

      doc.fontSize(9).font('Helvetica-Bold').text('Odběratel:', 300, startY);
      doc.font('Helvetica').fontSize(9);
      doc.text(data.customerName, 300, startY + 14);
      if (data.customerAddress) doc.text(data.customerAddress, 300);
      doc.y = Math.max(doc.y, startY + 60);
      doc.moveDown(0.5);
    }

    // Metadata
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc').moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    const metaY = doc.y;
    doc.text(`Datum vystavení: ${data.issuedDate}`, 50, metaY);
    doc.text(`Datum splatnosti: ${data.dueDate}`, 50);
    if (data.variableSymbol) doc.text(`VS: ${data.variableSymbol}`, 50);
    doc.text(`Forma úhrady: Bankovní převod`, 300, metaY);
    if (data.bankAccount) doc.text(`Číslo účtu: ${data.bankAccount}`, 300);
    doc.moveDown(1);

    // Items table
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc').moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Položka', 50, doc.y);
    doc.text('Částka', 420, doc.y - 10, { align: 'right', width: 75 });
    if (data.isVatPayer) doc.text('DPH', 500, doc.y - 10, { align: 'right', width: 45 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e0e0e0').moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    let totalBase = 0;
    const vatGroups = new Map<number, number>();

    for (const item of data.items) {
      doc.text(item.name, 50, doc.y);
      doc.text(this.formatCzk(item.amount), 420, doc.y - 10, { align: 'right', width: 75 });
      if (data.isVatPayer) {
        const vr = item.vatRate ?? 0;
        doc.text(vr > 0 ? `${vr}%` : '—', 500, doc.y - 10, { align: 'right', width: 45 });
        if (vr > 0) {
          vatGroups.set(vr, (vatGroups.get(vr) ?? 0) + item.amount * vr / 100);
        }
      }
      totalBase += item.amount;
      doc.moveDown(0.3);
    }

    // Totals
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc').moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(10);

    if (data.isVatPayer && vatGroups.size > 0) {
      doc.text(`Základ bez DPH:`, 50, doc.y);
      doc.text(this.formatCzk(totalBase), 420, doc.y - 10, { align: 'right', width: 125 });
      doc.moveDown(0.3);
      let totalVat = 0;
      for (const [rate, amount] of vatGroups) {
        doc.font('Helvetica').fontSize(9);
        doc.text(`DPH ${rate}%:`, 50, doc.y);
        doc.text(this.formatCzk(Math.round(amount * 100) / 100), 420, doc.y - 10, { align: 'right', width: 125 });
        totalVat += amount;
        doc.moveDown(0.3);
      }
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('CELKEM K ÚHRADĚ:', 50, doc.y);
      doc.text(this.formatCzk(Math.round((totalBase + totalVat) * 100) / 100), 420, doc.y - 10, { align: 'right', width: 125 });
    } else {
      doc.text('CELKEM:', 50, doc.y);
      doc.text(this.formatCzk(totalBase), 420, doc.y - 10, { align: 'right', width: 125 });
    }
    doc.moveDown(1.5);

    // QR payment code
    if (data.qrCodeBuffer) {
      doc.image(data.qrCodeBuffer, 50, doc.y, { width: 100, height: 100 });
      doc.fontSize(8).font('Helvetica').text('QR Platba', 50, doc.y + 104, { width: 100, align: 'center' });
      doc.y += 120;
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(7).fillColor('#aaaaaa')
      .text(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')} | ifmio Property Management`, { align: 'center' });

    doc.end();
    return doc;
  }
}

export interface PrescriptionPdfData {
  type: 'predpis' | 'faktura';
  number: string;
  supplierName: string;
  supplierIco?: string | null;
  supplierAddress: string;
  customerName: string;
  customerAddress?: string | null;
  issuedDate: string;
  dueDate: string;
  variableSymbol?: string | null;
  bankAccount?: string | null;
  isVatPayer: boolean;
  items: { name: string; amount: number; vatRate?: number | null }[];
  qrCodeBuffer?: Buffer | null;
}

export interface EvidencniListData {
  year: number;
  propertyName: string;
  propertyIco?: string | null;
  propertyAddress: string;
  propertyLegalMode?: string | null;
  city?: string | null;
  unitName: string;
  unitKnDesignation?: string | null;
  unitSpaceType?: string | null;
  unitDisposition?: string | null;
  unitArea?: string | null;
  unitCommonShare?: string | null;
  ownerName: string;
  ownerAddress?: string | null;
  variableSymbol?: string | null;
  bankAccount?: string | null;
  prescriptionItems?: { name: string; amount: number }[];
}

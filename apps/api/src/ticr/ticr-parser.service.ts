import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

export interface TicrRecord {
  ico: string | null;
  name: string;
  address: string | null;
  ticrPersonId: string | null;
  evidenceNumber: string;
  validUntil: Date | null;
  deviceType: string;
  activity: string;
  qualificationRef: string | null;
  registryType: 'OZO' | 'RT';
  sourceUrl: string;
}

@Injectable()
export class TicrParserService {
  private readonly logger = new Logger(TicrParserService.name);

  parseFile(filePath: string, registryType: 'OZO' | 'RT'): TicrRecord[] {
    const html = fs.readFileSync(filePath, 'utf-8');
    return this.parseHtml(html, registryType);
  }

  parseHtml(html: string, registryType: 'OZO' | 'RT'): TicrRecord[] {
    const $ = cheerio.load(html);
    const records: TicrRecord[] = [];
    const rows = $('table tr').toArray();

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      try {
        const cells = $(rows[i]).find('td').toArray();
        if (cells.length < 7) continue;

        if (registryType === 'OZO') {
          // OZO: IČO | Název | Sídlo | Evidenční číslo | Datum zániku | Druh zařízení | Činnost
          const ico = this.normalizeIco($(cells[0]).text());
          const nameEl = $(cells[1]);
          const name = nameEl.text().trim();
          const href = nameEl.find('a').attr('href') ?? null;
          const ticrPersonId = this.extractPersonId(href);
          const address = $(cells[2]).text().trim() || null;
          const evidenceNumber = $(cells[3]).text().trim();
          const validUntil = this.parseDate($(cells[4]).text().trim());
          const deviceType = $(cells[5]).text().trim();
          const activity = $(cells[6]).text().trim();

          if (!evidenceNumber || !name) continue;

          records.push({
            ico,
            name,
            address,
            ticrPersonId,
            evidenceNumber,
            validUntil,
            deviceType,
            activity,
            qualificationRef: null,
            registryType: 'OZO',
            sourceUrl: 'https://formulare.ticr.eu/ozoi.html',
          });
        } else {
          // RT: IČO | Revizní technik | Evidenční číslo | Č.j. uznání kvalifikace | Datum platnosti | Druh zařízení | Činnost
          const ico = this.normalizeIco($(cells[0]).text());
          const nameEl = $(cells[1]);
          const name = nameEl.text().trim();
          const href = nameEl.find('a').attr('href') ?? null;
          const ticrPersonId = this.extractPersonId(href);
          const evidenceNumber = $(cells[2]).text().trim();
          const qualificationRef = $(cells[3]).text().trim() || null;
          const validUntil = this.parseDate($(cells[4]).text().trim());
          const deviceType = $(cells[5]).text().trim();
          const activity = $(cells[6]).text().trim();

          if (!evidenceNumber || !name) continue;

          records.push({
            ico,
            name,
            address: null,
            ticrPersonId,
            evidenceNumber,
            validUntil,
            deviceType,
            activity,
            qualificationRef,
            registryType: 'RT',
            sourceUrl: 'https://formulare.ticr.eu/rti.html',
          });
        }
      } catch (err) {
        this.logger.warn(
          `Row ${i} parse error: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    this.logger.log(`Parsed ${records.length} ${registryType} records from HTML`);
    return records;
  }

  private normalizeIco(raw: string): string | null {
    const trimmed = raw.trim().replace(/\s+/g, '');
    if (!trimmed || trimmed === '-') return null;
    return trimmed.padStart(8, '0');
  }

  private parseDate(raw: string): Date | null {
    if (!raw || raw === '-' || raw.trim() === '') return null;
    // Czech format: "14. 3. 2035" or "1. 12. 2025"
    const match = raw.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (!match) return null;
    const [, day, month, year] = match;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? null : d;
  }

  private extractPersonId(href: string | null): string | null {
    if (!href) return null;
    // P-1001309145.html → "-1001309145", P493.html → "493", S-123.html → "-123"
    const match = href.match(/[PS](-?\d+)\.html/);
    return match ? match[1] : null;
  }
}

import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface AresSubject {
  ico: string;
  nazev: string;
  pravniForma: string;
  adresa: {
    ulice: string;
    cisloPopisne: string;
    obec: string;
    psc: string;
    kraj: string;
  };
  dic?: string;
  datumVzniku?: string;
}

export interface AresSearchResult {
  pocetCelkem: number;
  ekonomickeSubjekty: AresSubject[];
}

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest';

@Injectable()
export class AresService {
  private readonly logger = new Logger(AresService.name);

  /** Validate IČO: must be 8 digits and pass checksum (weights [8,7,6,5,4,3,2], mod 11). */
  validateIco(ico: string): boolean {
    if (!/^\d{8}$/.test(ico)) return false;

    const weights = [8, 7, 6, 5, 4, 3, 2];
    const digits = ico.split('').map(Number);
    const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
    const remainder = sum % 11;

    let expected: number;
    if (remainder === 0) expected = 8;
    else if (remainder === 1) expected = 0;
    else expected = 11 - remainder;

    return digits[7] === expected;
  }

  async findByIco(ico: string): Promise<AresSubject | null> {
    if (!this.validateIco(ico)) {
      throw new BadRequestException('Neplatné IČO – musí mít 8 číslic a platný kontrolní součet');
    }

    try {
      const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty/${ico}`, {
        headers: { Accept: 'application/json' },
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        this.logger.warn(`ARES API responded with ${res.status} for ICO ${ico}`);
        return null;
      }

      const data = await res.json();
      return this.mapSubject(data);
    } catch (err) {
      this.logger.error(`ARES lookup failed for ICO ${ico}`, (err as Error).stack);
      return null;
    }
  }

  async searchByName(name: string, limit = 10): Promise<AresSearchResult> {
    if (!name || name.trim().length < 3) {
      throw new BadRequestException('Vyhledávací dotaz musí mít alespoň 3 znaky');
    }

    try {
      const params = new URLSearchParams({
        obchodniJmeno: name.trim(),
        pocet: String(Math.min(limit, 100)),
      });

      const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty/vyhledat?${params}`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        this.logger.warn(`ARES search responded with ${res.status}`);
        return { pocetCelkem: 0, ekonomickeSubjekty: [] };
      }

      const data = await res.json();
      const subjects: AresSubject[] = (data.ekonomickeSubjekty ?? []).map(
        (s: Record<string, unknown>) => this.mapSubject(s),
      );

      return {
        pocetCelkem: data.pocetCelkem ?? subjects.length,
        ekonomickeSubjekty: subjects,
      };
    } catch (err) {
      this.logger.error('ARES search failed', (err as Error).stack);
      return { pocetCelkem: 0, ekonomickeSubjekty: [] };
    }
  }

  private mapSubject(data: Record<string, unknown>): AresSubject {
    const sidlo = (data.sidlo ?? {}) as Record<string, unknown>;
    const czNace = data.czNace as string[] | undefined;

    return {
      ico: String(data.ico ?? ''),
      nazev: String(data.obchodniJmeno ?? ''),
      pravniForma: String(
        (data.pravniForma as Record<string, unknown>)?.nazev ??
          (data.pravniForma as string) ??
          '',
      ),
      adresa: {
        ulice: String(sidlo.nazevUlice ?? ''),
        cisloPopisne: String(sidlo.cisloDomovni ?? ''),
        obec: String(sidlo.nazevObce ?? ''),
        psc: String(sidlo.psc ?? ''),
        kraj: String(sidlo.nazevKraje ?? ''),
      },
      ...(data.dic ? { dic: String(data.dic) } : {}),
      ...(data.datumVzniku ? { datumVzniku: String(data.datumVzniku) } : {}),
    };
  }
}

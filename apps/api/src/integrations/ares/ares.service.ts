import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface AresSubject {
  ico: string;
  nazev: string;
  pravniForma: string;
  pravniFormaKod?: number;
  adresa: {
    ulice: string;
    cisloPopisne: string;
    cisloOrientacni: string;
    obec: string;
    castObce: string;
    psc: string;
    kraj: string;
  };
  textovaAdresa?: string;
  dic?: string;
  datumVzniku?: string;
  datumZaniku?: string;
  czNace?: string[];
  datoveSchranky?: string[];
  zastupci?: AresZastupce[];
  registrace?: AresRegistrace;
}

export interface AresZastupce {
  jmeno: string;
  prijmeni: string;
  funkce: string;
  datumNarozeni?: string;
}

export interface AresRegistrace {
  stavZdrojeVr?: string;
  stavZdrojeRes?: string;
  stavZdrojeRzp?: string;
  stavZdrojeNrpzs?: string;
  stavZdrojeRpsh?: string;
  stavZdrojeRcns?: string;
  stavZdrojeSzr?: string;
  stavZdrojeDph?: string;
  stavZdrojeSd?: string;
  stavZdrojeIr?: string;
  stavZdrojeCeu?: string;
  stavZdrojeRs?: string;
  stavZdrojeRed?: string;
}

export interface AresSearchResult {
  pocetCelkem: number;
  ekonomickeSubjekty: AresSubject[];
}

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const NEGATIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — don't re-query missing IČO
const CACHE_MAX_SIZE = 500;

@Injectable()
export class AresService {
  private readonly logger = new Logger(AresService.name);
  private readonly cache = new Map<string, { data: AresSubject | null; ts: number }>();

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

    // Check cache (negative results use longer TTL to avoid re-querying missing IČO)
    const cached = this.cache.get(ico);
    if (cached) {
      const ttl = cached.data === null ? NEGATIVE_CACHE_TTL_MS : CACHE_TTL_MS;
      if (Date.now() - cached.ts < ttl) return cached.data;
    }

    try {
      const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty/${ico}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 404) { this.cacheSet(ico, null); return null; }
      if (!res.ok) {
        this.logger.warn(`ARES API responded with ${res.status} for ICO ${ico}`);
        return null;
      }

      const data = await res.json();
      const subject = this.mapSubject(data);
      this.cacheSet(ico, subject);
      return subject;
    } catch (err) {
      this.logger.error(`ARES lookup failed for ICO ${ico}`, (err as Error).stack);
      return null;
    }
  }

  private cacheSet(ico: string, data: AresSubject | null): void {
    if (this.cache.size >= CACHE_MAX_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(ico, { data, ts: Date.now() });
  }

  async searchByName(name: string, limit = 10): Promise<AresSearchResult> {
    if (!name || name.trim().length < 3) {
      throw new BadRequestException('Vyhledávací dotaz musí mít alespoň 3 znaky');
    }

    try {
      // ARES v2 GET /vyhledat is broken (requires IČO). Use POST with JSON body instead.
      const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty/vyhledat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          obchodniJmeno: name.trim(),
          start: 0,
          pocet: Math.min(limit, 100),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        this.logger.warn(`ARES search responded with ${res.status}: ${body.slice(0, 200)}`);
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
      this.logger.warn(`ARES search failed for "${name}": ${(err as Error).message}`);
      return { pocetCelkem: 0, ekonomickeSubjekty: [] };
    }
  }

  private mapSubject(data: Record<string, unknown>): AresSubject {
    const sidlo = (data.sidlo ?? {}) as Record<string, unknown>;
    const czNace = data.czNace as string[] | undefined;
    const pravniFormaObj = data.pravniForma as Record<string, unknown> | string | undefined;
    const datoveSchranky = data.datoveSchranky as Array<Record<string, unknown>> | undefined;
    const zastupci = data.seznamRegistraci as Record<string, unknown> | undefined;
    const statutarniOrgan = data.statutarniOrgan as Array<Record<string, unknown>> | undefined;
    const registrace = data.registrace as Record<string, unknown> | undefined;

    const result: AresSubject = {
      ico: String(data.ico ?? ''),
      nazev: String(data.obchodniJmeno ?? ''),
      pravniForma: String(
        typeof pravniFormaObj === 'object' ? pravniFormaObj?.nazev ?? '' : pravniFormaObj ?? '',
      ),
      adresa: {
        ulice: String(sidlo.nazevUlice ?? ''),
        cisloPopisne: String(sidlo.cisloDomovni ?? ''),
        cisloOrientacni: String(sidlo.cisloOrientacni ?? ''),
        obec: String(sidlo.nazevObce ?? ''),
        castObce: String(sidlo.nazevCastiObce ?? ''),
        psc: String(sidlo.psc ?? ''),
        kraj: String(sidlo.nazevKraje ?? ''),
      },
    };

    // Text address
    if (sidlo.textovaAdresa) {
      result.textovaAdresa = String(sidlo.textovaAdresa);
    } else {
      // Build from parts
      const parts: string[] = [];
      if (sidlo.nazevUlice) {
        let street = String(sidlo.nazevUlice);
        if (sidlo.cisloDomovni) street += ` ${sidlo.cisloDomovni}`;
        if (sidlo.cisloOrientacni) street += `/${sidlo.cisloOrientacni}`;
        parts.push(street);
      }
      if (sidlo.nazevObce) parts.push(`${sidlo.psc ?? ''} ${sidlo.nazevObce}`.trim());
      if (parts.length) result.textovaAdresa = parts.join(', ');
    }

    // Legal form code
    if (typeof pravniFormaObj === 'object' && pravniFormaObj?.kod) {
      result.pravniFormaKod = Number(pravniFormaObj.kod);
    }

    if (data.dic) result.dic = String(data.dic);
    if (data.datumVzniku) result.datumVzniku = String(data.datumVzniku);
    if (data.datumZaniku) result.datumZaniku = String(data.datumZaniku);
    if (czNace?.length) result.czNace = czNace;

    // Datové schránky
    if (datoveSchranky?.length) {
      result.datoveSchranky = datoveSchranky
        .map((ds) => String(ds.idDs ?? ds.id ?? ''))
        .filter(Boolean);
    }

    // Statutární orgán → zastupci
    if (statutarniOrgan?.length) {
      result.zastupci = statutarniOrgan
        .filter((z) => z.jmeno || z.prijmeni)
        .map((z) => ({
          jmeno: String(z.jmeno ?? ''),
          prijmeni: String(z.prijmeni ?? ''),
          funkce: String(z.funkce ?? z.clenstvi ?? ''),
          ...(z.datumNarozeni ? { datumNarozeni: String(z.datumNarozeni) } : {}),
        }));
    }

    // Registrace
    if (registrace && typeof registrace === 'object') {
      const reg: AresRegistrace = {};
      const regKeys: (keyof AresRegistrace)[] = [
        'stavZdrojeVr', 'stavZdrojeRes', 'stavZdrojeRzp', 'stavZdrojeNrpzs',
        'stavZdrojeRpsh', 'stavZdrojeRcns', 'stavZdrojeSzr', 'stavZdrojeDph',
        'stavZdrojeSd', 'stavZdrojeIr', 'stavZdrojeCeu', 'stavZdrojeRs', 'stavZdrojeRed',
      ];
      let hasAny = false;
      for (const key of regKeys) {
        if (registrace[key] != null) {
          reg[key] = String(registrace[key]);
          hasAny = true;
        }
      }
      if (hasAny) result.registrace = reg;
    }

    return result;
  }
}

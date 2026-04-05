import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// ── Response types (from ČÚZK API v1.0 swagger) ───────

export interface CuzkStavba {
  id: number
  typStavby: { kod: number; nazev: string }
  cislaDomovni: number[]
  castObce: { kod: number; nazev: string }
  obec: { kod: number; nazev: string }
  lv: { id: number; cislo: number; katastralniUzemi: { kod: number; nazev: string } } | null
  jednotky: Array<{ id: number; cisloJednotky: number }>
  zpusobVyuziti: { kod: number; nazev: string } | null
  zpusobyOchrany: Array<{ kod: number; nazev: string }>
  parcely: Array<{ id: number; typParcely: string; kmenoveCisloParcely: number; poddeleniCislaParcely?: number; katastralniUzemi?: { kod: number; nazev: string } }>
  adresniMista?: number[]
  docasna?: boolean
}

export interface CuzkJednotka {
  id: number
  cisloJednotky: number
  typJednotky: { kod: number; nazev: string }
  zpusobVyuziti: { kod: number; nazev: string } | null
  podilNaSpolecnychCastechDomu: { citatel: number; jmenovatel: number } | null
  lv: { id: number; cislo: number; katastralniUzemi: { kod: number; nazev: string } } | null
  zpusobyOchrany: Array<{ kod: number; nazev: string }>
}

// ── Service ────────────────────────────────────────────

@Injectable()
export class CuzkApiKnService {
  private readonly logger = new Logger(CuzkApiKnService.name)
  private readonly baseUrl = 'https://api-kn.cuzk.gov.cz/api/v1'
  private readonly apiKey: string
  private dailyCallCount = 0
  private dailyCallDate = ''

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('CUZK_API_KEY') || ''
    if (!this.apiKey) this.logger.warn('CUZK_API_KEY not configured — ČÚZK API disabled')
  }

  get isConfigured(): boolean { return !!this.apiKey }

  private resetDailyCounterIfNeeded() {
    const today = new Date().toISOString().slice(0, 10)
    if (this.dailyCallDate !== today) {
      this.dailyCallCount = 0
      this.dailyCallDate = today
    }
  }

  private async apiFetch<T>(path: string): Promise<T | null> {
    if (!this.apiKey) return null
    this.resetDailyCounterIfNeeded()
    if (this.dailyCallCount >= 450) {
      this.logger.warn('ČÚZK API daily limit approaching (450/500) — skipping')
      return null
    }

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { ApiKey: this.apiKey },
        signal: AbortSignal.timeout(15000),
      })
      this.dailyCallCount++

      if (!res.ok) {
        this.logger.warn(`ČÚZK API ${path} → ${res.status}`)
        return null
      }
      const json = await res.json()
      // Track actual call count from response
      if (json.provedenoVolani) this.dailyCallCount = json.provedenoVolani
      return json
    } catch (err) {
      this.logger.warn(`ČÚZK API error: ${err instanceof Error ? err.message : err}`)
      return null
    }
  }

  /** Najdi stavbu dle kódu adresního místa (RÚIAN) */
  async getStavbaByAdresniMisto(ruianAddressCode: number): Promise<CuzkStavba | null> {
    const result = await this.apiFetch<{ data: CuzkStavba }>(`/Stavby/AdresniMisto/${ruianAddressCode}`)
    return result?.data ?? null
  }

  /** Detail stavby dle ID */
  async getStavbaDetail(stavbaId: number): Promise<CuzkStavba | null> {
    const result = await this.apiFetch<{ data: CuzkStavba }>(`/Stavby/${stavbaId}`)
    return result?.data ?? null
  }

  /** Detail jednotky dle ID */
  async getJednotkaDetail(jednotkaId: number): Promise<CuzkJednotka | null> {
    const result = await this.apiFetch<{ data: CuzkJednotka }>(`/Jednotky/${jednotkaId}`)
    return result?.data ?? null
  }

  /** Detail parcely dle ID */
  async getParcelaDetail(parcelaId: number): Promise<Record<string, unknown> | null> {
    const result = await this.apiFetch<{ data: Record<string, unknown> }>(`/Parcely/${parcelaId}`)
    return result?.data ?? null
  }

  /** Práva stavby — bezplatné přes API KN */
  async getPravaStavby(stavbaId: number): Promise<Record<string, unknown> | null> {
    const result = await this.apiFetch<{ data: Record<string, unknown> }>(`/PravaStavby/Stavba/${stavbaId}`)
    return result?.data ?? null
  }

  // TODO: WSDP SOAP endpoint — potřebuje separátní credentials + SOAP client
  // Vrací: vlastníci, podíly, typ vlastnictví, nabývací tituly
  // Cena: ~2 Kč/dotaz
  // Endpoint: wsdp.cuzk.cz/sestavy_v29.wsdl → dejNahledLV

  /** Stav účtu */
  async getAccountStatus(): Promise<{ provedenoVolani: number; limitVolani: number; expiraceApiKey: string } | null> {
    return this.apiFetch('/AplikacniSluzby/StavUctu')
  }
}

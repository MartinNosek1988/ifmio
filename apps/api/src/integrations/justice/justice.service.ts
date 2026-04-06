import { Injectable, Logger } from '@nestjs/common'
import * as cheerio from 'cheerio'
import type { JusticeEnrichmentData, JusticeDocument, JusticeHistoryEvent } from '@ifmio/shared-types'

export interface JusticeSubject {
  subjektId: string
  ico: string
  nazev: string
  spisovaZnacka?: string
  rejstrik?: string // "C", "S", "P", "B", "Dr"
  soud?: string
}

export interface RegistryChange {
  changeDate?: string
  changeType: string // "zápis", "změna", "výmaz"
  section?: string
  fileNumber?: string
  description?: string
}

export interface SbirkaDocument {
  documentId?: string
  documentName: string
  documentType: string // "ucetni_zaverka", "stanovy", "zakladatelska_listina", "notarsky_zapis", "other"
  filingDate?: string
  periodFrom?: string
  periodTo?: string
  downloadUrl?: string
}

const JUSTICE_BASE = 'https://or.justice.cz/ias/ui'
const TIMEOUT_MS = 10000
const RATE_LIMIT_DELAY = 1000 // 1 req/s

@Injectable()
export class JusticeService {
  private readonly logger = new Logger(JusticeService.name)
  private lastRequestTime = 0

  /**
   * Full enrichment: subject lookup + sbírka listin + registry history → JusticeEnrichmentData
   */
  async enrichByIco(ico: string): Promise<JusticeEnrichmentData | null> {
    const subject = await this.getSubjectByIco(ico)

    const result: JusticeEnrichmentData = {
      ico,
      rejstrik: 'NEZNAMY',
      sbirkaListin: [],
      historieCas: [],
      fetchedAt: new Date().toISOString(),
    }

    if (!subject) {
      this.logger.debug(`Justice.cz: no subject found for IČO ${ico}`)
      return result
    }

    result.spisovaZnacka = subject.spisovaZnacka
    result.rejstrik = this.mapRejstrik(subject.rejstrik)

    // Fetch sbírka listin + registry history in parallel
    const [docs, changes] = await Promise.allSettled([
      this.getDocumentList(subject.subjektId),
      this.getRegistryHistory(subject.subjektId),
    ])

    if (docs.status === 'fulfilled') {
      result.sbirkaListin = docs.value.map(d => this.mapToJusticeDocument(d))
    }

    if (changes.status === 'fulfilled') {
      result.historieCas = changes.value.map(c => ({
        datum: c.changeDate ?? '',
        typZmeny: c.changeType,
        popis: c.description ?? '',
      }))
    }

    return result
  }

  private mapRejstrik(rejstrik?: string): 'SVJ' | 'OR' | 'NEZNAMY' {
    if (!rejstrik) return 'NEZNAMY'
    if (rejstrik === 'S') return 'SVJ'
    if (['C', 'B', 'P', 'Dr'].includes(rejstrik)) return 'OR'
    return 'NEZNAMY'
  }

  private mapToJusticeDocument(doc: SbirkaDocument): JusticeDocument {
    const typMap: Record<string, JusticeDocument['typ']> = {
      stanovy: 'STANOVY',
      notarsky_zapis: 'NOTARSKY_ZAPIS',
      ucetni_zaverka: 'UCETNI_ZAVERKA',
      vyrocni_zprava: 'VYROCNI_ZPRAVA',
      zapis_shromazdeni: 'ZAPIS_SHROMAZDENI',
    }
    return {
      typ: typMap[doc.documentType] ?? 'JINE',
      datumPodani: doc.filingDate ?? '',
      nazev: doc.documentName,
      url: doc.downloadUrl,
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < RATE_LIMIT_DELAY) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY - elapsed))
    }
    this.lastRequestTime = Date.now()
  }

  /**
   * Find subject ID in Justice.cz OR by IČO
   */
  async getSubjectByIco(ico: string): Promise<JusticeSubject | null> {
    try {
      await this.rateLimit()
      const url = `${JUSTICE_BASE}/rejstrik-$firma?ico=${ico}&jenPlatne=PLATNE`
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'Accept': 'text/html', 'Accept-Language': 'cs' },
      })
      if (!res.ok) return null

      const html = await res.text()
      const $ = cheerio.load(html)

      // Extract subjektId from link like /ias/ui/rejstrik-firma.vysledky?subjektId=701502
      const link = $('a[href*="subjektId="]').first()
      if (!link.length) return null

      const href = link.attr('href') || ''
      const subjektIdMatch = href.match(/subjektId=(\d+)/)
      if (!subjektIdMatch) return null

      const subjektId = subjektIdMatch[1]
      const nazev = link.text().trim()

      // Try to extract spisová značka and rejstřík
      const row = link.closest('tr')
      const cells = row.find('td')
      let spisovaZnacka: string | undefined
      let rejstrik: string | undefined
      let soud: string | undefined

      cells.each((_i, cell) => {
        const text = $(cell).text().trim()
        // Spisová značka pattern: "C 12345" or "S 12345/MSPH"
        if (/^[CSPB]\s+\d+/.test(text)) {
          spisovaZnacka = text
          rejstrik = text.charAt(0)
        }
        // Court names
        if (/městský soud|krajský soud|okresní soud/i.test(text)) {
          soud = text
        }
      })

      return { subjektId, ico, nazev, spisovaZnacka, rejstrik, soud }
    } catch (err) {
      this.logger.debug(`Justice.cz subject lookup failed for IČO ${ico}: ${err}`)
      return null
    }
  }

  /**
   * Get OR history (zápisy/změny) for a subject
   */
  async getRegistryHistory(subjektId: string): Promise<RegistryChange[]> {
    const changes: RegistryChange[] = []
    try {
      await this.rateLimit()
      const url = `${JUSTICE_BASE}/vypis-sl-detail?dokument=subjekt&subjektId=${subjektId}`
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'Accept': 'text/html', 'Accept-Language': 'cs' },
      })
      if (!res.ok) return changes

      const html = await res.text()
      const $ = cheerio.load(html)

      // Parse history table rows
      // Justice.cz uses <div class="aunp-content"> or similar structure
      $('table.result-details tr, .aunp-content table tr').each((_i, row) => {
        const cells = $(row).find('td')
        if (cells.length < 2) return

        const dateText = $(cells[0]).text().trim()
        const descText = $(cells[1]).text().trim()
        if (!descText) return

        let changeType = 'změna'
        if (/zápis|zapsán|vznikl/i.test(descText)) changeType = 'zápis'
        else if (/výmaz|vymazán|zanikl/i.test(descText)) changeType = 'výmaz'

        const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
        const changeDate = dateMatch
          ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
          : undefined

        changes.push({
          changeDate,
          changeType,
          description: descText.slice(0, 2000),
        })
      })

      // Also try the "Výpis platných" page for structured data
      if (changes.length === 0) {
        await this.rateLimit()
        const vpUrl = `${JUSTICE_BASE}/vypis-sl-firma?subjektId=${subjektId}`
        const vpRes = await fetch(vpUrl, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'Accept': 'text/html', 'Accept-Language': 'cs' },
        })
        if (vpRes.ok) {
          const vpHtml = await vpRes.text()
          const $vp = cheerio.load(vpHtml)

          $vp('.vp-cell, .aunp-udaj').each((_i, el) => {
            const label = $vp(el).find('.vp-label, .aunp-popisek').text().trim()
            const value = $vp(el).find('.vp-value, .aunp-udajHodnota').text().trim()
            if (label && value) {
              changes.push({
                changeType: 'zápis',
                description: `${label}: ${value}`.slice(0, 2000),
              })
            }
          })
        }
      }
    } catch (err) {
      this.logger.debug(`Justice.cz registry history failed for ${subjektId}: ${err}`)
    }
    return changes.slice(0, 50)
  }

  /**
   * Get Sbírka listin (document collection) for a subject
   */
  async getDocumentList(subjektId: string): Promise<SbirkaDocument[]> {
    const docs: SbirkaDocument[] = []
    try {
      await this.rateLimit()
      const url = `${JUSTICE_BASE}/vypis-sl-detail?dokument=sbirkaListin&subjektId=${subjektId}`
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'Accept': 'text/html', 'Accept-Language': 'cs' },
      })
      if (!res.ok) return docs

      const html = await res.text()
      const $ = cheerio.load(html)

      // Parse Sbírka listin table
      $('table tr, .aunp-content tr').each((_i, row) => {
        const cells = $(row).find('td')
        if (cells.length < 2) return

        const name = $(cells[0]).text().trim()
        if (!name) return

        const dateText = cells.length >= 3 ? $(cells[2]).text().trim() : ''
        const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
        const filingDate = dateMatch
          ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
          : undefined

        // Classify document type
        const docType = this.classifyDocument(name)

        // Extract download link if available
        const link = $(row).find('a[href*="pdf"], a[href*="dokument"]').first()
        const downloadUrl = link.length ? this.resolveUrl(link.attr('href') || '') : undefined

        // Extract period from name (e.g. "Účetní závěrka za rok 2023" or "2022-2023")
        const periodMatch = name.match(/(\d{4})\s*[-–]\s*(\d{4})/) || name.match(/za rok\s+(\d{4})/)
        let periodFrom: string | undefined
        let periodTo: string | undefined
        if (periodMatch) {
          if (periodMatch[2]) {
            periodFrom = `${periodMatch[1]}-01-01`
            periodTo = `${periodMatch[2]}-12-31`
          } else {
            periodFrom = `${periodMatch[1]}-01-01`
            periodTo = `${periodMatch[1]}-12-31`
          }
        }

        // Extract document ID from link href
        const docIdMatch = (link.attr('href') || '').match(/id=(\d+)/)

        docs.push({
          documentId: docIdMatch ? docIdMatch[1] : undefined,
          documentName: name.slice(0, 500),
          documentType: docType,
          filingDate,
          periodFrom,
          periodTo,
          downloadUrl,
        })
      })
    } catch (err) {
      this.logger.debug(`Justice.cz Sbírka listin failed for ${subjektId}: ${err}`)
    }
    return docs.slice(0, 100)
  }

  private classifyDocument(name: string): string {
    const lower = name.toLowerCase()
    if (/účetní závěrk|uzávěrk|rozvah|výsledovk|přílo.*účet/i.test(lower)) return 'ucetni_zaverka'
    if (/stanov/i.test(lower)) return 'stanovy'
    if (/zakladatels/i.test(lower)) return 'zakladatelska_listina'
    if (/notářsk/i.test(lower)) return 'notarsky_zapis'
    if (/výročn/i.test(lower)) return 'vyrocni_zprava'
    if (/zápis.*shromážděn|shromáždění.*zápis/i.test(lower)) return 'zapis_shromazdeni'
    if (/zněn.*společens|prohlášen.*vlastník/i.test(lower)) return 'prohlaseni_vlastniku'
    return 'other'
  }

  private resolveUrl(href: string): string {
    if (href.startsWith('http')) return href
    if (href.startsWith('/')) return `https://or.justice.cz${href}`
    return `${JUSTICE_BASE}/${href}`
  }
}

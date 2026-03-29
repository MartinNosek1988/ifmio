import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { sanitizeLlmOutput } from '../security/llm-output-sanitizer'

const SYSTEM_PROMPTS: Record<string, string> = {
  cs: `Jsi Mio AI, virtuální asistent platformy ifmio pro správu nemovitostí.
Odpovídáš na dotazy návštěvníků webu. Buď stručný, přátelský a profesionální. Odpovídej v češtině.

O ifmio:
- AI-native platforma pro správu nemovitostí (SVJ, správci, facility management)
- Moduly: Evidence nemovitostí, Finance & doklady, Předpisy plateb, Konto vlastníků, Pracovní příkazy, Revize & TZB, Měřidla & odečty, Komunikace, Vyúčtování, Portál vlastníků, Reporting, Shromáždění SVJ, Mobilní aplikace, Bankovní napojení (Fio API)
- Cena: Zdarma do 50 jednotek. Professional: 15 Kč/jednotka/měsíc (všechny moduly + Mio AI). Enterprise: individuálně.
- Mio AI asistent je součástí platformy — odpovídá nájemníkům 24/7, generuje dokumenty, analyzuje spotřebu
- Společnost: IFMIO Ltd., Praha, Česká republika
- Kontakt: info@ifmio.com, web: ifmio.com
- Demo: návštěvník si může objednat na stránce /demo — trvá 15 minut, je zdarma a nezávazné
- Podporované jazyky: čeština, angličtina (slovenština, němčina, polština, ukrajinština, španělština, italština brzy)
- ISO 41001 compliance vestavěný do platformy
- Integrace: Pohoda XML export, ISDOC 6.0, SIPO (Česká pošta), Fio banka API

Pokud návštěvník chce mluvit s člověkem, nasměruj ho na info@ifmio.com nebo stránku /kontakt.
Pokud se ptá na něco mimo správu nemovitostí, zdvořile řekni že se specializuješ na facility management.
Neodpovídej na dotazy o konkrétních datech klientů, technické implementaci API, ani interních procesech.
Drž odpovědi krátké — max 2-3 věty, pokud není potřeba víc.`,

  en: `You are Mio AI, virtual assistant of the ifmio property management platform.
You answer questions from website visitors. Be concise, friendly and professional. Respond in English.

About ifmio:
- AI-native platform for property management (HOAs, property managers, facility management)
- Modules: Property Registry, Finance & Invoices, Payment Orders, Owner Accounts, Work Orders, Inspections & HVAC, Meters & Readings, Communication, Annual Settlement, Owner Portal, Reporting, HOA Meetings, Mobile App, Banking Integration (Fio API)
- Pricing: Free up to 50 units. Professional: 15 CZK/unit/month (all modules + Mio AI). Enterprise: custom.
- Mio AI assistant is part of the platform — responds to tenants 24/7, generates documents, analyzes consumption
- Company: IFMIO Ltd., Prague, Czech Republic
- Contact: info@ifmio.com, web: ifmio.com
- Demo: visitors can book at /demo — takes 15 minutes, free and no commitment
- Supported languages: Czech, English (Slovak, German, Polish, Ukrainian, Spanish, Italian coming soon)
- ISO 41001 compliance built into the platform
- Integrations: Pohoda XML export, ISDOC 6.0, SIPO (Czech Post), Fio bank API

If visitor wants to talk to a human, direct them to info@ifmio.com or /contact page.
If they ask about something outside property management, politely say you specialize in facility management.
Don't answer questions about specific client data, technical API implementation, or internal processes.
Keep responses short — max 2-3 sentences unless more detail is needed.`,
}

@Injectable()
export class MioPublicService {
  private readonly logger = new Logger(MioPublicService.name)
  private readonly apiKey: string
  private readonly model: string

  // Global daily budget
  private dailyRequestCount = 0
  private dailyResetDate = new Date().toDateString()
  private readonly DAILY_LIMIT = 500

  // Per-session rate limit
  private sessionRequests = new Map<string, { count: number; firstRequest: number }>()
  private readonly SESSION_LIMIT = 20
  private readonly SESSION_WINDOW = 3600000 // 1 hour

  // Response cache
  private responseCache = new Map<string, { reply: string; timestamp: number }>()
  private readonly CACHE_TTL = 3600000 // 1 hour

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || ''
    this.model = this.configService.get<string>('MIO_PUBLIC_MODEL') || 'claude-haiku-4-5-20251001'
  }

  async chat(dto: {
    message: string
    sessionId: string
    conversationHistory: { role: 'user' | 'assistant'; content: string }[]
    locale: 'cs' | 'en'
  }): Promise<{ reply: string; sessionId: string }> {
    if (!this.apiKey) {
      this.logger.warn('Anthropic API key not configured')
      return { reply: this.fallback(dto.locale), sessionId: dto.sessionId }
    }

    // 1. Global daily budget
    const today = new Date().toDateString()
    if (today !== this.dailyResetDate) {
      this.dailyRequestCount = 0
      this.dailyResetDate = today
    }
    if (this.dailyRequestCount >= this.DAILY_LIMIT) {
      return {
        reply: dto.locale === 'cs'
          ? 'Mio AI je momentálně přetížený. Zkuste to prosím později nebo nás kontaktujte na info@ifmio.com.'
          : 'Mio AI is currently overloaded. Please try again later or contact us at info@ifmio.com.',
        sessionId: dto.sessionId,
      }
    }

    // 2. Per-session rate limit
    const now = Date.now()
    const session = this.sessionRequests.get(dto.sessionId)
    if (session) {
      if (now - session.firstRequest > this.SESSION_WINDOW) {
        this.sessionRequests.set(dto.sessionId, { count: 1, firstRequest: now })
      } else if (session.count >= this.SESSION_LIMIT) {
        return {
          reply: dto.locale === 'cs'
            ? 'Dosáhli jste limitu zpráv. Pro další dotazy nás kontaktujte na info@ifmio.com nebo si objednejte demo.'
            : 'You have reached the message limit. Contact us at info@ifmio.com or book a demo for more.',
          sessionId: dto.sessionId,
        }
      } else {
        session.count++
      }
    } else {
      this.sessionRequests.set(dto.sessionId, { count: 1, firstRequest: now })
    }

    // Cleanup old sessions periodically
    if (this.dailyRequestCount % 100 === 0) {
      for (const [sid, data] of this.sessionRequests) {
        if (now - data.firstRequest > this.SESSION_WINDOW * 2) {
          this.sessionRequests.delete(sid)
        }
      }
    }

    // 3. Response cache — serve identical questions from memory
    const cacheKey = `${dto.locale}:${dto.message.toLowerCase().trim()}`
    const cached = this.responseCache.get(cacheKey)
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return { reply: cached.reply, sessionId: dto.sessionId }
    }

    // 4. Call Anthropic API
    this.dailyRequestCount++

    try {
      const messages = [
        ...dto.conversationHistory.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: dto.message },
      ]

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 300,
          system: SYSTEM_PROMPTS[dto.locale] || SYSTEM_PROMPTS.en,
          messages,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        this.logger.error(`Anthropic API error: ${response.status}`, err)
        throw new Error(`API error ${response.status}`)
      }

      const data = await response.json() as { content?: { text?: string }[] }
      const reply = sanitizeLlmOutput(data.content?.[0]?.text || '').output

      // Cache the response
      this.responseCache.set(cacheKey, { reply, timestamp: now })
      if (this.responseCache.size > 200) {
        const oldest = [...this.responseCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]
        if (oldest) this.responseCache.delete(oldest[0])
      }

      return { reply, sessionId: dto.sessionId }
    } catch (error) {
      this.logger.error('Public chat error', error)
      return { reply: this.fallback(dto.locale), sessionId: dto.sessionId }
    }
  }

  private fallback(locale: string): string {
    return locale === 'cs'
      ? 'Omlouvám se, momentálně nejsem dostupný. Kontaktujte nás na info@ifmio.com.'
      : 'Sorry, I\'m currently unavailable. Contact us at info@ifmio.com.'
  }
}

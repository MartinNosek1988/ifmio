import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { AuthUser } from '@ifmio/shared-types'

const SYSTEM_PROMPT = `Jsi Mio, profesionální AI asistent pro facility management platformu ifmio.
Odpovídáš v češtině, stručně a prakticky.
Pomáháš správcům nemovitostí, dispečerům a technikům s provozními otázkami.
Znáš kontext facility managementu: helpdesk požadavky, pracovní úkoly, zařízení, revize, protokoly, dokumenty.
Neodpovídáš na otázky mimo oblast FM a správy nemovitostí.
Buď profesionální, ale přátelský.`

@Injectable()
export class MioService {
  private readonly logger = new Logger(MioService.name)
  private client: Anthropic | null = null

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')
    if (apiKey) {
      this.client = new Anthropic({ apiKey })
      this.logger.log('Mio AI enabled')
    } else {
      this.logger.warn('Mio AI disabled — ANTHROPIC_API_KEY not set')
    }
  }

  async chat(user: AuthUser, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    if (!this.client) {
      return 'AI asistent není momentálně k dispozici. Kontaktujte administrátora.'
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      })

      const textBlock = response.content.find(b => b.type === 'text')
      return textBlock?.text ?? 'Omlouvám se, nepodařilo se vygenerovat odpověď.'
    } catch (err) {
      this.logger.error(`Mio chat failed for user ${user.id}: ${err}`)
      return 'Omlouvám se, došlo k chybě. Zkuste to prosím znovu.'
    }
  }
}

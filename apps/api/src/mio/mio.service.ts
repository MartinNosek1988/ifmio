import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { AuthUser } from '@ifmio/shared-types'
import { HelpdeskService } from '../helpdesk/helpdesk.service'
import { WorkOrdersService } from '../work-orders/work-orders.service'
import { DashboardService } from '../dashboard/dashboard.service'
import { RecurringPlansService } from '../recurring-plans/recurring-plans.service'

const SYSTEM_PROMPT = `Jsi Mio, profesionální AI asistent pro facility management platformu ifmio.
Odpovídáš v češtině, stručně a prakticky.
Pomáháš správcům nemovitostí, dispečerům a technikům s provozními otázkami.
Máš přístup k reálným provozním datům uživatele přes nástroje (tools).
Když se uživatel ptá na data z aplikace, VŽDY použij odpovídající nástroj — nehádej a nevymýšlej.
Pokud nástroj vrátí prázdný výsledek, řekni to přímo.
Pokud se dotaz netýká FM/správy nemovitostí, odmítni odpovědět.
Buď stručný, praktický a profesionální.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'dashboard_summary',
    description: 'Vrátí provozní přehled: otevřené požadavky, úkoly, po termínu, opakované, revize, protokoly. Použij pro obecné "co se děje" otázky.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'my_agenda',
    description: 'Vrátí dnešní agendu přihlášeného uživatele: dnešní úkoly, po termínu, prioritní požadavky.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'helpdesk_list',
    description: 'Hledá helpdesk požadavky s filtry. Použij pro otázky na požadavky, tickety, helpdesk.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'open, in_progress, resolved, closed', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        requestOrigin: { type: 'string', description: 'manual nebo recurring_plan', enum: ['manual', 'recurring_plan'] },
        overdue: { type: 'string', description: 'true pro požadavky po termínu', enum: ['true'] },
        search: { type: 'string', description: 'hledání v názvu/popisu' },
        limit: { type: 'number', description: 'max počet výsledků (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'helpdesk_stats',
    description: 'Vrátí SLA statistiky helpdesku: celkem otevřených, po termínu, eskalovaných, blízko termínu.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'workorders_list',
    description: 'Hledá pracovní úkoly s filtry.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['nova', 'v_reseni', 'vyresena', 'uzavrena', 'zrusena'] },
        priority: { type: 'string', enum: ['nizka', 'normalni', 'vysoka', 'kriticka'] },
        search: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'recurring_plans_list',
    description: 'Vrátí seznam opakovaných plánů/činností. Použij pro otázky na opakované/plánované činnosti.',
    input_schema: {
      type: 'object' as const,
      properties: {
        assetId: { type: 'string', description: 'ID zařízení pro filtrování' },
        isActive: { type: 'string', enum: ['true', 'false'] },
      },
      required: [],
    },
  },
]

@Injectable()
export class MioService {
  private readonly logger = new Logger(MioService.name)
  private client: Anthropic | null = null

  constructor(
    private config: ConfigService,
    private helpdesk: HelpdeskService,
    private workOrders: WorkOrdersService,
    private dashboard: DashboardService,
    private recurringPlans: RecurringPlansService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')
    if (apiKey) {
      this.client = new Anthropic({ apiKey })
      this.logger.log('Mio AI enabled with tool calling')
    } else {
      this.logger.warn('Mio AI disabled — ANTHROPIC_API_KEY not set')
    }
  }

  async chat(user: AuthUser, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    if (!this.client) {
      return 'AI asistent není momentálně k dispozici. Kontaktujte administrátora.'
    }

    try {
      const apiMessages: Anthropic.MessageParam[] = messages.map(m => ({
        role: m.role, content: m.content,
      }))

      // Tool-calling loop (max 5 iterations)
      let response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: apiMessages,
      })

      let iterations = 0
      while (response.stop_reason === 'tool_use' && iterations < 5) {
        iterations++

        // Collect tool calls and results
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
        const toolResults: Anthropic.MessageParam = {
          role: 'user',
          content: await Promise.all(
            toolUseBlocks.map(async (block) => {
              if (block.type !== 'tool_use') return { type: 'text' as const, text: '' }
              const result = await this.executeTool(user, block.name, block.input as Record<string, unknown>)
              return {
                type: 'tool_result' as const,
                tool_use_id: block.id,
                content: JSON.stringify(result),
              }
            }),
          ),
        }

        // Continue conversation with tool results
        apiMessages.push(
          { role: 'assistant', content: response.content },
          toolResults,
        )

        response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: apiMessages,
        })
      }

      const textBlock = response.content.find(b => b.type === 'text')
      return textBlock?.text ?? 'Omlouvám se, nepodařilo se vygenerovat odpověď.'
    } catch (err) {
      this.logger.error(`Mio chat failed for user ${user.id}: ${err}`)
      return 'Omlouvám se, došlo k chybě. Zkuste to prosím znovu.'
    }
  }

  private async executeTool(user: AuthUser, toolName: string, input: Record<string, unknown>): Promise<unknown> {
    const start = Date.now()
    try {
      const result = await this.runTool(user, toolName, input)
      this.logger.log(`Mio tool ${toolName} for user ${user.id} [${Date.now() - start}ms]`)
      return result
    } catch (err) {
      this.logger.error(`Mio tool ${toolName} failed for user ${user.id}: ${err}`)
      return { error: true, message: `Nepodařilo se načíst data (${toolName}).` }
    }
  }

  private async runTool(user: AuthUser, toolName: string, input: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'dashboard_summary': {
        const d = await this.dashboard.getOperationalDashboard(user)
        return {
          attention: d.attention,
          workload: d.workload,
          period: d.period,
          recentTickets: d.recentTickets.slice(0, 5).map(t => ({
            code: `HD-${String((t as any).number).padStart(4, '0')}`,
            title: (t as any).title,
            status: (t as any).status,
            priority: (t as any).priority,
            property: (t as any).propertyName,
          })),
          recentWorkOrders: d.recentWorkOrders.slice(0, 5).map(w => ({
            title: (w as any).title,
            status: (w as any).status,
            priority: (w as any).priority,
            property: (w as any).propertyName,
            asset: (w as any).assetName,
          })),
        }
      }

      case 'my_agenda': {
        const a = await this.workOrders.getMyAgenda(user)
        return {
          counts: a.counts,
          todayWo: a.today.slice(0, 10).map(w => ({
            title: (w as any).title, status: (w as any).status,
            property: (w as any).property?.name, asset: (w as any).asset?.name,
            deadline: (w as any).deadline,
          })),
          overdueWo: a.overdue.slice(0, 10).map(w => ({
            title: (w as any).title, status: (w as any).status,
            property: (w as any).property?.name, deadline: (w as any).deadline,
          })),
          highPrioTickets: a.highPrioTickets.slice(0, 5),
          overdueTickets: a.overdueTickets.slice(0, 5),
        }
      }

      case 'helpdesk_list': {
        const limit = Math.min(Number(input.limit) || 10, 20)
        const result = await this.helpdesk.listTickets(user, {
          status: input.status as string,
          priority: input.priority as string,
          requestOrigin: input.requestOrigin as string,
          overdue: input.overdue as string,
          search: input.search as string,
          limit,
          page: 1,
        })
        return {
          total: result.total,
          showing: result.data.length,
          tickets: result.data.map(t => ({
            code: `HD-${String((t as any).number).padStart(4, '0')}`,
            title: (t as any).title,
            status: (t as any).status,
            priority: (t as any).priority,
            property: (t as any).property?.name ?? null,
            asset: (t as any).asset?.name ?? null,
            assignee: (t as any).assignee?.name ?? null,
            origin: (t as any).requestOrigin ?? 'manual',
            dueAt: (t as any).resolutionDueAt ?? null,
            createdAt: (t as any).createdAt,
          })),
        }
      }

      case 'helpdesk_stats': {
        return await this.helpdesk.getSlaStats(user)
      }

      case 'workorders_list': {
        const items = await this.workOrders.list(user, {
          status: input.status as string,
          priority: input.priority as string,
          search: input.search as string,
        })
        const limited = items.slice(0, 15)
        return {
          total: items.length,
          showing: limited.length,
          workOrders: limited.map(w => ({
            title: (w as any).title,
            status: (w as any).status,
            priority: (w as any).priority,
            property: (w as any).property?.name ?? null,
            asset: (w as any).asset?.name ?? null,
            assignee: (w as any).assigneeUser?.name ?? (w as any).assignee ?? null,
            deadline: (w as any).deadline ?? null,
          })),
        }
      }

      case 'recurring_plans_list': {
        const plans = await this.recurringPlans.list(user, {
          assetId: input.assetId as string,
          isActive: input.isActive as string,
        })
        return {
          total: plans.length,
          plans: plans.slice(0, 15).map(p => ({
            title: (p as any).title,
            mode: (p as any).scheduleMode,
            frequency: `${(p as any).frequencyInterval}x ${(p as any).frequencyUnit}`,
            isActive: (p as any).isActive,
            nextPlannedAt: (p as any).nextPlannedAt,
            lastCompletedAt: (p as any).lastCompletedAt,
            asset: (p as any).asset?.name ?? null,
            property: (p as any).property?.name ?? null,
            generatedCount: (p as any)._count?.generatedTickets ?? 0,
          })),
        }
      }

      default:
        return { error: true, message: `Neznámý nástroj: ${toolName}` }
    }
  }
}

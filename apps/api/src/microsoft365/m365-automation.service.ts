import { Injectable, Logger } from '@nestjs/common'
import { TeamsService } from './teams.service'
import { PlannerService } from './planner.service'
import { M365CalendarService } from './calendar.service'
import { SharePointService } from './sharepoint.service'

interface M365Config {
  teamsWebhookUrl: string | null
  plannerPlanId: string | null
  plannerTicketBucketId: string | null
  calendarUserId: string | null
  sharepointDriveId: string | null
}

@Injectable()
export class M365AutomationService {
  private readonly logger = new Logger(M365AutomationService.name)

  constructor(
    private teams: TeamsService,
    private planner: PlannerService,
    private calendar: M365CalendarService,
    private sharepoint: SharePointService,
  ) {}

  async onTicketCreated(ticket: {
    number: number; title: string; category: string; propertyName: string; unitName?: string
  }): Promise<void> {
    const config = this.getConfig()
    if (!config) return

    if (config.teamsWebhookUrl) {
      await this.teams.sendWebhookMessage(config.teamsWebhookUrl, `Nový ticket #${ticket.number}: ${ticket.title}\nNemovitost: ${ticket.propertyName}`, '🎫 Nový helpdesk požadavek')
        .catch(err => this.logger.error(`Teams ticket notify failed: ${err.message}`))
    }

    if (config.plannerPlanId) {
      await this.planner.createTask({
        planId: config.plannerPlanId,
        bucketId: config.plannerTicketBucketId ?? undefined,
        title: `#${ticket.number} ${ticket.title}`,
        description: `Nemovitost: ${ticket.propertyName}\nJednotka: ${ticket.unitName ?? '—'}\nKategorie: ${ticket.category}`,
        priority: 5,
      }).catch(err => this.logger.error(`Planner task failed: ${err.message}`))
    }
  }

  async onWorkOrderScheduled(wo: {
    title: string; propertyName: string; scheduledStart: Date; scheduledEnd: Date; assigneeEmail?: string
  }): Promise<void> {
    const config = this.getConfig()
    if (!config) return

    if (config.teamsWebhookUrl) {
      const dateStr = wo.scheduledStart.toLocaleDateString('cs-CZ')
      const timeStr = wo.scheduledStart.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
      await this.teams.sendWebhookMessage(config.teamsWebhookUrl, `Naplánováno: ${wo.title}\nMísto: ${wo.propertyName}\nTermín: ${dateStr} ${timeStr}`, '🔧 Pracovní příkaz')
        .catch(err => this.logger.error(`Teams WO notify failed: ${err.message}`))
    }

    if (config.calendarUserId && wo.assigneeEmail) {
      await this.calendar.createEvent({
        userId: config.calendarUserId,
        subject: `WO: ${wo.title}`,
        body: `<p>Nemovitost: ${wo.propertyName}</p>`,
        startDateTime: wo.scheduledStart,
        endDateTime: wo.scheduledEnd,
        location: wo.propertyName,
        attendees: [{ email: wo.assigneeEmail }],
      }).catch(err => this.logger.error(`Calendar event failed: ${err.message}`))
    }
  }

  async onDocumentUploaded(doc: {
    fileName: string; fileBuffer: Buffer; contentType: string; propertyName: string; category?: string
  }): Promise<void> {
    const config = this.getConfig()
    if (!config?.sharepointDriveId) return

    await this.sharepoint.uploadFile({
      driveId: config.sharepointDriveId,
      folderPath: `/ifmio/${doc.propertyName}/${doc.category || 'Ostatní'}`,
      fileName: doc.fileName,
      fileBuffer: doc.fileBuffer,
      contentType: doc.contentType,
    }).catch(err => this.logger.error(`SharePoint upload failed: ${err.message}`))
  }

  async onOverduePayments(alert: { propertyName: string; count: number; totalAmount: number }): Promise<void> {
    const config = this.getConfig()
    if (!config?.teamsWebhookUrl) return

    await this.teams.sendWebhookMessage(
      config.teamsWebhookUrl,
      `Nedoplatky: ${alert.propertyName} — ${alert.count}×, celkem ${alert.totalAmount.toLocaleString('cs-CZ')} Kč`,
      '💰 Upozornění na nedoplatky',
    ).catch(err => this.logger.error(`Teams payment alert failed: ${err.message}`))
  }

  private getConfig(): M365Config | null {
    if (!process.env.M365_TEAMS_WEBHOOK_URL && !process.env.M365_CLIENT_ID) return null
    return {
      teamsWebhookUrl: process.env.M365_TEAMS_WEBHOOK_URL || null,
      plannerPlanId: process.env.M365_PLANNER_PLAN_ID || null,
      plannerTicketBucketId: process.env.M365_PLANNER_TICKET_BUCKET_ID || null,
      calendarUserId: process.env.M365_CALENDAR_USER_ID || null,
      sharepointDriveId: process.env.M365_SHAREPOINT_DRIVE_ID || null,
    }
  }
}

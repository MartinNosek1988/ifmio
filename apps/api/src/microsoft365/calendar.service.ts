import { Injectable, Logger } from '@nestjs/common'
import { GraphAuthService } from './graph-auth.service'

@Injectable()
export class M365CalendarService {
  private readonly logger = new Logger(M365CalendarService.name)

  constructor(private graphAuth: GraphAuthService) {}

  async createEvent(params: {
    userId: string
    subject: string
    body?: string
    startDateTime: Date
    endDateTime: Date
    location?: string
    attendees?: Array<{ email: string; name?: string }>
    reminderMinutes?: number
  }): Promise<{ success: boolean; eventId?: string; error?: string }> {
    if (!this.graphAuth.isConfigured()) return { success: false, error: 'M365 není nakonfigurován' }

    try {
      const event: Record<string, unknown> = {
        subject: params.subject,
        start: { dateTime: params.startDateTime.toISOString(), timeZone: 'Europe/Prague' },
        end: { dateTime: params.endDateTime.toISOString(), timeZone: 'Europe/Prague' },
        reminderMinutesBeforeStart: params.reminderMinutes ?? 15,
      }
      if (params.body) event.body = { contentType: 'HTML', content: params.body }
      if (params.location) event.location = { displayName: params.location }
      if (params.attendees?.length) {
        event.attendees = params.attendees.map(a => ({
          emailAddress: { address: a.email, name: a.name || a.email }, type: 'required',
        }))
      }

      const result = await this.graphAuth.graphRequest('POST', `/users/${params.userId}/events`, event)
      return { success: true, eventId: result?.id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async cancelEvent(userId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.graphAuth.graphRequest('DELETE', `/users/${userId}/events/${eventId}`)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

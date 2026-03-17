import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class GraphAuthService {
  private readonly logger = new Logger(GraphAuthService.name)
  private accessToken: string | null = null
  private tokenExpiresAt = 0

  private get clientId() { return process.env.M365_CLIENT_ID || '' }
  private get clientSecret() { return process.env.M365_CLIENT_SECRET || '' }
  private get tenantId() { return process.env.M365_TENANT_ID || '' }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.tenantId)
  }

  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken
    }

    const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      this.logger.error(`Graph auth failed: ${err.slice(0, 200)}`)
      throw new Error('Microsoft 365 authentication failed')
    }

    const data = await res.json() as { access_token: string; expires_in: number }
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000
    return this.accessToken
  }

  async graphRequest(method: string, endpoint: string, body?: unknown): Promise<any> {
    const token = await this.getToken()
    const url = `https://graph.microsoft.com/v1.0${endpoint}`

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      const err = await res.text()
      this.logger.error(`Graph ${method} ${endpoint}: ${res.status} ${err.slice(0, 200)}`)
      throw new Error(`Graph API error: ${res.status}`)
    }

    if (res.status === 204) return null
    return res.json()
  }
}

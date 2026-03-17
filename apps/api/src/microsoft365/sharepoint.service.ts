import { Injectable, Logger } from '@nestjs/common'
import { GraphAuthService } from './graph-auth.service'

@Injectable()
export class SharePointService {
  private readonly logger = new Logger(SharePointService.name)

  constructor(private graphAuth: GraphAuthService) {}

  async uploadFile(params: {
    driveId: string
    folderPath: string
    fileName: string
    fileBuffer: Buffer
    contentType: string
  }): Promise<{ success: boolean; fileId?: string; webUrl?: string; error?: string }> {
    if (!this.graphAuth.isConfigured()) return { success: false, error: 'M365 není nakonfigurován' }

    try {
      const token = await this.graphAuth.getToken()
      const encodedPath = encodeURIComponent(`${params.folderPath}/${params.fileName}`).replace(/%2F/g, '/')
      const url = `https://graph.microsoft.com/v1.0/drives/${params.driveId}/root:${encodedPath}:/content`

      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': params.contentType },
        body: new Uint8Array(params.fileBuffer),
      })

      if (!res.ok) {
        const err = await res.text()
        return { success: false, error: `Upload: ${res.status} ${err.slice(0, 100)}` }
      }

      const result = await res.json() as { id: string; webUrl: string }
      return { success: true, fileId: result.id, webUrl: result.webUrl }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async createFolder(driveId: string, parentPath: string, folderName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.graphAuth.graphRequest('POST', `/drives/${driveId}/root:${parentPath}:/children`, {
        name: folderName, folder: {}, '@microsoft.graph.conflictBehavior': 'replace',
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

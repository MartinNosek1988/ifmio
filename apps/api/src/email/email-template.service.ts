import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { DEFAULT_TEMPLATES, type DefaultTemplate } from './email-template.defaults'

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name)

  constructor(private prisma: PrismaService) {}

  getDefaults(): DefaultTemplate[] {
    return DEFAULT_TEMPLATES
  }

  getDefault(code: string): DefaultTemplate | undefined {
    return DEFAULT_TEMPLATES.find(t => t.code === code)
  }

  async getTemplate(tenantId: string, code: string): Promise<{ subject: string; body: string }> {
    // Try tenant-specific first
    const custom = await this.prisma.emailTemplate.findUnique({
      where: { tenantId_code: { tenantId, code } },
    })
    if (custom) return { subject: custom.subject, body: custom.body }

    // Fall back to default
    const def = this.getDefault(code)
    if (def) return { subject: def.subject, body: def.body }

    this.logger.warn(`Email template '${code}' not found for tenant ${tenantId}`)
    return { subject: `[ifmio] ${code}`, body: '' }
  }

  async renderTemplate(tenantId: string | null, code: string, variables: Record<string, string>): Promise<{ subject: string; body: string }> {
    const template = tenantId ? await this.getTemplate(tenantId, code) : (() => { const d = this.getDefault(code); return d ? { subject: d.subject, body: d.body } : { subject: '', body: '' } })()
    return {
      subject: this.interpolate(template.subject, variables),
      body: this.interpolate(template.body, variables),
    }
  }

  async listTemplates(tenantId: string) {
    const customs = await this.prisma.emailTemplate.findMany({
      where: { tenantId },
    })
    const customMap = new Map(customs.map(c => [c.code, c]))

    return DEFAULT_TEMPLATES.map(def => {
      const custom = customMap.get(def.code)
      return {
        code: def.code,
        label: def.label,
        subject: custom?.subject ?? def.subject,
        body: custom?.body ?? def.body,
        isCustom: custom?.isCustom ?? false,
        placeholders: def.placeholders,
        updatedAt: custom?.updatedAt ?? null,
      }
    })
  }

  async saveTemplate(tenantId: string, code: string, subject: string, body: string) {
    return this.prisma.emailTemplate.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: { tenantId, code, subject, body, isCustom: true },
      update: { subject, body, isCustom: true },
    })
  }

  async resetTemplate(tenantId: string, code: string) {
    await this.prisma.emailTemplate.deleteMany({
      where: { tenantId, code },
    })
    return { reset: true }
  }

  async previewTemplate(tenantId: string, code: string) {
    const template = await this.getTemplate(tenantId, code)
    const def = this.getDefault(code)
    const sampleData: Record<string, string> = {}
    for (const p of def?.placeholders ?? []) {
      sampleData[p] = `[${p}]`
    }
    return {
      subject: this.interpolate(template.subject, sampleData),
      body: this.interpolate(template.body, sampleData),
    }
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`)
  }
}

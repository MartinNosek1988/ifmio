import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common'
import { PrismaService }       from '../prisma/prisma.service'
import { LocalStorageProvider } from './storage/local.storage'
import * as path               from 'path'
import * as crypto             from 'crypto'
import type { AuthUser }       from '@ifmio/shared-types'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

@Injectable()
export class DocumentsService {
  constructor(
    private prisma:   PrismaService,
    private storage:  LocalStorageProvider,
  ) {}

  async list(user: AuthUser, query: { category?: string; tag?: string; entityType?: string; entityId?: string; search?: string; page?: number; limit?: number }) {
    const { category, tag, entityType, entityId, search, page = 1, limit = 20 } = query
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...(category ? { category } : {}),
      ...(search   ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(tag      ? { tags:  { some: { tag } } } : {}),
      ...(entityType && entityId ? {
        links: { some: { entityType, entityId } },
      } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip,
        include: {
          tags:      true,
          links:     true,
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ])

    return {
      data: items.map((d) => ({
        ...d,
        url:       this.storage.getUrl(d.storageKey),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getStats(user: AuthUser) {
    const tenantId = user.tenantId
    const [total, contract, invoice, protocol, photo, plan, regulation] = await Promise.all([
      this.prisma.document.count({ where: { tenantId } }),
      this.prisma.document.count({ where: { tenantId, category: 'contract' } }),
      this.prisma.document.count({ where: { tenantId, category: 'invoice' } }),
      this.prisma.document.count({ where: { tenantId, category: 'protocol' } }),
      this.prisma.document.count({ where: { tenantId, category: 'photo' } }),
      this.prisma.document.count({ where: { tenantId, category: 'plan' } }),
      this.prisma.document.count({ where: { tenantId, category: 'regulation' } }),
    ])
    return { total, contract, invoice, protocol, photo, plan, regulation }
  }

  async upload(
    user: AuthUser,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: {
      name?:        string
      category?:    string
      description?: string
      tags?:        string[]
      entityType?:  string
      entityId?:    string
    },
  ) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Nepodporovaný typ souboru: ${file.mimetype}`)
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Soubor je příliš velký (max 20 MB)')
    }

    const ext       = path.extname(file.originalname)
    const key       = `${user.tenantId}/${crypto.randomUUID()}${ext}`
    const stored    = await this.storage.save(file.buffer, key, file.mimetype)

    const document = await this.prisma.document.create({
      data: {
        tenantId:    user.tenantId,
        name:        meta.name ?? file.originalname,
        originalName: file.originalname,
        mimeType:    file.mimetype,
        size:        file.size,
        storageKey:  key,
        storageType: 'local',
        category:    (meta.category as any) ?? 'other',
        description: meta.description ?? null,
        createdById: user.id,
        tags: meta.tags?.length ? {
          create: meta.tags.map((tag) => ({ tag })),
        } : undefined,
        links: meta.entityType && meta.entityId ? {
          create: [{ entityType: meta.entityType as any, entityId: meta.entityId }],
        } : undefined,
      },
      include: { tags: true, links: true },
    })

    return {
      ...document,
      url:       stored.url,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    }
  }

  async getDownloadInfo(user: AuthUser, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!doc) throw new NotFoundException('Dokument nenalezen')
    return { storageKey: doc.storageKey, name: doc.originalName, mimeType: doc.mimeType }
  }

  async delete(user: AuthUser, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!doc) throw new NotFoundException('Dokument nenalezen')

    await this.storage.delete(doc.storageKey)
    await this.prisma.document.delete({ where: { id } })
  }

  async addLink(user: AuthUser, id: string, entityType: string, entityId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!doc) throw new NotFoundException('Dokument nenalezen')

    return this.prisma.documentLink.create({
      data: { documentId: id, entityType: entityType as any, entityId },
    })
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_ACTIVITY_TYPES = [
  { name: 'Telefonát', kind: 'CALL' as const, defaultDays: 1, icon: '📞' },
  { name: 'Email', kind: 'EMAIL' as const, defaultDays: 1, icon: '📧' },
  { name: 'Schůzka', kind: 'MEETING' as const, defaultDays: 3, icon: '📅' },
  { name: 'Úkol', kind: 'TASK' as const, defaultDays: 7, icon: '✅' },
  { name: 'Nahrát dokument', kind: 'DOCUMENT_UPLOAD' as const, defaultDays: 3, icon: '📄' },
  { name: 'Podpis smlouvy', kind: 'SIGN_REQUEST' as const, defaultDays: 5, icon: '✍️' },
  { name: 'Připomínka', kind: 'REMINDER' as const, defaultDays: 1, icon: '🔔' },
];

@Injectable()
export class ChatterService {
  constructor(private prisma: PrismaService) {}

  // ─── MESSAGES ─────────────────────────────────────────────────

  async addMessage(
    tenantId: string,
    entityType: string,
    entityId: string,
    body: string,
    authorId?: string,
    mentionUserIds?: string[],
  ) {
    const msg = await this.prisma.chatMessage.create({
      data: {
        tenantId,
        entityType,
        entityId,
        type: authorId ? 'USER_MESSAGE' : 'SYSTEM_LOG',
        body,
        authorId: authorId || null,
        mentions: mentionUserIds?.length
          ? { create: mentionUserIds.map(userId => ({ userId })) }
          : undefined,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    return msg;
  }

  async addSystemLog(tenantId: string, entityType: string, entityId: string, message: string) {
    return this.prisma.chatMessage.create({
      data: {
        tenantId,
        entityType,
        entityId,
        type: 'SYSTEM_LOG',
        body: message,
      },
    });
  }

  async getThread(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.chatMessage.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true } },
        mentions: { include: { user: { select: { id: true, name: true } } } },
      },
    });
  }

  // ─── ACTIVITIES ───────────────────────────────────────────────

  async getActivities(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.activity.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { deadline: 'asc' },
      include: {
        activityType: true,
        assignedTo: { select: { id: true, name: true } },
        doneBy: { select: { id: true, name: true } },
      },
    });
  }

  async getMyActivities(tenantId: string, userId: string) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return this.prisma.activity.findMany({
      where: {
        tenantId,
        assignedToId: userId,
        status: { in: ['PLANNED', 'OVERDUE'] },
        deadline: { lte: nextWeek },
      },
      orderBy: { deadline: 'asc' },
      include: {
        activityType: true,
      },
      take: 20,
    });
  }

  async createActivity(
    tenantId: string,
    entityType: string,
    entityId: string,
    dto: { activityTypeId: string; title: string; note?: string; deadline: string; assignedToId: string },
  ) {
    return this.prisma.activity.create({
      data: {
        tenantId,
        entityType,
        entityId,
        activityTypeId: dto.activityTypeId,
        title: dto.title,
        note: dto.note || null,
        deadline: new Date(dto.deadline),
        assignedToId: dto.assignedToId,
      },
      include: {
        activityType: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async completeActivity(tenantId: string, activityId: string, userId: string) {
    return this.prisma.activity.update({
      where: { id: activityId },
      data: {
        status: 'DONE',
        doneAt: new Date(),
        doneById: userId,
      },
    });
  }

  async getOrCreateDefaultActivityTypes(tenantId: string) {
    const existing = await this.prisma.activityType.findMany({ where: { tenantId } });
    if (existing.length > 0) return existing;

    await this.prisma.activityType.createMany({
      data: DEFAULT_ACTIVITY_TYPES.map(t => ({ tenantId, ...t })),
      skipDuplicates: true,
    });

    return this.prisma.activityType.findMany({ where: { tenantId } });
  }
}

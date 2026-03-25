import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { LocalStorageProvider } from '../documents/storage/local.storage'
import { imageSize } from 'image-size'
import * as path from 'path'
import * as crypto from 'crypto'
import type { UpdateZonesDto } from './dto/update-zones.dto'

@Injectable()
export class FloorPlansService {
  constructor(
    private prisma: PrismaService,
    private storage: LocalStorageProvider,
  ) {}

  async findByProperty(tenantId: string, propertyId: string) {
    return this.prisma.floorPlan.findMany({
      where: { tenantId, propertyId },
      orderBy: { sortOrder: 'asc' },
      include: {
        zones: {
          include: {
            unit: { select: { id: true, name: true, floor: true, area: true, isOccupied: true } },
          },
        },
      },
    })
  }

  async findOne(tenantId: string, id: string) {
    const plan = await this.prisma.floorPlan.findFirst({
      where: { id, tenantId },
      include: {
        zones: {
          include: {
            unit: { select: { id: true, name: true, floor: true, area: true, isOccupied: true } },
          },
        },
      },
    })
    if (!plan) throw new NotFoundException('Půdorys nenalezen')
    return plan
  }

  async create(
    tenantId: string,
    dto: { propertyId: string; floor: number; label?: string; sortOrder?: number },
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const ext = path.extname(file.originalname)
    const key = `${tenantId}/floor-plans/${crypto.randomUUID()}${ext}`
    const stored = await this.storage.save(file.buffer, key, file.mimetype)

    const dimensions = imageSize(file.buffer)
    const imageWidth = dimensions.width ?? 0
    const imageHeight = dimensions.height ?? 0

    return this.prisma.floorPlan.create({
      data: {
        tenantId,
        propertyId: dto.propertyId,
        floor: dto.floor,
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
        imageUrl: stored.url,
        imageWidth,
        imageHeight,
      },
      include: { zones: true },
    })
  }

  async update(tenantId: string, id: string, dto: { label?: string; floor?: number; sortOrder?: number }) {
    await this.findOne(tenantId, id)
    return this.prisma.floorPlan.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.floor !== undefined && { floor: dto.floor }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    })
  }

  async delete(tenantId: string, id: string) {
    const plan = await this.findOne(tenantId, id)
    // Extract storage key from imageUrl
    const urlParts = plan.imageUrl.split('/')
    const keyStart = urlParts.indexOf(tenantId)
    if (keyStart >= 0) {
      const key = urlParts.slice(keyStart).join('/')
      await this.storage.delete(key).catch(() => {})
    }
    await this.prisma.floorPlan.delete({ where: { id } })
  }

  async saveZones(tenantId: string, floorPlanId: string, dto: UpdateZonesDto) {
    await this.findOne(tenantId, floorPlanId)

    return this.prisma.$transaction(async (tx) => {
      // Delete all existing zones
      await tx.floorPlanZone.deleteMany({ where: { floorPlanId } })

      // Create all zones from dto
      if (dto.zones.length > 0) {
        await tx.floorPlanZone.createMany({
          data: dto.zones.map((z) => ({
            floorPlanId,
            unitId: z.unitId ?? null,
            label: z.label ?? null,
            zoneType: z.zoneType,
            polygon: z.polygon as any,
            color: z.color ?? null,
          })),
        })
      }

      return tx.floorPlanZone.findMany({
        where: { floorPlanId },
        include: {
          unit: { select: { id: true, name: true, floor: true, area: true, isOccupied: true } },
        },
      })
    })
  }

  async uploadImage(
    tenantId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const plan = await this.findOne(tenantId, id)

    // Delete old image
    const urlParts = plan.imageUrl.split('/')
    const keyStart = urlParts.indexOf(tenantId)
    if (keyStart >= 0) {
      const key = urlParts.slice(keyStart).join('/')
      await this.storage.delete(key).catch(() => {})
    }

    const ext = path.extname(file.originalname)
    const key = `${tenantId}/floor-plans/${crypto.randomUUID()}${ext}`
    const stored = await this.storage.save(file.buffer, key, file.mimetype)

    const dimensions = imageSize(file.buffer)

    return this.prisma.floorPlan.update({
      where: { id },
      data: {
        imageUrl: stored.url,
        imageWidth: dimensions.width ?? 0,
        imageHeight: dimensions.height ?? 0,
      },
    })
  }
}

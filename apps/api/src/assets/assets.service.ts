import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  /* ─── List ──────────────────────────────────────────────────────── */

  async list(user: AuthUser, params: {
    search?: string;
    category?: string;
    status?: string;
    propertyId?: string;
  }) {
    const where: Prisma.AssetWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
    };

    if (params.category) where.category = params.category as any;
    if (params.status) where.status = params.status as any;
    if (params.propertyId) where.propertyId = params.propertyId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { manufacturer: { contains: params.search, mode: 'insensitive' } },
        { model: { contains: params.search, mode: 'insensitive' } },
        { serialNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const data = await this.prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        _count: { select: { serviceRecords: true } },
      },
    });

    return data;
  }

  /* ─── Stats ─────────────────────────────────────────────────────── */

  async getStats(user: AuthUser) {
    const base = { tenantId: user.tenantId, deletedAt: null };
    const now = new Date();

    const [total, inWarranty, needsService, totalValue] = await Promise.all([
      this.prisma.asset.count({ where: base }),
      this.prisma.asset.count({ where: { ...base, warrantyUntil: { gte: now } } }),
      this.prisma.asset.count({
        where: {
          ...base,
          OR: [
            { nextServiceDate: { lte: now } },
            { warrantyUntil: { lt: now, not: null } },
          ],
        },
      }),
      this.prisma.asset.aggregate({
        where: base,
        _sum: { purchaseValue: true },
      }),
    ]);

    return {
      total,
      inWarranty,
      needsService,
      totalValue: totalValue._sum.purchaseValue?.toNumber() ?? 0,
    };
  }

  /* ─── CRUD ──────────────────────────────────────────────────────── */

  async create(user: AuthUser, dto: {
    name: string;
    category?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    location?: string;
    propertyId?: string;
    unitId?: string;
    status?: string;
    purchaseDate?: string;
    purchaseValue?: number;
    warrantyUntil?: string;
    serviceInterval?: number;
    nextServiceDate?: string;
    notes?: string;
  }) {
    return this.prisma.asset.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        category: (dto.category as any) || 'ostatni',
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        location: dto.location,
        propertyId: dto.propertyId || null,
        unitId: dto.unitId || null,
        status: (dto.status as any) || 'aktivni',
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchaseValue: dto.purchaseValue ?? null,
        warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : null,
        serviceInterval: dto.serviceInterval ?? null,
        nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : null,
        notes: dto.notes,
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    });
  }

  async getById(user: AuthUser, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        serviceRecords: { orderBy: { date: 'desc' } },
      },
    });
    if (!asset) throw new NotFoundException('Aktivum nenalezeno');
    return asset;
  }

  async update(user: AuthUser, id: string, dto: Record<string, unknown>) {
    await this.getById(user, id); // ensure exists

    const data: Record<string, unknown> = {};
    const strings = ['name', 'manufacturer', 'model', 'serialNumber', 'location', 'notes'];
    const enums = ['category', 'status'];
    const dates = ['purchaseDate', 'warrantyUntil', 'nextServiceDate', 'lastServiceDate'];
    const refs = ['propertyId', 'unitId'];

    for (const k of strings) if (dto[k] !== undefined) data[k] = dto[k] || null;
    for (const k of enums) if (dto[k] !== undefined) data[k] = dto[k];
    for (const k of dates) if (dto[k] !== undefined) data[k] = dto[k] ? new Date(dto[k] as string) : null;
    for (const k of refs) if (dto[k] !== undefined) data[k] = dto[k] || null;
    if (dto.purchaseValue !== undefined) data.purchaseValue = dto.purchaseValue ?? null;
    if (dto.serviceInterval !== undefined) data.serviceInterval = dto.serviceInterval ?? null;

    return this.prisma.asset.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.getById(user, id);
    await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  /* ─── Service Records ───────────────────────────────────────────── */

  async addServiceRecord(user: AuthUser, assetId: string, dto: {
    date: string;
    type: string;
    description?: string;
    cost?: number;
    supplier?: string;
  }) {
    await this.getById(user, assetId);

    const record = await this.prisma.assetServiceRecord.create({
      data: {
        assetId,
        tenantId: user.tenantId,
        date: new Date(dto.date),
        type: dto.type,
        description: dto.description,
        cost: dto.cost ?? null,
        supplier: dto.supplier,
      },
    });

    // Update lastServiceDate on the asset
    await this.prisma.asset.update({
      where: { id: assetId },
      data: { lastServiceDate: new Date(dto.date) },
    });

    return record;
  }

  async getServiceRecords(user: AuthUser, assetId: string) {
    await this.getById(user, assetId);
    return this.prisma.assetServiceRecord.findMany({
      where: { assetId, tenantId: user.tenantId },
      orderBy: { date: 'desc' },
    });
  }

  /* ─── CSV Export ────────────────────────────────────────────────── */

  async exportCsv(user: AuthUser) {
    const assets = await this.prisma.asset.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const header = 'Název;Kategorie;Výrobce;Model;Sériové číslo;Umístění;Nemovitost;Jednotka;Stav;Datum pořízení;Cena;Záruka do;Interval servisu;Příští servis';
    const rows = assets.map((a) => [
      a.name, a.category, a.manufacturer ?? '', a.model ?? '',
      a.serialNumber ?? '', a.location ?? '',
      a.property?.name ?? '', a.unit?.name ?? '',
      a.status,
      a.purchaseDate?.toISOString().slice(0, 10) ?? '',
      a.purchaseValue?.toString() ?? '',
      a.warrantyUntil?.toISOString().slice(0, 10) ?? '',
      a.serviceInterval?.toString() ?? '',
      a.nextServiceDate?.toISOString().slice(0, 10) ?? '',
    ].join(';'));

    return [header, ...rows].join('\n');
  }
}

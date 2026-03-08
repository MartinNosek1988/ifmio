import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResultItem {
  id: string;
  type: 'property' | 'unit' | 'resident' | 'ticket' | 'document';
  title: string;
  subtitle?: string;
  url: string;
}

export interface SearchResult {
  query: string;
  total: number;
  results: SearchResultItem[];
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(
    tenantId: string,
    query: string,
    limit = 20,
  ): Promise<SearchResult> {
    const perType = Math.max(Math.ceil(limit / 5), 5);

    const [properties, units, residents, tickets, documents] =
      await Promise.all([
        this.searchProperties(tenantId, query, perType),
        this.searchUnits(tenantId, query, perType),
        this.searchResidents(tenantId, query, perType),
        this.searchTickets(tenantId, query, perType),
        this.searchDocuments(tenantId, query, perType),
      ]);

    const results = [
      ...properties,
      ...units,
      ...residents,
      ...tickets,
      ...documents,
    ].slice(0, limit);

    return { query, total: results.length, results };
  }

  private async searchProperties(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const rows = await this.prisma.property.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      type: 'property' as const,
      title: r.name,
      subtitle: r.address,
      url: `/properties/${r.id}`,
    }));
  }

  private async searchUnits(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const rows = await this.prisma.unit.findMany({
      where: {
        property: { tenantId },
        name: { contains: query, mode: 'insensitive' },
      },
      include: { property: { select: { name: true } } },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      type: 'unit' as const,
      title: r.name,
      subtitle: r.property?.name,
      url: `/properties/${r.propertyId}?unit=${r.id}`,
    }));
  }

  private async searchResidents(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const rows = await this.prisma.resident.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { lastName: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      type: 'resident' as const,
      title: `${r.firstName} ${r.lastName}`,
      subtitle: r.email ?? r.phone ?? undefined,
      url: `/residents?id=${r.id}`,
    }));
  }

  private async searchTickets(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const numberQuery = parseInt(query, 10);

    const rows = await this.prisma.helpdeskTicket.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          ...(Number.isFinite(numberQuery) ? [{ number: numberQuery }] : []),
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      type: 'ticket' as const,
      title: `#${r.number} ${r.title}`,
      subtitle: r.status,
      url: `/helpdesk?ticket=${r.id}`,
    }));
  }

  private async searchDocuments(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const rows = await this.prisma.document.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { originalName: { contains: query, mode: 'insensitive' } },
          { category: { equals: query as any } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      type: 'document' as const,
      title: r.name,
      subtitle: r.category,
      url: `/documents?id=${r.id}`,
    }));
  }
}

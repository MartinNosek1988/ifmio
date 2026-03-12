import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import type { AuthUser } from '@ifmio/shared-types';

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
  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
  ) {}

  async search(
    user: AuthUser,
    query: string,
    limit = 20,
  ): Promise<SearchResult> {
    const perType = Math.max(Math.ceil(limit / 5), 5);

    const [properties, units, residents, tickets, documents] =
      await Promise.all([
        this.searchProperties(user, query, perType),
        this.searchUnits(user, query, perType),
        this.searchResidents(user, query, perType),
        this.searchTickets(user, query, perType),
        this.searchDocuments(user.tenantId, query, perType),
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
    user: AuthUser,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const ids = await this.scope.getAccessiblePropertyIds(user);
    const idFilter = ids !== null ? { id: { in: ids } } : {};

    const rows = await this.prisma.property.findMany({
      where: {
        tenantId: user.tenantId,
        ...idFilter,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ],
      } as any,
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
    user: AuthUser,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const ids = await this.scope.getAccessiblePropertyIds(user);
    const propFilter = ids !== null ? { id: { in: ids } } : {};

    const rows = await this.prisma.unit.findMany({
      where: {
        property: { tenantId: user.tenantId, ...propFilter },
        name: { contains: query, mode: 'insensitive' },
      } as any,
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
    user: AuthUser,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const scopeWhere = await this.scope.scopeByPropertyId(user);

    const rows = await this.prisma.resident.findMany({
      where: {
        tenantId: user.tenantId,
        ...scopeWhere,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      } as any,
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
    user: AuthUser,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const scopeWhere = await this.scope.scopeByPropertyId(user);
    const numberQuery = parseInt(query, 10);

    const rows = await this.prisma.helpdeskTicket.findMany({
      where: {
        tenantId: user.tenantId,
        ...scopeWhere,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          ...(Number.isFinite(numberQuery) ? [{ number: numberQuery }] : []),
        ],
      } as any,
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

  // Documents are tenant-wide by V1 design — no property scope
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

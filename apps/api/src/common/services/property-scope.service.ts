import { Injectable, ForbiddenException, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '@ifmio/shared-types';

/** Roles that always have tenant-wide access (no property scope filtering) */
const TENANT_WIDE_ROLES = ['tenant_owner', 'tenant_admin'];

@Injectable({ scope: Scope.REQUEST })
export class PropertyScopeService {
  private cache: string[] | null | undefined = undefined; // undefined = not loaded

  constructor(
    private prisma: PrismaService,
    @Inject(REQUEST) private request: { user?: AuthUser },
  ) {}

  /**
   * Returns accessible propertyIds for current user.
   * - `null` = tenant-wide access (no filtering needed)
   * - `string[]` = property-scoped (may be empty)
   * Result is cached for the duration of the request.
   */
  async getAccessiblePropertyIds(user?: AuthUser): Promise<string[] | null> {
    const u = user ?? this.request.user;
    if (!u) return [];

    if (TENANT_WIDE_ROLES.includes(u.role)) return null;

    if (this.cache !== undefined) return this.cache;

    const assignments = await this.prisma.userPropertyAssignment.findMany({
      where: { userId: u.id },
      select: { propertyId: true },
    });
    this.cache = assignments.map(a => a.propertyId);
    return this.cache;
  }

  /**
   * Extends a Prisma `where` clause with property scope filter.
   * For tenant-wide roles, returns `base` unchanged.
   * For scoped roles, adds `propertyId: { in: [...] }`.
   */
  async scopeByPropertyId(
    user: AuthUser,
    base: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const ids = await this.getAccessiblePropertyIds(user);
    if (ids === null) return base;
    return { ...base, propertyId: { in: ids } };
  }

  /**
   * Scope filter for entities linked through a relation (e.g., BankTransaction → BankAccount.propertyId).
   * `relationPath` is the Prisma relation field name (e.g., 'bankAccount').
   */
  async scopeByRelation(
    user: AuthUser,
    relationPath: string,
    base: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const ids = await this.getAccessiblePropertyIds(user);
    if (ids === null) return base;
    return { ...base, [relationPath]: { propertyId: { in: ids } } };
  }

  /**
   * Verify that the user has access to a specific property.
   * Throws ForbiddenException if not.
   */
  async verifyPropertyAccess(user: AuthUser, propertyId: string): Promise<void> {
    if (TENANT_WIDE_ROLES.includes(user.role)) return;

    const ids = await this.getAccessiblePropertyIds(user);
    if (ids && !ids.includes(propertyId)) {
      throw new ForbiddenException('Nemáte přístup k této nemovitosti');
    }
  }

  /**
   * Verify access to an entity with optional propertyId.
   * If propertyId is set, verifies access. If null, only tenant-wide roles can access.
   */
  async verifyEntityAccess(user: AuthUser, propertyId: string | null | undefined): Promise<void> {
    if (propertyId) {
      return this.verifyPropertyAccess(user, propertyId);
    }
    const ids = await this.getAccessiblePropertyIds(user);
    if (ids !== null) {
      throw new ForbiddenException('Nemáte přístup k tomuto záznamu');
    }
  }

  /**
   * Verify that the user has access to at least one of the given properties.
   * Useful for bulk actions and reports.
   */
  async verifyAnyPropertyAccess(user: AuthUser, propertyIds: string[]): Promise<void> {
    if (TENANT_WIDE_ROLES.includes(user.role)) return;

    const ids = await this.getAccessiblePropertyIds(user);
    if (!ids) return;

    const hasAccess = propertyIds.some(pid => ids.includes(pid));
    if (!hasAccess) {
      throw new ForbiddenException('Nemáte přístup k žádné z vybraných nemovitostí');
    }
  }
}

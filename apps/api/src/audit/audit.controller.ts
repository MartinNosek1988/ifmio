import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Seznam audit logů s filtrováním (owner/admin)' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const take = Math.min(Number(limit) || 50, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where: Prisma.AuditLogWhereInput = {
      tenantId: user.tenantId,
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page: Number(page) || 1, limit: take };
  }

  @Get('entities')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Distinct entity values pro filtr' })
  async entities(@CurrentUser() user: AuthUser) {
    const result = await this.prisma.auditLog.findMany({
      where: { tenantId: user.tenantId },
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    });
    return result.map((r) => r.entity);
  }
}

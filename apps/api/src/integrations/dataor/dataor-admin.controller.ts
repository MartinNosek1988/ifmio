import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { SuperAdminService } from '../../super-admin/super-admin.service'
import { PrismaService } from '../../prisma/prisma.service'
import { DataorService } from './dataor.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Admin / Dataor')
@ApiBearerAuth()
@Controller('admin/dataor')
export class DataorAdminController {
  constructor(
    private readonly dataor: DataorService,
    private readonly prisma: PrismaService,
    private readonly superAdmin: SuperAdminService,
  ) {}

  @Post('import')
  @Roles('tenant_owner')
  @ApiOperation({ summary: 'Spustit dataor import (SUPER_ADMIN)' })
  async triggerImport(
    @CurrentUser() user: AuthUser,
    @Body() body: { rok?: number; typ?: 'full' | 'actual'; pravniForma?: string; soud?: string },
  ) {
    const isSuperAdmin = await this.superAdmin.isSuperAdmin(user.id)
    if (!isSuperAdmin) throw new BadRequestException('Super admin required')

    const rok = body.rok ?? new Date().getFullYear()
    const typ = body.typ ?? 'actual'
    const jobId = crypto.randomUUID()

    // Fire & forget
    this.dataor.importAll(rok, typ, body.pravniForma, body.soud).catch(() => {})

    return { message: 'Import spuštěn', jobId }
  }

  @Get('stats')
  @Roles('tenant_owner')
  @ApiOperation({ summary: 'KB statistiky (SUPER_ADMIN)' })
  async getStats(@CurrentUser() user: AuthUser) {
    const isSuperAdmin = await this.superAdmin.isSuperAdmin(user.id)
    if (!isSuperAdmin) throw new BadRequestException('Super admin required')

    const [organizations, persons, engagements, byPravniForma] = await Promise.all([
      this.prisma.kbOrganization.count(),
      this.prisma.kbPerson.count(),
      this.prisma.kbPersonEngagement.count(),
      this.prisma.kbOrganization.groupBy({
        by: ['legalFormCode'],
        _count: true,
      }),
    ])

    return { organizations, persons, engagements, byPravniForma }
  }
}

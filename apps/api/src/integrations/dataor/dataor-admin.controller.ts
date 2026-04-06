import { Controller, Get, Post, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { DataorService } from './dataor.service'

@ApiTags('Admin / Dataor')
@ApiBearerAuth()
@Controller('admin/dataor')
export class DataorAdminController {
  constructor(
    private readonly dataor: DataorService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('import')
  @Roles('tenant_owner')
  @ApiOperation({ summary: 'Spustit dataor import' })
  async triggerImport(
    @Body() body: { rok?: number; typ?: 'full' | 'actual'; pravniForma?: string; soud?: string },
  ) {
    const rok = body.rok ?? new Date().getFullYear()
    const typ = body.typ ?? 'actual'
    const jobId = crypto.randomUUID()

    // Fire & forget
    this.dataor.importAll(rok, typ, body.pravniForma, body.soud).catch(() => {})

    return { message: 'Import spuštěn', jobId }
  }

  @Get('stats')
  @Roles('tenant_owner')
  @ApiOperation({ summary: 'KB statistiky' })
  async getStats() {

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

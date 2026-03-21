import { Controller, Post, Delete, Param, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../common/decorators/public.decorator'
import { E2eSeedService } from './e2e-seed.service'

@ApiTags('E2E Seed')
@Controller('e2e-seed')
export class E2eSeedController {
  constructor(private service: E2eSeedService) {}

  private guard() {
    if (process.env.NODE_ENV !== 'test' && process.env.E2E_SEED_ENABLED !== 'true') {
      throw new ForbiddenException('E2E seed endpoints are disabled')
    }
  }

  @Post('setup')
  @Public()
  @ApiOperation({ summary: 'Create E2E test dataset (test env only)' })
  setup() {
    this.guard()
    return this.service.setup()
  }

  @Delete('cleanup/:tenantId')
  @Public()
  @ApiOperation({ summary: 'Delete E2E test dataset (test env only)' })
  cleanup(@Param('tenantId') tenantId: string) {
    this.guard()
    return this.service.cleanup(tenantId)
  }
}

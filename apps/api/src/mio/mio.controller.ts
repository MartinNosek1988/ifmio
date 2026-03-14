import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { MioService } from './mio.service'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Mio AI')
@ApiBearerAuth()
@Controller('mio')
export class MioController {
  constructor(private service: MioService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Mio AI chat' })
  async chat(
    @CurrentUser() user: AuthUser,
    @Body() dto: {
      messages: { role: 'user' | 'assistant'; content: string }[]
    },
  ) {
    const response = await this.service.chat(user, dto.messages ?? [])
    return { response }
  }
}

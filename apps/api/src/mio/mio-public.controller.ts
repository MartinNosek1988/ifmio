import { Controller, Post, Body, HttpCode, BadRequestException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../common/decorators/public.decorator'
import { MioPublicService } from './mio-public.service'

class PublicChatDto {
  message!: string
  sessionId!: string
  conversationHistory!: { role: 'user' | 'assistant'; content: string }[]
  locale!: 'cs' | 'en'
}

@ApiTags('Mio Public')
@Controller('mio')
export class MioPublicController {
  constructor(private readonly mioPublicService: MioPublicService) {}

  @Post('public-chat')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  @ApiOperation({ summary: 'Public Mio AI chat for landing page widget' })
  async publicChat(@Body() dto: PublicChatDto) {
    // Validate input
    if (!dto.message || typeof dto.message !== 'string') {
      throw new BadRequestException('message is required')
    }
    if (dto.message.length > 500) {
      throw new BadRequestException('message must be 500 characters or less')
    }
    if (!dto.sessionId || typeof dto.sessionId !== 'string') {
      throw new BadRequestException('sessionId is required')
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.sessionId)) {
      throw new BadRequestException('sessionId must be a valid UUID')
    }
    if (!dto.locale || !['cs', 'en'].includes(dto.locale)) {
      throw new BadRequestException('locale must be cs or en')
    }
    if (!Array.isArray(dto.conversationHistory)) {
      dto.conversationHistory = []
    }
    if (dto.conversationHistory.length > 10) {
      dto.conversationHistory = dto.conversationHistory.slice(-10)
    }

    return this.mioPublicService.chat(dto)
  }
}

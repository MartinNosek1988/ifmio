import { Controller, Get, Post, Query, Body, HttpCode, ForbiddenException, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../common/decorators/public.decorator'
import { WhatsAppBotService } from './whatsapp-bot.service'

@ApiTags('WhatsApp Webhook')
@Controller('whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name)

  constructor(private bot: WhatsAppBotService) {}

  @Get('webhook')
  @Public()
  @ApiOperation({ summary: 'Meta webhook verification' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      this.logger.log('WhatsApp webhook verified')
      return challenge
    }
    throw new ForbiddenException('Invalid verify token')
  }

  @Post('webhook')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute per IP
  @HttpCode(200)
  @ApiOperation({ summary: 'Incoming WhatsApp messages' })
  handleIncoming(@Body() body: any): string {
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    if (!value?.messages?.[0]) return 'OK'

    const message = value.messages[0]
    const senderPhone: string = message.from
    const messageId: string = message.id || ''

    if (message.type === 'image' && message.image?.id) {
      // Image message
      this.bot
        .processIncomingImage(senderPhone, message.image.id, message.image.caption || '', messageId)
        .catch(err => this.logger.error(`WhatsApp image processing failed: ${err.message}`, err.stack))
    } else if (message.text?.body) {
      // Text message
      this.bot
        .processIncomingMessage(senderPhone, message.text.body, messageId)
        .catch(err => this.logger.error(`WhatsApp text processing failed: ${err.message}`, err.stack))
    }

    return 'OK'
  }
}

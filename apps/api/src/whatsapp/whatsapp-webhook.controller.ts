import { Controller, Get, Post, Query, Body, HttpCode, ForbiddenException, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Incoming WhatsApp messages' })
  handleIncoming(@Body() body: any): string {
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    // Skip non-message events (status updates, etc.)
    if (!value?.messages?.[0]) return 'OK'

    const message = value.messages[0]
    const senderPhone: string = message.from
    const messageText: string = message.text?.body || ''
    const messageId: string = message.id || ''

    if (!messageText) return 'OK'

    // Process async — Meta needs 200 within 5s
    this.bot
      .processIncomingMessage(senderPhone, messageText, messageId)
      .catch(err => this.logger.error(`WhatsApp processing failed: ${err.message}`, err.stack))

    return 'OK'
  }
}

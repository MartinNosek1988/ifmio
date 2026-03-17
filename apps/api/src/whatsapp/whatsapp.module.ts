import { Module } from '@nestjs/common'
import { WhatsAppWebhookController } from './whatsapp-webhook.controller'
import { WhatsAppBotService } from './whatsapp-bot.service'
import { WhatsAppAutomationService } from './whatsapp-automation.service'
import { CommunicationModule } from '../communication/communication.module'
import { HelpdeskModule } from '../helpdesk/helpdesk.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule, CommunicationModule, HelpdeskModule],
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppBotService, WhatsAppAutomationService],
  exports: [WhatsAppAutomationService],
})
export class WhatsAppModule {}

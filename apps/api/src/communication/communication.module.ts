import { Module } from '@nestjs/common'
import { CommunicationController } from './communication.controller'
import { CommunicationService } from './communication.service'
import { GoSmsProvider } from './channels/gosms.provider'
import { WhatsAppProvider } from './channels/whatsapp.provider'
import { DopisOnlineProvider } from './channels/dopisonline.provider'
import { IsdsProvider } from './channels/isds.provider'
import { TeamsChannelProvider } from './channels/teams.provider'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CommunicationController],
  providers: [CommunicationService, GoSmsProvider, WhatsAppProvider, DopisOnlineProvider, IsdsProvider, TeamsChannelProvider],
  exports: [CommunicationService, WhatsAppProvider, TeamsChannelProvider],
})
export class CommunicationModule {}

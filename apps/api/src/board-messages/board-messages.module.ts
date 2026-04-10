import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { PropertyScopeModule } from '../common/services/property-scope.module'
import { BoardMessagesService } from './board-messages.service'
import { BoardMessagesController } from './board-messages.controller'

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [BoardMessagesService],
  controllers: [BoardMessagesController],
  exports: [BoardMessagesService],
})
export class BoardMessagesModule {}

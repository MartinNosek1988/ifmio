import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'
import { PortalController } from './portal.controller'
import { PortalPublicController } from './portal-public.controller'
import { PortalService } from './portal.service'
import { PortalAccessService } from './portal-access.service'

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PortalController, PortalPublicController],
  providers: [PortalService, PortalAccessService],
  exports: [PortalService, PortalAccessService],
})
export class PortalModule {}

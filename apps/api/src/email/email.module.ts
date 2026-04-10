import { Module, Global } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailService } from './email.service'
import { EmailTemplateService } from './email-template.service'
import { EmailTemplateController } from './email-template.controller'

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [EmailTemplateController],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}

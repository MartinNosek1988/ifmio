import { Global, Module } from '@nestjs/common'
import { SecurityAlertingService } from './security-alerting.service'
import { EmailModule } from '../../email/email.module'

@Global()
@Module({
  imports: [EmailModule],
  providers: [SecurityAlertingService],
  exports: [SecurityAlertingService],
})
export class SecurityAlertingModule {}

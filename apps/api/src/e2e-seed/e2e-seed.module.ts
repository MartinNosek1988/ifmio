import { Module } from '@nestjs/common'
import { E2eSeedController } from './e2e-seed.controller'
import { E2eSeedService } from './e2e-seed.service'

@Module({
  controllers: [E2eSeedController],
  providers: [E2eSeedService],
})
export class E2eSeedModule {}

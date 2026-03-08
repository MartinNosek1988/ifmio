import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { AresService } from './ares/ares.service';
import { CuzkService } from './cuzk/cuzk.service';

@Module({
  controllers: [IntegrationsController],
  providers: [AresService, CuzkService],
  exports: [AresService, CuzkService],
})
export class IntegrationsModule {}

import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { AresService } from './ares/ares.service';
import { CuzkService } from './cuzk/cuzk.service';
import { RuianService } from './ruian/ruian.service';

@Module({
  controllers: [IntegrationsController],
  providers: [AresService, CuzkService, RuianService],
  exports: [AresService, CuzkService, RuianService],
})
export class IntegrationsModule {}

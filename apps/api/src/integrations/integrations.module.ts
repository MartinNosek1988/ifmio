import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { AresService } from './ares/ares.service';
import { CuzkService } from './cuzk/cuzk.service';
import { RuianService } from './ruian/ruian.service';
import { JusticeService } from './justice/justice.service';

@Module({
  controllers: [IntegrationsController],
  providers: [AresService, CuzkService, RuianService, JusticeService],
  exports: [AresService, CuzkService, RuianService, JusticeService],
})
export class IntegrationsModule {}

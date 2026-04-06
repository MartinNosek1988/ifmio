import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { AresService } from './ares/ares.service';
import { CuzkService } from './cuzk/cuzk.service';
import { CuzkApiKnService } from './cuzk/cuzk-api-kn.service';
import { RuianService } from './ruian/ruian.service';
import { JusticeModule } from './justice/justice.module';

@Module({
  imports: [JusticeModule],
  controllers: [IntegrationsController],
  providers: [AresService, CuzkService, CuzkApiKnService, RuianService],
  exports: [AresService, CuzkService, CuzkApiKnService, RuianService, JusticeModule],
})
export class IntegrationsModule {}

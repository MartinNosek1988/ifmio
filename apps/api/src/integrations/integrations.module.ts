import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { AresService } from './ares/ares.service';
import { CuzkService } from './cuzk/cuzk.service';
import { CuzkApiKnService } from './cuzk/cuzk-api-kn.service';
import { RuianService } from './ruian/ruian.service';
import { RuianLocalLookupService } from '../knowledge-base/ruian-vfr/ruian-local-lookup.service';
import { JusticeModule } from './justice/justice.module';
import { DataorModule } from './dataor/dataor.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [JusticeModule, DataorModule, PrismaModule],
  controllers: [IntegrationsController],
  providers: [AresService, CuzkService, CuzkApiKnService, RuianService, RuianLocalLookupService],
  exports: [AresService, CuzkService, CuzkApiKnService, RuianService, RuianLocalLookupService, JusticeModule, DataorModule],
})
export class IntegrationsModule {}

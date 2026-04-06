import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { CuzkImportService } from './cuzk-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { JusticeModule } from '../integrations/justice/justice.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule, KnowledgeBaseModule, IntegrationsModule, JusticeModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, CuzkImportService],
})
export class PropertiesModule {}

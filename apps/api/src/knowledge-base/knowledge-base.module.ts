import { Module } from '@nestjs/common'
import { KnowledgeBaseController } from './knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base.service'
import { BuildingEnrichmentService } from './building-enrichment.service'
import { PropertyEnrichmentOrchestrator } from './property-enrichment.orchestrator'
import { IprPriceService } from './ipr-price.service'
import { GeoRiskService } from './geo-risk.service'
import { BuildingIntelligenceService } from './building-intelligence.service'
import { BulkImportService } from './bulk-import.service'
import { PrismaModule } from '../prisma/prisma.module'
import { IntegrationsModule } from '../integrations/integrations.module'
import { SuperAdminModule } from '../super-admin/super-admin.module'

@Module({
  imports: [PrismaModule, IntegrationsModule, SuperAdminModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, BuildingEnrichmentService, PropertyEnrichmentOrchestrator, IprPriceService, GeoRiskService, BuildingIntelligenceService, BulkImportService],
  exports: [KnowledgeBaseService, BuildingEnrichmentService],
})
export class KnowledgeBaseModule {}

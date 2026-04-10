import { Module } from '@nestjs/common'
import { KnowledgeBaseController } from './knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base.service'
import { BuildingEnrichmentService } from './building-enrichment.service'
import { PropertyEnrichmentOrchestrator } from './property-enrichment.orchestrator'
import { IprPriceService } from './ipr-price.service'
import { GeoRiskService } from './geo-risk.service'
import { BuildingIntelligenceService } from './building-intelligence.service'
import { BulkImportService } from './bulk-import.service'
import { TerritorySeedService } from './territory-seed.service'
import { CuzkEnrichService } from './cuzk-enrich.service'
import { BuildingCompletenessService } from './building-completeness.service'
import { BuildingUnitMatchingService } from './building-unit-matching.service'
import { RuianVfrDownloadService } from './ruian-vfr/ruian-vfr-download.service'
import { RuianVfrParserService } from './ruian-vfr/ruian-vfr-parser.service'
import { RuianVfrImportService } from './ruian-vfr/ruian-vfr-import.service'
import { RuianLocalLookupService } from './ruian-vfr/ruian-local-lookup.service'
import { PrismaModule } from '../prisma/prisma.module'
import { IntegrationsModule } from '../integrations/integrations.module'
import { SuperAdminModule } from '../super-admin/super-admin.module'
import { DataorModule } from '../integrations/dataor/dataor.module'

@Module({
  imports: [PrismaModule, IntegrationsModule, SuperAdminModule, DataorModule],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService, BuildingEnrichmentService, PropertyEnrichmentOrchestrator,
    IprPriceService, GeoRiskService, BuildingIntelligenceService, BulkImportService,
    TerritorySeedService, CuzkEnrichService, BuildingCompletenessService, BuildingUnitMatchingService,
    RuianVfrDownloadService, RuianVfrParserService, RuianVfrImportService, RuianLocalLookupService,
  ],
  exports: [KnowledgeBaseService, BuildingEnrichmentService, CuzkEnrichService, BuildingUnitMatchingService, RuianVfrImportService, RuianLocalLookupService],
})
export class KnowledgeBaseModule {}

import { Module } from '@nestjs/common'
import { KnowledgeBaseController } from './knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base.service'
import { BuildingEnrichmentService } from './building-enrichment.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, BuildingEnrichmentService],
  exports: [KnowledgeBaseService, BuildingEnrichmentService],
})
export class KnowledgeBaseModule {}

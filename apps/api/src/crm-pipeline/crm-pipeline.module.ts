import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { CrmPipelineService } from './crm-pipeline.service';
import { CrmPipelineController } from './crm-pipeline.controller';

@Module({
  imports: [PrismaModule, SuperAdminModule],
  providers: [CrmPipelineService],
  controllers: [CrmPipelineController],
  exports: [CrmPipelineService],
})
export class CrmPipelineModule {}

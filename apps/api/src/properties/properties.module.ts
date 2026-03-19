import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { CuzkImportService } from './cuzk-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, CuzkImportService],
})
export class PropertiesModule {}

import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [AssetsService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}

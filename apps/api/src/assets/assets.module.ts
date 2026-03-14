import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetPassportService } from './asset-passport.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';
import { AssetTypesModule } from '../asset-types/asset-types.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule, AssetTypesModule],
  providers: [AssetsService, AssetPassportService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}

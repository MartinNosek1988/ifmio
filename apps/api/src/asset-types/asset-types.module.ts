import { Module } from '@nestjs/common'
import { AssetTypesService } from './asset-types.service'
import { AssetTypesController } from './asset-types.controller'
import { AssetPlanInstantiationService } from './asset-plan-instantiation.service'

@Module({
  providers: [AssetTypesService, AssetPlanInstantiationService],
  controllers: [AssetTypesController],
  exports: [AssetTypesService, AssetPlanInstantiationService],
})
export class AssetTypesModule {}

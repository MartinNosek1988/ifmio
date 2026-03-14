import { Module } from '@nestjs/common'
import { AssetTypesService } from './asset-types.service'
import { AssetTypesController } from './asset-types.controller'

@Module({
  providers: [AssetTypesService],
  controllers: [AssetTypesController],
  exports: [AssetTypesService],
})
export class AssetTypesModule {}

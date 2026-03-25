import { Module } from '@nestjs/common'
import { FloorPlansService } from './floor-plans.service'
import { FloorPlansController } from './floor-plans.controller'
import { LocalStorageProvider } from '../documents/storage/local.storage'

@Module({
  providers: [FloorPlansService, LocalStorageProvider],
  controllers: [FloorPlansController],
  exports: [FloorPlansService],
})
export class FloorPlansModule {}

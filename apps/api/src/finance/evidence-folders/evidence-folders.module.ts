import { Module } from '@nestjs/common'
import { EvidenceFoldersController } from './evidence-folders.controller'
import { EvidenceFoldersService } from './evidence-folders.service'

@Module({
  controllers: [EvidenceFoldersController],
  providers: [EvidenceFoldersService],
  exports: [EvidenceFoldersService],
})
export class EvidenceFoldersModule {}

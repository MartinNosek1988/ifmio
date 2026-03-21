import { Module } from '@nestjs/common'
import { PerRollamController } from './per-rollam.controller'
import { PerRollamService } from './per-rollam.service'
import { PerRollamPdfService } from './per-rollam-pdf.service'

@Module({
  controllers: [PerRollamController],
  providers: [PerRollamService, PerRollamPdfService],
  exports: [PerRollamService],
})
export class PerRollamModule {}

import { Module } from '@nestjs/common';
import { FieldChecksController } from './field-checks.controller';
import { FieldChecksService } from './field-checks.service';

@Module({
  controllers: [FieldChecksController],
  providers: [FieldChecksService],
  exports: [FieldChecksService],
})
export class FieldChecksModule {}

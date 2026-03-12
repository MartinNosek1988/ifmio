import { Module } from '@nestjs/common';
import { PropertyScopeService } from './property-scope.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PropertyScopeService],
  exports: [PropertyScopeService],
})
export class PropertyScopeModule {}

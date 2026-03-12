import { Module } from '@nestjs/common'
import { MetersService } from './meters.service'
import { MetersController } from './meters.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [MetersService],
  controllers: [MetersController],
  exports: [MetersService],
})
export class MetersModule {}

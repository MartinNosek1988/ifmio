import { Module } from '@nestjs/common'
import { ComponentsService } from './components.service'
import { ComponentsController } from './components.controller'
import { PrismaModule } from '../../prisma/prisma.module'
import { PropertyScopeModule } from '../../common/services/property-scope.module'

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [ComponentsService],
  controllers: [ComponentsController],
  exports: [ComponentsService],
})
export class ComponentsModule {}

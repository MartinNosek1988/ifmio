import { Module } from '@nestjs/common'
import { ComponentsService } from './components.service'
import { ComponentsController } from './components.controller'
import { ComponentGeneratorService } from './component-generator.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { PropertyScopeModule } from '../../common/services/property-scope.module'
import { KontoModule } from '../../konto/konto.module'

@Module({
  imports: [PrismaModule, PropertyScopeModule, KontoModule],
  providers: [ComponentsService, ComponentGeneratorService],
  controllers: [ComponentsController],
  exports: [ComponentsService, ComponentGeneratorService],
})
export class ComponentsModule {}

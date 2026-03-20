import { Module } from '@nestjs/common'
import { UnitGroupsController } from './unit-groups.controller'
import { UnitGroupsService } from './unit-groups.service'
import { PropertyScopeModule } from '../common/services/property-scope.module'

@Module({
  imports: [PropertyScopeModule],
  controllers: [UnitGroupsController],
  providers: [UnitGroupsService],
  exports: [UnitGroupsService],
})
export class UnitGroupsModule {}

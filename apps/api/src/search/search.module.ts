import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}

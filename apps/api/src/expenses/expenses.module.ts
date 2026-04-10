import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpenseAiService } from './expense-ai.service';
import { ExpensesController } from './expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyScopeModule } from '../common/services/property-scope.module';

@Module({
  imports: [PrismaModule, PropertyScopeModule],
  providers: [ExpensesService, ExpenseAiService],
  controllers: [ExpensesController],
  exports: [ExpensesService],
})
export class ExpensesModule {}

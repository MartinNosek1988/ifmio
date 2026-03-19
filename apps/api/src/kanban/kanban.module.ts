import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { KanbanController } from './kanban.controller'
import { KanbanService } from './kanban.service'

@Module({
  imports: [PrismaModule],
  controllers: [KanbanController],
  providers: [KanbanService],
})
export class KanbanModule {}

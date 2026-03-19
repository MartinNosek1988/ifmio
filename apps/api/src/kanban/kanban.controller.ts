import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { KanbanService } from './kanban.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ROLES_OPS } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'
import { CreateKanbanTaskDto, UpdateKanbanTaskDto, MoveCardDto, KanbanQueryDto } from './dto/kanban.dto'

@ApiTags('Kanban')
@ApiBearerAuth()
@Controller('kanban')
@Roles(...ROLES_OPS)
export class KanbanController {
  constructor(private service: KanbanService) {}

  @Get('board')
  @ApiOperation({ summary: 'Agregovaný Kanban board' })
  getBoard(@CurrentUser() user: AuthUser, @Query() query: KanbanQueryDto) {
    return this.service.getBoard(user, query)
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Vytvořit ad-hoc kanban task' })
  createTask(@CurrentUser() user: AuthUser, @Body() dto: CreateKanbanTaskDto) {
    return this.service.createTask(user, dto)
  }

  @Put('tasks/:id')
  @ApiOperation({ summary: 'Upravit kanban task' })
  updateTask(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateKanbanTaskDto) {
    return this.service.updateTask(user, id, dto)
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat kanban task' })
  deleteTask(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteTask(user, id)
  }

  @Put('move')
  @ApiOperation({ summary: 'Přesunout kartu (změní status v source modelu)' })
  moveCard(@CurrentUser() user: AuthUser, @Body() dto: MoveCardDto) {
    return this.service.moveCard(user, dto)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Kanban KPI stats' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.service.getStats(user)
  }
}

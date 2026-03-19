import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateKanbanTaskDto {
  @ApiProperty() @IsString() @IsNotEmpty() title!: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string
  @ApiPropertyOptional() @IsOptional() @IsEnum(['low', 'medium', 'high', 'urgent']) priority?: string
  @ApiPropertyOptional() @IsOptional() @IsEnum(['backlog', 'todo', 'in_progress', 'review', 'done']) status?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[]
}

export class UpdateKanbanTaskDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string
  @ApiPropertyOptional() @IsOptional() @IsEnum(['low', 'medium', 'high', 'urgent']) priority?: string
  @ApiPropertyOptional() @IsOptional() @IsEnum(['backlog', 'todo', 'in_progress', 'review', 'done']) status?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[]
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number
}

export class MoveCardDto {
  @ApiProperty() @IsString() @IsNotEmpty() cardId!: string
  @ApiProperty() @IsString() @IsNotEmpty() source!: string // 'helpdesk' | 'workorder' | 'task'
  @ApiProperty() @IsString() @IsNotEmpty() sourceId!: string
  @ApiProperty() @IsString() @IsNotEmpty() newStatus!: string
  @ApiPropertyOptional() @IsOptional() @IsInt() newOrder?: number
}

export class KanbanQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() view?: string // 'my' | 'team' | 'property'
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string
}

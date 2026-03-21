import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAgendaItemDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  title!: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  requiresVote?: boolean

  @ApiPropertyOptional() @IsOptional()
  @IsEnum(['NADPOLOVICNI_PRITOMNYCH', 'NADPOLOVICNI_VSECH', 'KVALIFIKOVANA', 'JEDNOMYSLNA'])
  majorityType?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isCounterProposal?: boolean

  @ApiPropertyOptional() @IsOptional() @IsString()
  parentItemId?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

export class UpdateAgendaItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  title?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  requiresVote?: boolean

  @ApiPropertyOptional() @IsOptional()
  @IsEnum(['NADPOLOVICNI_PRITOMNYCH', 'NADPOLOVICNI_VSECH', 'KVALIFIKOVANA', 'JEDNOMYSLNA'])
  majorityType?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

export class ReorderAgendaDto {
  @ApiProperty() @IsArray() @IsString({ each: true })
  itemIds!: string[]
}

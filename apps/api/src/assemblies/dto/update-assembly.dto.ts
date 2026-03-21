import { IsString, IsOptional, IsDateString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateAssemblyDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  title?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  scheduledAt?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  location?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

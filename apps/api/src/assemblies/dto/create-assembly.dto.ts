import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAssemblyDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  title!: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiProperty() @IsString() @IsNotEmpty()
  propertyId!: string

  @ApiProperty() @IsDateString()
  scheduledAt!: string

  @ApiProperty() @IsString() @IsNotEmpty()
  location!: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

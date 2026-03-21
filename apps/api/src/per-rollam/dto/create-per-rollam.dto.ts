import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePerRollamDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  title!: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiProperty() @IsString() @IsNotEmpty()
  propertyId!: string

  @ApiProperty() @IsDateString()
  deadline!: string

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true })
  documentIds?: string[]

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

export class UpdatePerRollamDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  title?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  deadline?: string

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true })
  documentIds?: string[]

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

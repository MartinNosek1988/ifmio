import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePerRollamItemDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  title!: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiPropertyOptional() @IsOptional()
  @IsEnum(['NADPOLOVICNI_PRITOMNYCH', 'NADPOLOVICNI_VSECH', 'KVALIFIKOVANA', 'JEDNOMYSLNA'])
  majorityType?: string
}

export class UpdatePerRollamItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  title?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string

  @ApiPropertyOptional() @IsOptional()
  @IsEnum(['NADPOLOVICNI_PRITOMNYCH', 'NADPOLOVICNI_VSECH', 'KVALIFIKOVANA', 'JEDNOMYSLNA'])
  majorityType?: string
}

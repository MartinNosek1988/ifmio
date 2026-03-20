import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, Min, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUnitGroupDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name!: string
  @ApiPropertyOptional({ enum: ['entrance', 'floor', 'custom'] })
  @IsOptional() @IsEnum(['entrance', 'floor', 'custom'])
  type?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number
}

export class UpdateUnitGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string
  @ApiPropertyOptional({ enum: ['entrance', 'floor', 'custom'] })
  @IsOptional() @IsEnum(['entrance', 'floor', 'custom'])
  type?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number
}

export class AddUnitsDto {
  @ApiProperty() @IsArray() @IsString({ each: true }) unitIds!: string[]
}

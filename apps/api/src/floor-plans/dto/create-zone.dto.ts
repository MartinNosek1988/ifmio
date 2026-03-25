import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { FloorZoneType } from '@prisma/client'

export class CreateFloorPlanZoneDto {
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string
  @ApiProperty() @IsEnum(FloorZoneType) zoneType!: FloorZoneType
  @ApiProperty() @IsArray() polygon!: Array<{ x: number; y: number }>
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string
}

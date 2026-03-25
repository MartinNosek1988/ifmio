import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { FloorZoneType } from '@prisma/client'

export class ZoneItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string
  @ApiProperty() @IsEnum(FloorZoneType) zoneType!: FloorZoneType
  @ApiProperty() @IsArray() polygon!: Array<{ x: number; y: number }>
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string
}

export class UpdateZonesDto {
  @ApiProperty({ type: [ZoneItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneItemDto)
  zones!: ZoneItemDto[]
}

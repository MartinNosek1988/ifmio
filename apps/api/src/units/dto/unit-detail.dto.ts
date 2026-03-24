import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, ValidateIf } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateRoomDto {
  @ApiProperty() @IsString() name!: string
  @ApiProperty() @IsNumber() @Min(0) area!: number
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() coefficient?: number
}

export class UpdateRoomDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() area?: number
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() coefficient?: number
}

export class UpsertQuantityDto {
  @ApiProperty() @IsString() name!: string
  @ApiProperty() @IsNumber() value!: number
  @ApiPropertyOptional() @IsString() @IsOptional() unitLabel?: string
}

export class CreateEquipmentDto {
  @ApiProperty() @IsString() name!: string
  @ApiPropertyOptional() @IsEnum(['functional', 'broken', 'replaced']) @IsOptional() status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string
}

export class UpdateEquipmentDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string
  @ApiPropertyOptional() @IsEnum(['functional', 'broken', 'replaced']) @IsOptional() status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string
}

export class CreateManagementFeeDto {
  @ApiProperty() @IsNumber() @Min(0) amount!: number
  @ApiPropertyOptional() @IsEnum(['flat', 'per_area', 'per_person']) @IsOptional() calculationType?: string
  @ApiProperty() @IsDateString() validFrom!: string
  @ApiPropertyOptional() @ValidateIf((o) => o.validTo !== null) @IsDateString() @IsOptional() validTo?: string | null
}

export class UpdateManagementFeeDto {
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() amount?: number
  @ApiPropertyOptional() @IsEnum(['flat', 'per_area', 'per_person']) @IsOptional() calculationType?: string
  @ApiPropertyOptional() @IsDateString() @IsOptional() validFrom?: string
  @ApiPropertyOptional() @ValidateIf((o) => o.validTo !== null) @IsDateString() @IsOptional() validTo?: string | null
}

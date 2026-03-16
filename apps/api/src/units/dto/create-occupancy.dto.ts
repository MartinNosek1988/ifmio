import {
  IsString, IsUUID, IsEnum, IsOptional, IsDateString,
  IsNumber, IsInt, IsBoolean, Min, Max, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OccupancyRoleEnum {
  owner = 'owner',
  tenant = 'tenant',
  member = 'member',
}

export class CreateOccupancyDto {
  @ApiProperty()
  @IsUUID()
  residentId!: string;

  @ApiProperty({ enum: OccupancyRoleEnum })
  @IsEnum(OccupancyRoleEnum)
  role!: OccupancyRoleEnum;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1)
  ownershipShare?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  personCount?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isPrimaryPayer?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  variableSymbol?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  note?: string;
}

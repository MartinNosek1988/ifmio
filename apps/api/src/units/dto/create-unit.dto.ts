import {
  IsString, IsNotEmpty, IsOptional,
  IsInt, IsNumber, IsBoolean, IsEnum, IsDateString,
  Min, Max, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ example: 'Byt 2+1, 2. patro' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsInt() @Min(-5) @Max(200)
  floor?: number;

  @ApiPropertyOptional({ example: 68.5 })
  @IsOptional() @IsNumber() @Min(0)
  area?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) knDesignation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) ownDesignation?: string;
  @ApiPropertyOptional({ enum: ['RESIDENTIAL', 'NON_RESIDENTIAL', 'GARAGE', 'PARKING', 'CELLAR', 'LAND'] })
  @IsOptional() @IsEnum(['RESIDENTIAL', 'NON_RESIDENTIAL', 'GARAGE', 'PARKING', 'CELLAR', 'LAND'])
  spaceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) commonAreaShare?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) heatingArea?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tuvArea?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) heatingCoefficient?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) personCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) disposition?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasElevator?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) heatingMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) extAllocatorRef?: string;
}

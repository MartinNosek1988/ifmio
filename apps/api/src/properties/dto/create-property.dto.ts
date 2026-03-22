import { IsString, IsEnum, IsNotEmpty, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) address!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) city!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(20) postalCode!: string;
  @ApiProperty({ enum: ['bytdum', 'roddum', 'komer', 'prumysl', 'pozemek', 'garaz'] })
  @IsEnum(['bytdum', 'roddum', 'komer', 'prumysl', 'pozemek', 'garaz'])
  type!: string;
  @ApiProperty({ enum: ['vlastnictvi', 'druzstvo', 'pronajem'] })
  @IsEnum(['vlastnictvi', 'druzstvo', 'pronajem'])
  ownership!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) ico?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) dic?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVatPayer?: boolean;
  @ApiPropertyOptional({ enum: ['SVJ', 'BD', 'RENTAL', 'OWNERSHIP', 'OTHER'] })
  @IsOptional() @IsEnum(['SVJ', 'BD', 'RENTAL', 'OWNERSHIP', 'OTHER'])
  legalMode?: string;
  @ApiPropertyOptional({ enum: ['POHODA', 'MONEY_S3', 'PREMIER', 'VARIO', 'NONE'] })
  @IsOptional() @IsEnum(['POHODA', 'MONEY_S3', 'PREMIER', 'VARIO', 'NONE'])
  accountingSystem?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() managedFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() managedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) cadastralArea?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) landRegistrySheet?: string;
}

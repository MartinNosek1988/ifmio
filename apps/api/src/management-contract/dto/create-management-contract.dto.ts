import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsDateString, IsArray, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateManagementContractDto {
  @ApiProperty() @IsString() @IsNotEmpty() principalId!: string
  @ApiProperty() @IsString() @IsNotEmpty() propertyId!: string
  @ApiProperty({ enum: ['hoa_management', 'rental_management', 'technical_management', 'accounting_management', 'admin_management'] })
  @IsEnum(['hoa_management', 'rental_management', 'technical_management', 'accounting_management', 'admin_management'])
  type!: string

  @ApiPropertyOptional({ enum: ['whole_property', 'selected_units'], default: 'whole_property' })
  @IsOptional() @IsEnum(['whole_property', 'selected_units'])
  scope?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) contractNo?: string
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) unitIds?: string[]
}

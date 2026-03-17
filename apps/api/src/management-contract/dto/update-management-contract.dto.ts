import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsArray, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateManagementContractDto {
  @ApiPropertyOptional({ enum: ['hoa_management', 'rental_management', 'technical_management', 'accounting_management', 'admin_management'] })
  @IsOptional() @IsEnum(['hoa_management', 'rental_management', 'technical_management', 'accounting_management', 'admin_management'])
  type?: string
  @ApiPropertyOptional({ enum: ['whole_property', 'selected_units'] })
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

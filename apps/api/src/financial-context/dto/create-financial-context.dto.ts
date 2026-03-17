import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateFinancialContextDto {
  @ApiProperty({ enum: ['property', 'principal', 'manager'] })
  @IsEnum(['property', 'principal', 'manager'])
  scopeType!: string
  @ApiProperty() @IsString() @IsNotEmpty() displayName!: string

  @ApiPropertyOptional() @IsOptional() @IsString() principalId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() managementContractId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) code?: string
  @ApiPropertyOptional({ default: 'CZK' }) @IsOptional() @IsString() @MaxLength(3) currency?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() vatEnabled?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() vatPayer?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) invoicePrefix?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) creditNotePrefix?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) orderPrefix?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) accountingSystem?: string
  @ApiPropertyOptional() @IsOptional() @IsString() brandingName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() brandingEmail?: string
  @ApiPropertyOptional() @IsOptional() @IsString() brandingPhone?: string
  @ApiPropertyOptional() @IsOptional() @IsString() brandingWebsite?: string
  @ApiPropertyOptional() @IsOptional() @IsString() dopisOnlineUsername?: string
  @ApiPropertyOptional() @IsOptional() @IsString() dopisOnlineSender?: string
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

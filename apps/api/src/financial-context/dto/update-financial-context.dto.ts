import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateFinancialContextDto {
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() managementContractId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) code?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3) currency?: string
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
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

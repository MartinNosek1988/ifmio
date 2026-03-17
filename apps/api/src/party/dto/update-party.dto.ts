import { IsString, IsOptional, IsEnum, IsEmail, IsBoolean, MaxLength, Length } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdatePartyDto {
  @ApiPropertyOptional({ enum: ['person', 'company', 'hoa', 'organization_unit'] })
  @IsOptional() @IsEnum(['person', 'company', 'hoa', 'organization_unit'])
  type?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) displayName?: string

  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) ic?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) dic?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) vatId?: string

  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string

  @ApiPropertyOptional() @IsOptional() @IsString() street?: string
  @ApiPropertyOptional() @IsOptional() @IsString() street2?: string
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 2) countryCode?: string

  @ApiPropertyOptional() @IsOptional() @IsString() dataBoxId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string
  @ApiPropertyOptional() @IsOptional() @IsString() bankCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() iban?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

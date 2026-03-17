import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTenancyDto {
  @ApiProperty() @IsString() @IsNotEmpty() unitId!: string
  @ApiProperty() @IsString() @IsNotEmpty() partyId!: string

  @ApiProperty({ enum: ['lease', 'sublease', 'occupancy', 'short_term'] })
  @IsEnum(['lease', 'sublease', 'occupancy', 'short_term'])
  type!: string

  @ApiPropertyOptional({ enum: ['tenant', 'co_tenant', 'occupant'] })
  @IsOptional() @IsEnum(['tenant', 'co_tenant', 'occupant'])
  role?: string

  @ApiPropertyOptional() @IsOptional() @IsString() contractNo?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() moveInDate?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() rentAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() serviceAdvanceAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() depositAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateTenancyDto {
  @ApiPropertyOptional({ enum: ['lease', 'sublease', 'occupancy', 'short_term'] })
  @IsOptional() @IsEnum(['lease', 'sublease', 'occupancy', 'short_term'])
  type?: string

  @ApiPropertyOptional({ enum: ['tenant', 'co_tenant', 'occupant'] })
  @IsOptional() @IsEnum(['tenant', 'co_tenant', 'occupant'])
  role?: string

  @ApiPropertyOptional() @IsOptional() @IsString() contractNo?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() moveInDate?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() moveOutDate?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() rentAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() serviceAdvanceAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() depositAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdatePropertyOwnershipDto {
  @ApiPropertyOptional({ enum: ['legal_owner', 'beneficial_owner', 'managing_owner', 'silent_coowner'] })
  @IsOptional() @IsEnum(['legal_owner', 'beneficial_owner', 'managing_owner', 'silent_coowner'])
  role?: string

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) shareNumerator?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) shareDenominator?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() sharePercent?: number

  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

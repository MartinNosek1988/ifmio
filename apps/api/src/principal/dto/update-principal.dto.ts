import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdatePrincipalDto {
  @ApiPropertyOptional({ enum: ['hoa', 'individual_owner', 'corporate_owner', 'tenant_client', 'mixed_client'] })
  @IsOptional() @IsEnum(['hoa', 'individual_owner', 'corporate_owner', 'tenant_client', 'mixed_client'])
  type?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) displayName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) code?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

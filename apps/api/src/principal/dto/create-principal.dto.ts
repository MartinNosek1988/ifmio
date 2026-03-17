import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsDateString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePrincipalDto {
  @ApiProperty() @IsString() @IsNotEmpty() partyId!: string
  @ApiProperty({ enum: ['hoa', 'individual_owner', 'corporate_owner', 'tenant_client', 'mixed_client'] })
  @IsEnum(['hoa', 'individual_owner', 'corporate_owner', 'tenant_client', 'mixed_client'])
  type!: string
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) displayName!: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) code?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

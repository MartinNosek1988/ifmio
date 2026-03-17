import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class PrincipalQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string
  @ApiPropertyOptional({ enum: ['hoa', 'individual_owner', 'corporate_owner', 'tenant_client', 'mixed_client'] })
  @IsOptional() @IsEnum(['hoa', 'individual_owner', 'corporate_owner', 'tenant_client', 'mixed_client'])
  type?: string
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number
}

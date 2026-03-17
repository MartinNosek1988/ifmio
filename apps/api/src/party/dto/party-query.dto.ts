import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class PartyQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string
  @ApiPropertyOptional({ enum: ['person', 'company', 'hoa', 'organization_unit'] })
  @IsOptional() @IsEnum(['person', 'company', 'hoa', 'organization_unit'])
  type?: string
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number
}

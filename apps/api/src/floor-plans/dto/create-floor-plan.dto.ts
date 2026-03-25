import { IsString, IsInt, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateFloorPlanDto {
  @ApiProperty() @IsString() propertyId!: string
  @ApiProperty() @IsInt() floor!: number
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number
}

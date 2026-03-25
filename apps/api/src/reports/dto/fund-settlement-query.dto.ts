import { IsString, IsInt, IsOptional, IsArray, IsEnum } from 'class-validator'

export class FundSettlementQueryDto {
  @IsString() propertyId!: string
  @IsString() componentId!: string
  @IsInt() year!: number
  @IsOptional() @IsArray() @IsString({ each: true }) unitIds?: string[]
  @IsOptional() @IsEnum(['pdf', 'json']) format?: 'pdf' | 'json'
}

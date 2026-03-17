import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSettlementDto {
  @ApiProperty() @IsString() @IsNotEmpty() propertyId!: string
  @ApiProperty() @IsString() @IsNotEmpty() financialContextId!: string
  @ApiPropertyOptional() @IsOptional() @IsString() billingPeriodId?: string
  @ApiProperty() @IsString() @IsNotEmpty() name!: string
  @ApiProperty() @IsDateString() periodFrom!: string
  @ApiProperty() @IsDateString() periodTo!: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(40) @Max(60) heatingBasicPercent?: number
  @ApiPropertyOptional() @IsOptional() @IsString() buildingEnergyClass?: string
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

export class AddCostDto {
  @ApiProperty({ enum: ['heating', 'hot_water', 'cold_water', 'sewage', 'elevator', 'cleaning', 'lighting', 'waste', 'other'] })
  @IsString() costType!: string
  @ApiProperty() @IsString() @IsNotEmpty() name!: string
  @ApiProperty() totalAmount!: number
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceId?: string
  @ApiProperty({ enum: ['heated_area', 'floor_area', 'person_count', 'meter_reading', 'ownership_share', 'equal', 'custom'] })
  @IsString() distributionKey!: string
  @ApiPropertyOptional() @IsOptional() @IsInt() basicPercent?: number
}

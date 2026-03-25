import { IsString, IsOptional, IsNumber, IsInt, IsBoolean, IsDateString, IsArray, IsEnum, Min, Max, MinLength } from 'class-validator'

export class CreateComponentDto {
  @IsString() @MinLength(1) name!: string
  @IsOptional() @IsString() code?: string
  @IsString() componentType!: string
  @IsString() calculationMethod!: string
  @IsOptional() @IsString() allocationMethod?: string
  @IsNumber() @Min(0) defaultAmount!: number
  @IsOptional() @IsInt() @Min(0) @Max(100) vatRate?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() accountingCode?: string
  @IsOptional() @IsInt() sortOrder?: number
  @IsDateString() effectiveFrom!: string
  @IsOptional() @IsDateString() effectiveTo?: string
  // Domsys alignment fields
  @IsOptional() @IsNumber() initialBalance?: number
  @IsOptional() @IsBoolean() includeInSettlement?: boolean
  @IsOptional() @IsNumber() @Min(0) minimumPayment?: number
  @IsOptional() @IsEnum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']) ratePeriod?: string
  @IsOptional() @IsArray() @IsInt({ each: true }) ratePeriodMonths?: number[]
}

export class UpdateComponentDto {
  @IsOptional() @IsString() @MinLength(1) name?: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() componentType?: string
  @IsOptional() @IsString() calculationMethod?: string
  @IsOptional() @IsString() allocationMethod?: string
  @IsOptional() @IsNumber() @Min(0) defaultAmount?: number
  @IsOptional() @IsInt() @Min(0) @Max(100) vatRate?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() accountingCode?: string
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsDateString() effectiveFrom?: string
  @IsOptional() @IsDateString() effectiveTo?: string
  // Domsys alignment fields
  @IsOptional() @IsNumber() initialBalance?: number | null
  @IsOptional() @IsBoolean() includeInSettlement?: boolean
  @IsOptional() @IsNumber() @Min(0) minimumPayment?: number | null
  @IsOptional() @IsEnum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']) ratePeriod?: string
  @IsOptional() @IsArray() @IsInt({ each: true }) ratePeriodMonths?: number[]
}

export class AssignUnitsDto {
  @IsArray() @IsString({ each: true }) unitIds!: string[]
  @IsDateString() effectiveFrom!: string
  @IsOptional() @IsNumber() @Min(0) overrideAmount?: number
}

export class UpdateAssignmentDto {
  @IsOptional() @IsNumber() @Min(0) overrideAmount?: number | null
  @IsOptional() @IsString() note?: string
}

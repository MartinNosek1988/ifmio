import { IsString, IsOptional, IsNumber, IsInt, IsDateString, IsArray, Min, Max, MinLength } from 'class-validator'

export class CreateComponentDto {
  @IsString() @MinLength(1) name!: string
  @IsOptional() @IsString() code?: string
  @IsString() componentType!: string
  @IsString() calculationMethod!: string
  @IsNumber() @Min(0) defaultAmount!: number
  @IsOptional() @IsInt() @Min(0) @Max(100) vatRate?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() accountingCode?: string
  @IsOptional() @IsInt() sortOrder?: number
  @IsDateString() effectiveFrom!: string
  @IsOptional() @IsDateString() effectiveTo?: string
}

export class UpdateComponentDto {
  @IsOptional() @IsString() @MinLength(1) name?: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() componentType?: string
  @IsOptional() @IsString() calculationMethod?: string
  @IsOptional() @IsNumber() @Min(0) defaultAmount?: number
  @IsOptional() @IsInt() @Min(0) @Max(100) vatRate?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() accountingCode?: string
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsDateString() effectiveFrom?: string
  @IsOptional() @IsDateString() effectiveTo?: string
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

import {
  IsString, IsOptional, IsBoolean, IsInt, Min, Max,
} from 'class-validator'
import { Type } from 'class-transformer'

// ─── AssetType ────────────────────────────────────────────────────

export class CreateAssetTypeDto {
  @IsString() name!: string
  @IsString() code!: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() manufacturer?: string
  @IsOptional() @IsString() model?: string
  @IsOptional() @IsString() defaultLocationLabel?: string
}

export class UpdateAssetTypeDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() manufacturer?: string
  @IsOptional() @IsString() model?: string
  @IsOptional() @IsString() defaultLocationLabel?: string
  @IsOptional() @IsBoolean() isActive?: boolean
}

// ─── AssetType ↔ RevisionType assignment ──────────────────────────

export class CreateAssetTypeAssignmentDto {
  @IsString() revisionTypeId!: string
  @IsOptional() @IsBoolean() isRequired?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) intervalDaysOverride?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) reminderDaysOverride?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) graceDaysOverride?: number
  @IsOptional() @IsBoolean() requiresProtocolOverride?: boolean
  @IsOptional() @IsBoolean() requiresSupplierSignatureOverride?: boolean
  @IsOptional() @IsBoolean() requiresCustomerSignatureOverride?: boolean
  @IsOptional() @IsString() note?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(999) sortOrder?: number
}

export class UpdateAssetTypeAssignmentDto {
  @IsOptional() @IsBoolean() isRequired?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) intervalDaysOverride?: number | null
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) reminderDaysOverride?: number | null
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) graceDaysOverride?: number | null
  @IsOptional() @IsBoolean() requiresProtocolOverride?: boolean | null
  @IsOptional() @IsBoolean() requiresSupplierSignatureOverride?: boolean | null
  @IsOptional() @IsBoolean() requiresCustomerSignatureOverride?: boolean | null
  @IsOptional() @IsString() note?: string | null
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(999) sortOrder?: number
}

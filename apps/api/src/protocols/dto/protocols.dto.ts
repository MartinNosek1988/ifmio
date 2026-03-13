import {
  IsString, IsOptional, IsNumber, IsEnum, IsDateString,
  IsArray, ValidateNested, IsInt, Min,
} from 'class-validator'
import { Type } from 'class-transformer'

// ─── Protocol ────────────────────────────────────────────────────

export class CreateProtocolDto {
  @IsEnum(['helpdesk', 'revision', 'work_order']) sourceType!: string
  @IsString() sourceId!: string
  @IsOptional() @IsEnum(['work_report', 'handover', 'revision_report', 'service_protocol'])
  protocolType?: string
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() requesterName?: string
  @IsOptional() @IsString() dispatcherName?: string
  @IsOptional() @IsString() resolverName?: string
  @IsOptional() @IsString() categoryLabel?: string
  @IsOptional() @IsString() activityLabel?: string
  @IsOptional() @IsString() spaceLabel?: string
  @IsOptional() @IsString() tenantUnitLabel?: string
  @IsOptional() @IsDateString() submittedAt?: string
  @IsOptional() @IsDateString() dueAt?: string
  @IsOptional() transportKm?: number
  @IsOptional() @IsString() transportMode?: string
  @IsOptional() @IsString() transportDescription?: string
  @IsOptional() @IsString() publicNote?: string
  @IsOptional() @IsString() internalNote?: string
  @IsOptional() supplierSnapshot?: Record<string, unknown>
  @IsOptional() customerSnapshot?: Record<string, unknown>
}

export class UpdateProtocolDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() requesterName?: string
  @IsOptional() @IsString() dispatcherName?: string
  @IsOptional() @IsString() resolverName?: string
  @IsOptional() @IsString() categoryLabel?: string
  @IsOptional() @IsString() activityLabel?: string
  @IsOptional() @IsString() spaceLabel?: string
  @IsOptional() @IsString() tenantUnitLabel?: string
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsDateString() submittedAt?: string
  @IsOptional() @IsDateString() dueAt?: string
  @IsOptional() @IsDateString() completedAt?: string
  @IsOptional() transportKm?: number
  @IsOptional() @IsString() transportMode?: string
  @IsOptional() @IsString() transportDescription?: string
  @IsOptional() @IsString() publicNote?: string
  @IsOptional() @IsString() internalNote?: string
  @IsOptional() @IsDateString() handoverAt?: string
  @IsOptional() @IsEnum(['satisfied', 'partially_satisfied', 'dissatisfied', 'neutral'])
  satisfaction?: string
  @IsOptional() @IsString() satisfactionComment?: string
  @IsOptional() @IsString() supplierSignatureName?: string
  @IsOptional() @IsString() customerSignatureName?: string
  @IsOptional() @IsDateString() supplierSignedAt?: string
  @IsOptional() @IsDateString() customerSignedAt?: string
  @IsOptional() @IsEnum(['draft', 'completed', 'confirmed']) status?: string
  @IsOptional() supplierSnapshot?: Record<string, unknown>
  @IsOptional() customerSnapshot?: Record<string, unknown>
}

export class CompleteProtocolDto {
  @IsOptional() @IsDateString() handoverAt?: string
  @IsOptional() @IsEnum(['satisfied', 'partially_satisfied', 'dissatisfied', 'neutral'])
  satisfaction?: string
  @IsOptional() @IsString() satisfactionComment?: string
  @IsOptional() @IsString() supplierSignatureName?: string
  @IsOptional() @IsString() customerSignatureName?: string
}

// ─── Confirm ────────────────────────────────────────────────────

export class ConfirmProtocolDto {
  // Status transition only; future: generatedPdfDocumentId validation
}

// ─── Protocol Lines ──────────────────────────────────────────────

export class CreateProtocolLineDto {
  @IsOptional() @IsEnum(['labor', 'material', 'transport', 'other']) lineType?: string
  @IsString() name!: string
  @IsOptional() @IsString() unit?: string
  @IsOptional() @Type(() => Number) @IsNumber() quantity?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number
}

export class UpdateProtocolLineDto {
  @IsOptional() @IsEnum(['labor', 'material', 'transport', 'other']) lineType?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() unit?: string
  @IsOptional() @Type(() => Number) @IsNumber() quantity?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number
}

export class ReorderLineItem {
  @IsString() lineId!: string
  @Type(() => Number) @IsInt() @Min(0) sortOrder!: number
}

export class ReorderProtocolLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderLineItem)
  items!: ReorderLineItem[]
}

// ─── Generate from source ────────────────────────────────────────

export class GenerateProtocolDto {
  @IsEnum(['helpdesk', 'revision', 'work_order']) sourceType!: string
  @IsString() sourceId!: string
  @IsOptional() @IsEnum(['work_report', 'handover', 'revision_report', 'service_protocol'])
  protocolType?: string
}

export class ProtocolListQueryDto {
  @IsOptional() @IsEnum(['helpdesk', 'revision', 'work_order']) sourceType?: string
  @IsOptional() @IsString() sourceId?: string
  @IsOptional() @IsEnum(['draft', 'completed', 'confirmed']) status?: string
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsEnum(['work_report', 'handover', 'revision_report', 'service_protocol'])
  protocolType?: string
  @IsOptional() @IsEnum(['satisfied', 'partially_satisfied', 'dissatisfied', 'neutral'])
  satisfaction?: string
  @IsOptional() @IsString() search?: string
  @IsOptional() @Type(() => Number) @IsNumber() page?: number
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number
}

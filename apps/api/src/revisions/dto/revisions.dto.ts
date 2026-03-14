import {
  IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsDateString, IsInt, Min,
} from 'class-validator'
import { Type } from 'class-transformer'

// ─── RevisionSubject ──────────────────────────────────────────────

export class CreateRevisionSubjectDto {
  @IsString() name!: string
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() location?: string
  @IsOptional() @IsString() assetTag?: string
  @IsOptional() @IsString() manufacturer?: string
  @IsOptional() @IsString() model?: string
  @IsOptional() @IsString() serialNumber?: string
}

export class UpdateRevisionSubjectDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() location?: string
  @IsOptional() @IsString() assetTag?: string
  @IsOptional() @IsString() manufacturer?: string
  @IsOptional() @IsString() model?: string
  @IsOptional() @IsString() serialNumber?: string
  @IsOptional() @IsBoolean() isActive?: boolean
}

// ─── RevisionType ─────────────────────────────────────────────────

export class CreateRevisionTypeDto {
  @IsString() code!: string
  @IsString() name!: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) defaultIntervalDays?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) defaultReminderDaysBefore?: number
  @IsOptional() @IsString() color?: string
  @IsOptional() @IsBoolean() requiresProtocol?: boolean
  @IsOptional() @IsString() defaultProtocolType?: string
  @IsOptional() @IsBoolean() requiresSupplierSignature?: boolean
  @IsOptional() @IsBoolean() requiresCustomerSignature?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) graceDaysAfterEvent?: number
}

export class UpdateRevisionTypeDto {
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) defaultIntervalDays?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) defaultReminderDaysBefore?: number
  @IsOptional() @IsString() color?: string
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsBoolean() requiresProtocol?: boolean
  @IsOptional() @IsString() defaultProtocolType?: string
  @IsOptional() @IsBoolean() requiresSupplierSignature?: boolean
  @IsOptional() @IsBoolean() requiresCustomerSignature?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) graceDaysAfterEvent?: number
}

// ─── RevisionPlan ─────────────────────────────────────────────────

export class CreateRevisionPlanDto {
  @IsString() revisionSubjectId!: string
  @IsString() revisionTypeId!: string
  @IsString() title!: string
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsString() description?: string
  @Type(() => Number) @IsInt() @Min(1) intervalDays!: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) reminderDaysBefore?: number
  @IsOptional() @IsString() vendorName?: string
  @IsOptional() @IsString() responsibleUserId?: string
  @IsOptional() @IsDateString() nextDueAt?: string
  @IsOptional() @IsDateString() lastPerformedAt?: string
  @IsOptional() @IsBoolean() isMandatory?: boolean
}

export class UpdateRevisionPlanDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) intervalDays?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) reminderDaysBefore?: number
  @IsOptional() @IsString() vendorName?: string
  @IsOptional() @IsString() responsibleUserId?: string
  @IsOptional() @IsEnum(['active', 'paused', 'archived']) status?: string
  @IsOptional() @IsBoolean() isMandatory?: boolean
}

export class RevisionPlanListQueryDto {
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsString() revisionTypeId?: string
  @IsOptional() @IsString() subjectId?: string
  @IsOptional() @IsString() assetId?: string
  @IsOptional() @IsEnum(['active', 'paused', 'archived']) status?: string
  @IsOptional() @IsEnum(['compliant', 'due_soon', 'overdue', 'overdue_critical', 'performed_pending_protocol', 'performed_pending_signature', 'performed_unconfirmed']) complianceStatus?: string
  @IsOptional() @IsString() search?: string
  @IsOptional() @Type(() => Number) @IsNumber() page?: number
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number
}

// ─── RevisionEvent ────────────────────────────────────────────────

export class CreateRevisionEventDto {
  @IsString() revisionPlanId!: string
  @IsOptional() @IsDateString() scheduledAt?: string
  @IsOptional() @IsDateString() performedAt?: string
  @IsOptional() @IsDateString() validUntil?: string
  @IsOptional() @IsEnum(['passed', 'passed_with_notes', 'failed', 'cancelled', 'planned'])
  resultStatus?: string
  @IsOptional() @IsString() summary?: string
  @IsOptional() @IsString() notes?: string
  @IsOptional() @IsString() vendorName?: string
  @IsOptional() @IsString() performedBy?: string
  @IsOptional() @IsString() protocolDocumentId?: string
}

export class RecordRevisionEventDto {
  @IsOptional() @IsDateString() scheduledAt?: string
  @IsOptional() @IsDateString() performedAt?: string
  @IsOptional() @IsDateString() validUntil?: string
  @IsOptional() @IsEnum(['passed', 'passed_with_notes', 'failed', 'cancelled', 'planned'])
  resultStatus?: string
  @IsOptional() @IsString() summary?: string
  @IsOptional() @IsString() notes?: string
  @IsOptional() @IsString() vendorName?: string
  @IsOptional() @IsString() performedBy?: string
  @IsOptional() @IsString() protocolDocumentId?: string
}

export class UpdateRevisionEventDto {
  @IsOptional() @IsDateString() scheduledAt?: string
  @IsOptional() @IsDateString() performedAt?: string
  @IsOptional() @IsDateString() validUntil?: string
  @IsOptional() @IsEnum(['passed', 'passed_with_notes', 'failed', 'cancelled', 'planned'])
  resultStatus?: string
  @IsOptional() @IsString() summary?: string
  @IsOptional() @IsString() notes?: string
  @IsOptional() @IsString() vendorName?: string
  @IsOptional() @IsString() performedBy?: string
  @IsOptional() @IsString() protocolDocumentId?: string
}

import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsIn } from 'class-validator'
import { OmitType } from '@nestjs/swagger'

/** Portal DTO — propertyId is optional (auto-resolved from user's units when absent) */
export class CreateBoardMessageDto {
  @IsString() title!: string
  @IsString() body!: string
  @IsOptional() @IsString() propertyId?: string
  @IsOptional() @IsString() visibility?: string
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsBoolean() isPinned?: boolean
  @IsOptional() @IsDateString() validFrom?: string
  @IsOptional() @IsDateString() validUntil?: string
  @IsOptional() @IsArray() @IsString({ each: true }) attachmentIds?: string[]
  @IsOptional() @IsBoolean() submitForApproval?: boolean
}

/** Property-scoped DTO — propertyId is set from route param, hidden from Swagger body */
export class CreateBoardMessageBodyDto extends OmitType(CreateBoardMessageDto, ['propertyId'] as const) {}

export class UpdateBoardMessageDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() body?: string
  @IsOptional() @IsString() visibility?: string
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsBoolean() isPinned?: boolean
  @IsOptional() @IsDateString() validFrom?: string
  @IsOptional() @IsDateString() validUntil?: string
  @IsOptional() @IsArray() @IsString({ each: true }) attachmentIds?: string[]
  @IsOptional() @IsBoolean() submitForApproval?: boolean
}

export class ReviewBoardMessageDto {
  @IsIn(['PUBLISHED', 'REJECTED']) decision!: 'PUBLISHED' | 'REJECTED'
  @IsOptional() @IsString() rejectionNote?: string
}

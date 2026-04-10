import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsIn } from 'class-validator'

export class CreateBoardMessageDto {
  @IsString() title!: string
  @IsString() body!: string
  /** Set by controller from route param — not in request body */
  propertyId!: string
  @IsOptional() @IsString() visibility?: string
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsBoolean() isPinned?: boolean
  @IsOptional() @IsDateString() validFrom?: string
  @IsOptional() @IsDateString() validUntil?: string
  @IsOptional() @IsArray() @IsString({ each: true }) attachmentIds?: string[]
  @IsOptional() @IsBoolean() submitForApproval?: boolean
}

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

import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator'

export class CreateBoardMessageDto {
  @IsString() title!: string
  @IsString() body!: string
  @IsString() propertyId!: string
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
  @IsString() decision!: 'PUBLISHED' | 'REJECTED'
  @IsOptional() @IsString() rejectionNote?: string
}

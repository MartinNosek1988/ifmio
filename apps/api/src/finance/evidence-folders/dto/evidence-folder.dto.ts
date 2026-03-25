import { IsString, IsOptional, IsNumber, IsInt, IsDateString, Min, MinLength } from 'class-validator'

export class CreateEvidenceFolderDto {
  @IsString() propertyId!: string
  @IsString() @MinLength(1) name!: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() color?: string
  @IsOptional() @IsInt() sortOrder?: number
}

export class UpdateEvidenceFolderDto {
  @IsOptional() @IsString() @MinLength(1) name?: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() color?: string
  @IsOptional() @IsInt() sortOrder?: number
}

export class CreateEvidenceAllocationDto {
  @IsString() evidenceFolderId!: string
  @IsNumber() @Min(0) amount!: number
  @IsOptional() @IsInt() year?: number
  @IsOptional() @IsDateString() periodFrom?: string
  @IsOptional() @IsDateString() periodTo?: string
  @IsOptional() @IsString() note?: string
}

export class UpdateEvidenceAllocationDto {
  @IsOptional() @IsString() evidenceFolderId?: string
  @IsOptional() @IsNumber() @Min(0) amount?: number
  @IsOptional() @IsInt() year?: number
  @IsOptional() @IsDateString() periodFrom?: string
  @IsOptional() @IsDateString() periodTo?: string
  @IsOptional() @IsString() note?: string
}

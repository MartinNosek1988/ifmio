import { IsString, IsOptional, IsDateString, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'

export class SignatoryDto {
  @IsString() name!: string
  @IsString() email!: string
  @IsString() role!: string
  @IsNumber() order!: number
}

export class CreateESignRequestDto {
  @IsEnum(['management_contract', 'tenancy', 'protocol', 'custom'])
  documentType!: string

  @IsString() documentId!: string
  @IsString() documentTitle!: string
  @IsOptional() @IsString() documentUrl?: string
  @IsOptional() @IsString() message?: string
  @IsOptional() @IsDateString() expiresAt?: string

  @IsArray() @ValidateNested({ each: true }) @Type(() => SignatoryDto)
  signatories!: SignatoryDto[]
}

export class SignDocumentDto {
  @IsOptional() @IsString() signatureBase64?: string
}

export class DeclineSignatureDto {
  @IsString() reason!: string
}

export class CancelESignDto {
  @IsOptional() @IsString() reason?: string
}

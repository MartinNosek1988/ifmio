import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';

export class CreateExpenseDto {
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsEnum(['material', 'fuel', 'transport', 'tools', 'services', 'accommodation', 'food', 'other']) category!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() vendorIco?: string;
  @IsNumber() amount!: number;
  @IsOptional() @IsNumber() vatRate?: number;
  @IsOptional() @IsNumber() vatAmount?: number;
  @IsNumber() amountTotal!: number;
  @IsOptional() @IsString() currency?: string;
  @IsDateString() receiptDate!: string;
  @IsOptional() @IsString() receiptNumber?: string;
  @IsOptional() @IsString() imageBase64?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsNumber() aiConfidence?: number;
  @IsOptional() aiRawResponse?: any;
  @IsOptional() @IsEnum(['cash', 'bank_transfer', 'company_card']) reimbursementType?: string;
}

export class UpdateExpenseDto extends CreateExpenseDto {}

export class ExtractExpenseDto {
  @IsString() imageBase64!: string;
  @IsString() mimeType!: string;
}

export class RejectExpenseDto {
  @IsString() reason!: string;
}

export class ReimburseExpenseDto {
  @IsNumber() reimbursedAmount!: number;
  @IsOptional() @IsEnum(['cash', 'bank_transfer', 'company_card']) reimbursementType?: string;
}

import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsIn } from 'class-validator';

export enum ExpenseCategoryEnum {
  material = 'material',
  fuel = 'fuel',
  transport = 'transport',
  tools = 'tools',
  services = 'services',
  accommodation = 'accommodation',
  food = 'food',
  other = 'other',
}

export enum ReimbursementTypeEnum {
  cash = 'cash',
  bank_transfer = 'bank_transfer',
  company_card = 'company_card',
}

export class CreateExpenseDto {
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsEnum(ExpenseCategoryEnum) category!: ExpenseCategoryEnum;
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
  @IsOptional() @IsEnum(ReimbursementTypeEnum) reimbursementType?: ReimbursementTypeEnum;
}

export class UpdateExpenseDto extends CreateExpenseDto {}

export class ExtractExpenseDto {
  @IsString() imageBase64!: string;
  @IsIn(['image/jpeg', 'image/png']) mimeType!: string;
}

export class RejectExpenseDto {
  @IsString() reason!: string;
}

export class ReimburseExpenseDto {
  @IsNumber() reimbursedAmount!: number;
  @IsOptional() @IsEnum(ReimbursementTypeEnum) reimbursementType?: ReimbursementTypeEnum;
}

import {
  IsString, IsOptional, IsNumber, IsBoolean, IsDateString,
  IsEnum, IsArray, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineDto {
  @IsString()
  description: string;

  @IsOptional() @IsNumber()
  quantity?: number;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @IsNumber()
  unitPrice?: number;

  @IsOptional() @IsNumber()
  lineTotal?: number;

  @IsOptional() @IsNumber()
  vatRate?: number;

  @IsOptional() @IsNumber()
  vatAmount?: number;
}

export class CreateInvoiceDto {
  @IsString()
  number: string;

  @IsOptional() @IsEnum(['received', 'issued'])
  type?: string;

  @IsOptional() @IsString()
  propertyId?: string;

  @IsOptional() @IsString()
  supplierName?: string;

  @IsOptional() @IsString()
  supplierIco?: string;

  @IsOptional() @IsString()
  supplierDic?: string;

  @IsOptional() @IsString()
  buyerName?: string;

  @IsOptional() @IsString()
  buyerIco?: string;

  @IsOptional() @IsString()
  buyerDic?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsNumber() @Min(0)
  amountBase?: number;

  @IsOptional() @IsNumber()
  vatRate?: number;

  @IsOptional() @IsNumber() @Min(0)
  vatAmount?: number;

  @IsOptional() @IsNumber() @Min(0)
  amountTotal?: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsDateString()
  issueDate: string;

  @IsOptional() @IsDateString()
  duzp?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsDateString()
  paymentDate?: string;

  @IsOptional() @IsBoolean()
  isPaid?: boolean;

  @IsOptional() @IsString()
  variableSymbol?: string;

  @IsOptional() @IsString()
  transactionId?: string;

  @IsOptional() @IsString()
  supplierId?: string;

  @IsOptional() @IsString()
  buyerId?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];

  @IsOptional() @IsString()
  isdocXml?: string;

  @IsOptional() @IsString()
  note?: string;
}

export class UpdateInvoiceDto {
  @IsOptional() @IsString()
  number?: string;

  @IsOptional() @IsEnum(['received', 'issued'])
  type?: string;

  @IsOptional() @IsString()
  supplierName?: string;

  @IsOptional() @IsString()
  supplierIco?: string;

  @IsOptional() @IsString()
  supplierDic?: string;

  @IsOptional() @IsString()
  buyerName?: string;

  @IsOptional() @IsString()
  buyerIco?: string;

  @IsOptional() @IsString()
  buyerDic?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsNumber() @Min(0)
  amountBase?: number;

  @IsOptional() @IsNumber()
  vatRate?: number;

  @IsOptional() @IsNumber() @Min(0)
  vatAmount?: number;

  @IsOptional() @IsNumber() @Min(0)
  amountTotal?: number;

  @IsOptional() @IsDateString()
  issueDate?: string;

  @IsOptional() @IsDateString()
  duzp?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsDateString()
  paymentDate?: string;

  @IsOptional() @IsBoolean()
  isPaid?: boolean;

  @IsOptional() @IsString()
  variableSymbol?: string;

  @IsOptional() @IsString()
  transactionId?: string;

  @IsOptional() @IsString()
  supplierId?: string;

  @IsOptional() @IsString()
  buyerId?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];

  @IsOptional() @IsString()
  note?: string;
}

export class InvoiceListQueryDto {
  @IsOptional() @IsEnum(['received', 'issued'])
  type?: string;

  @IsOptional() @IsString()
  isPaid?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  limit?: number;
}

export class MarkPaidDto {
  @IsOptional() @IsDateString()
  paidAt?: string;

  @IsOptional() @IsString()
  paymentMethod?: string;

  @IsOptional() @IsNumber() @Min(0)
  paidAmount?: number;

  @IsOptional() @IsString()
  note?: string;
}

import {
  IsString, IsOptional, IsNumber, IsBoolean, IsDateString,
  IsEnum, IsArray, ValidateNested, ValidateIf, Min, IsNotEmpty, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineDto {
  @IsString()
  description!: string;

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

export class CreateAllocationDto {
  @IsString() componentId!: string
  @IsNumber() @Min(0) amount!: number
  @IsOptional() @IsNumber() vatRate?: number
  @IsOptional() @IsNumber() vatAmount?: number
  @IsOptional() @IsNumber() year?: number
  @IsOptional() @IsDateString() periodFrom?: string
  @IsOptional() @IsDateString() periodTo?: string
  @IsOptional() @IsNumber() consumption?: number
  @IsOptional() @IsString() consumptionUnit?: string
  @IsOptional() @IsString() targetOwnerId?: string
  @IsOptional() @IsArray() @IsString({ each: true }) unitIds?: string[]
  @IsOptional() @IsString() note?: string
}

export class UpdateAllocationDto {
  @IsOptional() @IsString() componentId?: string
  @IsOptional() @IsNumber() @Min(0) amount?: number
  @IsOptional() @IsNumber() vatRate?: number
  @IsOptional() @IsNumber() vatAmount?: number
  @IsOptional() @IsNumber() year?: number
  @IsOptional() @IsDateString() periodFrom?: string
  @IsOptional() @IsDateString() periodTo?: string
  @IsOptional() @IsNumber() consumption?: number
  @IsOptional() @IsString() consumptionUnit?: string
  @IsOptional() @ValidateIf((o) => o.targetOwnerId !== null) @IsString() targetOwnerId?: string | null
  @IsOptional() @IsArray() @IsString({ each: true }) unitIds?: string[]
  @IsOptional() @IsString() note?: string
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Číslo dokladu je povinné' })
  number!: string;

  @IsOptional() @IsEnum(['received', 'issued', 'proforma', 'credit_note', 'internal'])
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
  issueDate!: string;

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
  constantSymbol?: string;

  @IsOptional() @IsString()
  specificSymbol?: string;

  @IsOptional() @IsString()
  paymentIban?: string;

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

  @IsOptional() @IsString() @MaxLength(10 * 1024 * 1024)
  pdfBase64?: string;

  @IsOptional() @IsString()
  note?: string;
}

export class UpdateInvoiceDto {
  @IsOptional() @IsString()
  number?: string;

  @IsOptional() @IsEnum(['received', 'issued', 'proforma', 'credit_note', 'internal'])
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
  constantSymbol?: string;

  @IsOptional() @IsString()
  specificSymbol?: string;

  @IsOptional() @IsString()
  paymentIban?: string;

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
  @IsOptional() @IsEnum(['received', 'issued', 'proforma', 'credit_note', 'internal'])
  type?: string;

  @IsOptional() @IsString()
  isPaid?: string;

  @IsOptional() @IsEnum(['draft', 'submitted', 'approved'])
  approvalStatus?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  financialContextId?: string;

  @IsOptional() @IsString()
  supplier?: string;

  @IsOptional() @IsString()
  buyer?: string;

  @IsOptional() @IsString()
  number?: string;

  @IsOptional() @IsString()
  variableSymbol?: string;

  @IsOptional() @IsDateString()
  issueDateFrom?: string;

  @IsOptional() @IsDateString()
  issueDateTo?: string;

  @IsOptional() @IsDateString()
  dueDateFrom?: string;

  @IsOptional() @IsDateString()
  dueDateTo?: string;

  @IsOptional() @IsString()
  allocationStatus?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  limit?: number;
}

export class ReturnToDraftDto {
  @IsOptional() @IsString()
  reason?: string;
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

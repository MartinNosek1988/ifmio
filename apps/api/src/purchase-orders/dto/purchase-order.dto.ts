import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseOrderItemDto {
  @IsString()
  description!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsOptional()
  @IsString()
  catalogCode?: string;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  financialContextId?: string;

  // Supplier
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsString()
  supplierName!: string;

  @IsOptional()
  @IsString()
  supplierIco?: string;

  @IsOptional()
  @IsString()
  supplierDic?: string;

  @IsOptional()
  @IsString()
  supplierEmail?: string;

  // Source
  @IsOptional()
  @IsEnum(['work_order', 'helpdesk', 'manual'])
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  // Content
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  // Items
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];

  // Finance
  @IsOptional()
  @IsNumber()
  vatRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  // Dates
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdatePurchaseOrderDto extends CreatePurchaseOrderDto {}

export class CancelPurchaseOrderDto {
  @IsString()
  reason!: string;
}

export class MatchInvoiceDto {
  @IsString()
  invoiceId!: string;
}

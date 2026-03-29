import { IsString, IsOptional, IsDateString, IsNumber, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FundOpravQueryDto {
  @Type(() => Number)
  @IsInt() @IsOptional()
  year?: number;

  @IsDateString() @IsOptional()
  from?: string;

  @IsDateString() @IsOptional()
  to?: string;
}

export class CreateFundEntryDto {
  @IsEnum(['EXPENSE', 'CONTRIBUTION', 'ADJUSTMENT'])
  type!: 'EXPENSE' | 'CONTRIBUTION' | 'ADJUSTMENT';

  @IsNumber() @Min(0)
  amount!: number;

  @IsDateString()
  date!: string;

  @IsString()
  description!: string;

  @IsString() @IsOptional()
  invoiceId?: string;

  @IsString() @IsOptional()
  workOrderId?: string;
}

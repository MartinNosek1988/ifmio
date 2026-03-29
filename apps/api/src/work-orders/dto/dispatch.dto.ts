import { IsString, IsOptional, IsBoolean, IsDateString, IsInt, IsArray, Min, Max } from 'class-validator';

export class DispatchWorkOrderDto {
  @IsString()
  supplierId!: string;

  @IsOptional() @IsString()
  supplierNote?: string;

  @IsOptional() @IsBoolean()
  sendEmail?: boolean;
}

export class ConfirmWorkOrderDto {
  @IsDateString()
  eta!: string;

  @IsOptional() @IsString()
  note?: string;
}

export class DeclineWorkOrderDto {
  @IsString()
  reason!: string;
}

export class CompleteWorkOrderDto {
  @IsOptional() @IsArray() @IsString({ each: true })
  photos?: string[];

  @IsOptional() @IsString()
  completionNote?: string;
}

export class CsatDto {
  @IsInt() @Min(1) @Max(5)
  score!: number;

  @IsOptional() @IsString()
  comment?: string;
}

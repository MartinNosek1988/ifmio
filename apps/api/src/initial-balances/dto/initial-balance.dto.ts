import { IsString, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class SetOwnerBalanceDto {
  @IsString()
  propertyId!: string

  @IsString()
  unitId!: string

  @IsString()
  residentId!: string

  @IsNumber()
  amount!: number // positive = debt, negative = overpayment

  @IsDateString()
  cutoverDate!: string

  @IsOptional()
  @IsString()
  note?: string
}

export class BulkOwnerBalanceItemDto {
  @IsString()
  unitId!: string

  @IsString()
  residentId!: string

  @IsNumber()
  amount!: number

  @IsOptional()
  @IsString()
  note?: string
}

export class BulkSetOwnerBalancesDto {
  @IsString()
  propertyId!: string

  @IsDateString()
  cutoverDate!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkOwnerBalanceItemDto)
  items!: BulkOwnerBalanceItemDto[]
}

export class SetBankBalanceDto {
  @IsString()
  propertyId!: string

  @IsString()
  bankAccountId!: string

  @IsNumber()
  amount!: number

  @IsDateString()
  cutoverDate!: string

  @IsOptional()
  @IsString()
  note?: string
}

export class SetFundBalanceDto {
  @IsString()
  propertyId!: string

  @IsString()
  componentId!: string

  @IsNumber()
  amount!: number

  @IsDateString()
  cutoverDate!: string

  @IsOptional()
  @IsString()
  note?: string
}

export class SetDepositDto {
  @IsString()
  propertyId!: string

  @IsString()
  unitId!: string

  @IsString()
  residentId!: string

  @IsNumber()
  @Min(0.01)
  amount!: number

  @IsDateString()
  cutoverDate!: string

  @IsOptional()
  @IsString()
  note?: string
}

export class SetMeterReadingDto {
  @IsString()
  propertyId!: string

  @IsString()
  meterId!: string

  @IsNumber()
  @Min(0)
  value!: number

  @IsDateString()
  cutoverDate!: string

  @IsOptional()
  @IsString()
  note?: string
}

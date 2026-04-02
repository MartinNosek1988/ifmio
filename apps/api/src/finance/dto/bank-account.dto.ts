import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator'

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Název účtu je povinný' })
  name!: string

  @IsString()
  @IsNotEmpty()
  accountNumber!: string

  @IsOptional()
  @IsString()
  iban?: string

  @IsOptional()
  @IsString()
  bankCode?: string

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  propertyId?: string
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsOptional()
  @IsString()
  bankCode?: string

  @IsOptional()
  @IsString()
  iban?: string

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @IsOptional()
  @IsString()
  accountType?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

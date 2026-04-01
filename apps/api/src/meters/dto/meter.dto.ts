import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsBoolean,
} from 'class-validator'

export class CreateMeterDto {
  @IsString()
  @IsNotEmpty({ message: 'Název měřidla je povinný' })
  name!: string

  @IsString()
  @IsNotEmpty()
  serialNumber!: string

  @IsOptional()
  @IsEnum(['elektrina', 'voda_studena', 'voda_tepla', 'plyn', 'teplo'], {
    message: 'meterType musí být: elektrina, voda_studena, voda_tepla, plyn, teplo',
  })
  meterType?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  propertyId?: string

  @IsOptional()
  @IsString()
  unitId?: string

  @IsOptional()
  @IsDateString()
  installDate?: string

  @IsOptional()
  @IsDateString()
  calibrationDue?: string

  @IsOptional()
  @IsString()
  manufacturer?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsString()
  note?: string
}

export class UpdateMeterDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  serialNumber?: string

  @IsOptional()
  @IsEnum(['elektrina', 'voda_studena', 'voda_tepla', 'plyn', 'teplo'])
  meterType?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  propertyId?: string

  @IsOptional()
  @IsString()
  unitId?: string

  @IsOptional()
  @IsDateString()
  installDate?: string

  @IsOptional()
  @IsDateString()
  calibrationDue?: string

  @IsOptional()
  @IsString()
  manufacturer?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  note?: string
}

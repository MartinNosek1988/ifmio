import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator'

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty({ message: 'Název zařízení je povinný' })
  name!: string

  @IsIn(['tzb', 'stroje', 'vybaveni', 'vozidla', 'it', 'ostatni'], {
    message: 'category musí být: tzb, stroje, vybaveni, vozidla, it, ostatni',
  })
  category!: string

  @IsOptional()
  @IsString()
  propertyId?: string

  @IsOptional()
  @IsString()
  unitId?: string

  @IsOptional()
  @IsString()
  assetTypeId?: string

  @IsOptional()
  @IsString()
  manufacturer?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsString()
  serialNumber?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsIn(['aktivni', 'servis', 'vyrazeno', 'neaktivni'])
  status?: string

  @IsOptional()
  @IsDateString()
  purchaseDate?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseValue?: number

  @IsOptional()
  @IsDateString()
  warrantyUntil?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  serviceInterval?: number

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsIn(['tzb', 'stroje', 'vybaveni', 'vozidla', 'it', 'ostatni'])
  category?: string

  @IsOptional()
  @IsString()
  propertyId?: string

  @IsOptional()
  @IsString()
  unitId?: string

  @IsOptional()
  @IsString()
  assetTypeId?: string

  @IsOptional()
  @IsString()
  manufacturer?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsString()
  serialNumber?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsIn(['aktivni', 'servis', 'vyrazeno', 'neaktivni'])
  status?: string

  @IsOptional()
  @IsDateString()
  purchaseDate?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseValue?: number

  @IsOptional()
  @IsDateString()
  warrantyUntil?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  serviceInterval?: number

  @IsOptional()
  @IsString()
  notes?: string
}

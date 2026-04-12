import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class AddressDto {
  @IsNotEmpty() @IsString() @MaxLength(500)
  fullAddress!: string;

  @IsNotEmpty() @IsString() @MaxLength(200)
  street!: string;

  @IsOptional() @IsString() @MaxLength(50)
  houseNumber?: string;

  @IsNotEmpty() @IsString() @MaxLength(200)
  city!: string;

  @IsOptional() @Matches(/^\d{3}\s?\d{2}$/, { message: 'PSČ musí být ve formátu 12345 nebo 123 45' })
  postalCode?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cadastralArea?: string;

  @IsOptional() @IsNumber()
  lat?: number;

  @IsOptional() @IsNumber()
  lng?: number;

  @IsOptional() @IsString() @MaxLength(50)
  ruianCode?: string;
}

export class OwnerDto {
  @IsEnum(['person', 'company'])
  type!: 'person' | 'company';

  @ValidateIf((o) => o.type === 'person') @IsNotEmpty() @IsString() @MaxLength(100)
  firstName?: string;

  @ValidateIf((o) => o.type === 'person') @IsNotEmpty() @IsString() @MaxLength(100)
  lastName?: string;

  @ValidateIf((o) => o.type === 'company') @IsNotEmpty() @IsString() @MaxLength(200)
  companyName?: string;

  @ValidateIf((o) => o.type === 'company') @IsNotEmpty() @IsString() @MaxLength(8)
  ic?: string;

  @IsOptional() @IsString() @MaxLength(20)
  dic?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(200)
  street?: string;

  @IsOptional() @IsString() @MaxLength(200)
  city?: string;

  @IsOptional() @IsString() @MaxLength(10)
  postalCode?: string;

  @Type(() => Number) @IsInt() @Min(1)
  shareNumerator!: number;

  @Type(() => Number) @IsInt() @Min(1)
  shareDenominator!: number;

  @IsBoolean()
  isSjm!: boolean;

  @ValidateIf((o) => o.isSjm) @IsNotEmpty() @IsString() @MaxLength(100)
  sjmPartnerFirstName?: string;

  @ValidateIf((o) => o.isSjm) @IsNotEmpty() @IsString() @MaxLength(100)
  sjmPartnerLastName?: string;
}

export class RentalOwnerOnboardingDto {
  @ValidateNested() @Type(() => AddressDto)
  address!: AddressDto;

  @IsOptional() @IsString() @MaxLength(200)
  propertyName?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => OwnerDto) @ArrayMinSize(1)
  owners!: OwnerDto[];
}

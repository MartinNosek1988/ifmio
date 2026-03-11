import {
  IsString, IsOptional, IsBoolean, IsEmail, IsEnum,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString()
  orgName?: string;

  @IsOptional() @IsString()
  orgPhone?: string;

  @IsOptional() @IsEmail()
  orgEmail?: string;

  @IsOptional() @IsString()
  companyNumber?: string;

  @IsOptional() @IsString()
  vatNumber?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  bankAccount?: string;

  @IsOptional() @IsString()
  logoBase64?: string;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsString()
  language?: string;

  @IsOptional() @IsString()
  timezone?: string;

  @IsOptional() @IsString()
  dateFormat?: string;
}

export class InviteUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(['owner', 'admin', 'manager', 'technician', 'viewer'])
  role!: string;

  @IsString()
  password!: string;
}

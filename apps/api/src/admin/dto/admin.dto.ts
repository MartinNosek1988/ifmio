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

  @IsEnum(['tenant_owner', 'tenant_admin', 'property_manager', 'finance_manager', 'operations', 'viewer'])
  role!: string;

  @IsString()
  password!: string;
}

export class SendInvitationDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsEnum(['tenant_owner', 'tenant_admin', 'property_manager', 'finance_manager', 'operations', 'viewer', 'unit_owner', 'unit_tenant'])
  role!: string;

  @IsOptional() @IsString()
  propertyId?: string;

  @IsOptional() @IsString()
  unitId?: string;
}

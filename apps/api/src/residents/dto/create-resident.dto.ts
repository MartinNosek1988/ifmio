import {
  IsString, IsEmail, IsEnum, IsOptional, IsBoolean, IsDateString,
  IsNotEmpty, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResidentRoleEnum {
  owner = 'owner',
  tenant = 'tenant',
  member = 'member',
  contact = 'contact',
}

export class CreateResidentDto {
  @ApiProperty({ example: 'Jan' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Novák' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;

  @ApiProperty({ enum: ResidentRoleEnum })
  @IsEnum(ResidentRoleEnum)
  role!: ResidentRoleEnum;

  @ApiPropertyOptional({ example: 'jan.novak@email.cz' })
  @IsOptional()
  @IsEmail({}, { message: 'Neplatný email' })
  email?: string;

  @ApiPropertyOptional({ example: '+420 777 123 456' })
  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(36)
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(36)
  unitId?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLegalEntity?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) ico?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) dic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) correspondenceAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) correspondenceCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) correspondencePostalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) dataBoxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

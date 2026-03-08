import {
  IsString, IsEmail, IsEnum, IsOptional,
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
}

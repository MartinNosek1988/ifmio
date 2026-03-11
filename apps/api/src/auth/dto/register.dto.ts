import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Jan Novák' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'jan@spravadm.cz' })
  @IsEmail({}, { message: 'Neplatný email' })
  email: string;

  @ApiProperty({ example: 'heslo12345' })
  @IsString()
  @MinLength(8, { message: 'Heslo musí mít alespoň 8 znaků' })
  password: string;

  @ApiProperty({ example: 'Správa DM Praha s.r.o.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  tenantName: string;

  @ApiPropertyOptional({ example: '+420 777 123 456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  companyNumber?: string;

  @ApiPropertyOptional({ example: 'CZ12345678' })
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiPropertyOptional({ example: 'Hlavní 12, Praha 1, 110 00' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'free' })
  @IsOptional()
  @IsString()
  plan?: string;
}

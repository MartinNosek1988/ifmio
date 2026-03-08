import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}

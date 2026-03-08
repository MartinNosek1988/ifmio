import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@ifmio.cz' })
  @IsEmail({}, { message: 'Neplatný email' })
  email: string;

  @ApiProperty({ example: 'heslo12345' })
  @IsString()
  @MinLength(8, { message: 'Heslo musí mít alespoň 8 znaků' })
  password: string;
}

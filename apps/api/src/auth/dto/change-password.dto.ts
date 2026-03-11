import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'stare-heslo' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'nove-heslo-123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jan Novák' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+420 777 123 456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Facility Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ description: 'Base64 encoded avatar image' })
  @IsOptional()
  @IsString()
  avatarBase64?: string;

  @ApiPropertyOptional({ example: 'cs', enum: ['cs', 'en'] })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'Europe/Prague' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'DD.MM.YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notifEmail?: boolean;
}

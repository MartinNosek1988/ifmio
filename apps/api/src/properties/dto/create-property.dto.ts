import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() address!: string;
  @ApiProperty() @IsString() @IsNotEmpty() city!: string;
  @ApiProperty() @IsString() @IsNotEmpty() postalCode!: string;
  @ApiProperty({ enum: ['bytdum', 'roddum', 'komer', 'prumysl', 'pozemek', 'garaz'] })
  @IsEnum(['bytdum', 'roddum', 'komer', 'prumysl', 'pozemek', 'garaz'])
  type!: string;
  @ApiProperty({ enum: ['vlastnictvi', 'druzstvo', 'pronajem'] })
  @IsEnum(['vlastnictvi', 'druzstvo', 'pronajem'])
  ownership!: string;
}

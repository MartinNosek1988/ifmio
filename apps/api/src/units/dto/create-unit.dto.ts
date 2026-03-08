import {
  IsString, IsNotEmpty, IsOptional,
  IsInt, IsNumber, Min, Max, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ example: 'Byt 2+1, 2. patro' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsInt() @Min(-5) @Max(200)
  floor?: number;

  @ApiPropertyOptional({ example: 68.5 })
  @IsOptional() @IsNumber() @Min(1)
  area?: number;
}

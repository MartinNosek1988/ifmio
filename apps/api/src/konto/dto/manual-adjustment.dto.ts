import { IsNumber, IsEnum, IsString, IsOptional, IsDateString, Min, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ManualAdjustmentDto {
  @ApiProperty() @IsNumber() @Min(0.01)
  amount!: number

  @ApiProperty({ enum: ['DEBIT', 'CREDIT'] })
  @IsEnum(['DEBIT', 'CREDIT'])
  type!: 'DEBIT' | 'CREDIT'

  @ApiProperty() @IsString() @MinLength(1)
  description!: string

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  date?: string
}

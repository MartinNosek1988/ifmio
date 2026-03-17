import { IsDateString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class TerminateTenancyDto {
  @ApiProperty() @IsDateString() moveOutDate!: string
}

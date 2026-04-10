import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePortalTicketDto {
  @ApiProperty() @IsString() @IsNotEmpty() title!: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string
}

export class SendPortalMessageDto {
  @ApiProperty() @IsString() @IsNotEmpty() subject!: string
  @ApiProperty() @IsString() @IsNotEmpty() body!: string
}

export class SubmitMeterReadingDto {
  @ApiProperty() @IsNotEmpty() value!: number
  @ApiProperty() @IsString() @IsNotEmpty() readingDate!: string
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

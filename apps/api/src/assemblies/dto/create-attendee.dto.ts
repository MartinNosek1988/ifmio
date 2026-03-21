import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAttendeeDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  name!: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  principalId?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  partyId?: string

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true })
  unitIds?: string[]

  @ApiProperty() @IsNumber()
  totalShare!: number

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isPresent?: boolean

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  hasPowerOfAttorney?: boolean

  @ApiPropertyOptional() @IsOptional() @IsString()
  powerOfAttorneyFrom?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

export class UpdateAttendeeDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isPresent?: boolean

  @ApiPropertyOptional() @IsOptional() @IsString()
  leftAt?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  hasPowerOfAttorney?: boolean

  @ApiPropertyOptional() @IsOptional() @IsString()
  powerOfAttorneyFrom?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  keypadId?: string

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string
}

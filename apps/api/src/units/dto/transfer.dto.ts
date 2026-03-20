import {
  IsString, IsOptional, IsBoolean, IsDateString, IsNotEmpty,
  IsEmail, MaxLength, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class NewOwnerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() partyId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) phone?: string
}

export class TransferDto {
  @ApiProperty() @IsString() @IsNotEmpty() currentOwnerId!: string
  @ApiProperty() @IsDateString() transferDate!: string
  @ApiProperty() @ValidateNested() @Type(() => NewOwnerDto) newOwner!: NewOwnerDto
  @ApiPropertyOptional() @IsOptional() @IsString() ownershipShare?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() generateVariableSymbol?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}

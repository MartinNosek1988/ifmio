import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsNumber } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateInsuranceDto {
  @ApiProperty() @IsString() @IsNotEmpty() type!: string
  @ApiProperty() @IsString() @IsNotEmpty() provider!: string
  @ApiPropertyOptional() @IsOptional() @IsString() policyNumber?: string
  @ApiProperty() @IsDateString() @IsNotEmpty() validFrom!: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTo?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsNumber() annualPremium?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() insuredAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() deductible?: number
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string
  @ApiPropertyOptional() @IsOptional() @IsString() contactPhone?: string
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string
}

export class UpdateInsuranceDto {
  @IsOptional() @IsString() type?: string
  @IsOptional() @IsString() provider?: string
  @IsOptional() @IsString() policyNumber?: string
  @IsOptional() @IsDateString() validFrom?: string
  @IsOptional() @IsDateString() validTo?: string | null
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsNumber() annualPremium?: number | null
  @IsOptional() @IsNumber() insuredAmount?: number | null
  @IsOptional() @IsNumber() deductible?: number | null
  @IsOptional() @IsString() contactPerson?: string
  @IsOptional() @IsString() contactPhone?: string
  @IsOptional() @IsString() contactEmail?: string
  @IsOptional() @IsString() notes?: string
}

export class CreateInsuranceClaimDto {
  @ApiProperty() @IsDateString() @IsNotEmpty() eventDate!: string
  @ApiProperty() @IsString() @IsNotEmpty() description!: string
  @ApiProperty() @IsString() @IsNotEmpty() type!: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() reportedDate?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() claimedAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsString() ticketId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() workOrderId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string
}

export class UpdateInsuranceClaimDto {
  @IsOptional() @IsString() claimNumber?: string
  @IsOptional() @IsDateString() eventDate?: string
  @IsOptional() @IsDateString() reportedDate?: string | null
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() type?: string
  @IsOptional() @IsString() status?: string
  @IsOptional() @IsNumber() claimedAmount?: number | null
  @IsOptional() @IsNumber() approvedAmount?: number | null
  @IsOptional() @IsNumber() paidAmount?: number | null
  @IsOptional() @IsDateString() paidDate?: string | null
  @IsOptional() @IsString() ticketId?: string | null
  @IsOptional() @IsString() workOrderId?: string | null
  @IsOptional() @IsString() notes?: string
}

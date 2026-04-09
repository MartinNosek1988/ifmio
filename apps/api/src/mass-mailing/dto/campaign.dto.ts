import { IsString, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator'

export class CreateCampaignDto {
  @IsString() name!: string
  @IsString() subject!: string
  @IsString() body!: string
  @IsEnum(['email', 'sms', 'both']) channel!: string
  @IsEnum(['all_owners', 'all_tenants', 'all_residents', 'debtors', 'custom']) recipientType!: string
  @IsOptional() @IsArray() recipientIds?: string[]
  @IsOptional() @IsArray() propertyIds?: string[]
  @IsOptional() @IsString() propertyId?: string
}

export class UpdateCampaignDto extends CreateCampaignDto {}

export class ScheduleCampaignDto {
  @IsDateString() scheduledAt!: string
}

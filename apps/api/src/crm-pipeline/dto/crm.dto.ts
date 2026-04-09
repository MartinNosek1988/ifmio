import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreateCrmLeadDto {
  @IsOptional() @IsString() kbOrganizationId?: string;
  @IsString() companyName!: string;
  @IsOptional() @IsString() ico?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsEnum(['property_manager', 'svj_direct', 'bd_direct', 'other']) leadType!: string;
  @IsOptional() @IsEnum(['low', 'medium', 'high']) priority?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactRole?: string;
  @IsOptional() @IsNumber() estimatedUnits?: number;
  @IsOptional() @IsNumber() estimatedMrr?: number;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsDateString() nextFollowUpAt?: string;
}

export class UpdateCrmLeadDto extends CreateCrmLeadDto {}

export class ChangeStageDto {
  @IsEnum(['new_lead', 'contacted', 'demo_scheduled', 'demo_done', 'trial', 'negotiation', 'won', 'lost', 'not_interested'])
  stage!: string;
  @IsOptional() @IsString() closedReason?: string;
}

export class AddActivityDto {
  @IsEnum(['call', 'email', 'meeting', 'demo', 'note']) type!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() body?: string;
}

export class ImportFromKbDto {
  @IsArray() @IsString({ each: true }) ids!: string[];
}

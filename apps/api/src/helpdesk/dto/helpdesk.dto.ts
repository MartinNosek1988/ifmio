import {
  IsString, IsOptional, IsNumber, IsEnum, IsArray,
  IsDateString, IsBooleanString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HelpdeskListQueryDto {
  @IsOptional() @IsEnum(['open', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @IsOptional() @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional() @IsString()
  propertyId?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsBooleanString()
  overdue?: string;

  @IsOptional() @IsBooleanString()
  escalated?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  limit?: number;
}

export class CreateTicketDto {
  @IsString()
  title!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(['general', 'plumbing', 'electrical', 'hvac', 'structural', 'cleaning', 'other'])
  category?: string;

  @IsOptional() @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional() @IsString()
  propertyId?: string;

  @IsOptional() @IsString()
  unitId?: string;

  @IsOptional() @IsString()
  residentId?: string;
}

export class UpdateTicketDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(['general', 'plumbing', 'electrical', 'hvac', 'structural', 'cleaning', 'other'])
  category?: string;

  @IsOptional() @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional() @IsEnum(['open', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @IsOptional() @IsString()
  propertyId?: string;

  @IsOptional() @IsString()
  unitId?: string;

  @IsOptional() @IsString()
  residentId?: string;

  @IsOptional() @IsString()
  assigneeId?: string;

  @IsOptional() @IsDateString()
  resolvedAt?: string;
}

export class AssignTicketDto {
  @IsString()
  assigneeId!: string;
}

export class CreateItemDto {
  @IsString()
  description!: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @IsOptional() @IsNumber() @Min(0)
  unitPrice?: number;
}

export class CreateProtocolDto {
  @IsOptional() @IsString()
  workDescription?: string;

  @IsOptional() @IsString()
  findings?: string;

  @IsOptional() @IsString()
  recommendation?: string;

  @IsOptional() @IsString()
  technicianName?: string;

  @IsOptional() @IsDateString()
  completedAt?: string;

  @IsOptional() @IsString()
  signatureBase64?: string;
}

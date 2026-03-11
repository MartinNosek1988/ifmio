import {
  IsString, IsOptional, IsNumber, IsEnum, IsArray,
  IsDateString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReminderListQueryDto {
  @IsOptional() @IsString()
  residentId?: string;

  @IsOptional() @IsEnum(['draft', 'sent', 'paid', 'cancelled'])
  status?: string;

  @IsOptional() @IsEnum(['first', 'second', 'third'])
  level?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  limit?: number;
}

export class CreateReminderDto {
  @IsString()
  residentId!: string;

  @IsOptional() @IsString()
  templateId?: string;

  @IsEnum(['first', 'second', 'third'])
  level!: string;

  @IsNumber() @Min(0)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional() @IsString()
  note?: string;
}

export class BulkCreateRemindersDto {
  @IsArray() @IsString({ each: true })
  residentIds!: string[];

  @IsEnum(['first', 'second', 'third'])
  level!: string;

  @IsOptional() @IsString()
  templateId?: string;

  @IsOptional() @IsNumber() @Min(0)
  amount?: number;

  @IsDateString()
  dueDate!: string;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  subject?: string;

  @IsOptional() @IsString()
  body?: string;

  @IsOptional() @IsNumber()
  dueDays?: number;
}

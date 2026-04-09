import { IsOptional, IsString, IsNumber, IsDateString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistItemDto {
  @IsString() id!: string;
  @IsString() label!: string;
  @IsBoolean() done!: boolean;
  @IsOptional() @IsString() note?: string;
}

export class StartWorkDto {
  @IsOptional() @IsNumber() gpsStartLat?: number;
  @IsOptional() @IsNumber() gpsStartLng?: number;
}

export class CompleteWorkDto {
  @IsOptional() @IsNumber() gpsEndLat?: number;
  @IsOptional() @IsNumber() gpsEndLng?: number;
  @IsOptional() @IsString() technicianNote?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];
}

export class AddSignatureDto {
  @IsString() signatureBase64!: string;
  @IsString() signedByName!: string;
}

export class AddMaterialDto {
  @IsString() name!: string;
  @IsString() unit!: string;
  @IsNumber() quantity!: number;
  @IsNumber() unitPrice!: number;
  @IsOptional() @IsString() catalogCode?: string;
}

export class ScheduleWorkOrderDto {
  @IsDateString() scheduledDate!: string;
  @IsOptional() @IsString() scheduledTimeFrom?: string;
  @IsOptional() @IsString() scheduledTimeTo?: string;
  @IsOptional() @IsString() assigneeUserId?: string;
}

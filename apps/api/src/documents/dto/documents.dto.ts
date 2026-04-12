import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentListQueryDto {
  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  entityType?: string;

  @IsOptional() @IsString()
  entityId?: string;

  @IsOptional() @IsString()
  tag?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  propertyId?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  limit?: number;
}

import { IsOptional, IsString, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpsertSlaPolicyDto {
  @IsOptional() @IsString()
  propertyId?: string | null

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  lowResponseH?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  lowResolutionH?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  mediumResponseH?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  mediumResolutionH?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  highResponseH?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  highResolutionH?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  urgentResponseH?: number

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  urgentResolutionH?: number
}

import { Type } from 'class-transformer'
import { IsOptional, IsNumber, IsInt, IsString } from 'class-validator'

export class UpdateBuildingUnitDto {
  @IsOptional() @IsNumber() area?: number | null
  @IsOptional() @Type(() => Number) @IsInt() floor?: number | null
  @IsOptional() @IsString() roomLayout?: string | null
}

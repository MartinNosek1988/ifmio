import { IsOptional, IsNumber, IsString } from 'class-validator'

export class UpdateBuildingUnitDto {
  @IsOptional() @IsNumber() area?: number | null
  @IsOptional() @IsNumber() floor?: number | null
  @IsOptional() @IsString() roomLayout?: string | null
}

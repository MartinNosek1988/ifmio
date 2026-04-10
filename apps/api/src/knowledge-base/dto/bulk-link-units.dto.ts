import { IsOptional, IsBoolean } from 'class-validator'

export class BulkLinkUnitsDto {
  @IsOptional() @IsBoolean() dryRun?: boolean
}

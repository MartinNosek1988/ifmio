import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  activityTypeId!: string;

  @IsString()
  title!: string;

  @IsOptional() @IsString()
  note?: string;

  @IsDateString()
  deadline!: string;

  @IsString()
  assignedToId!: string;
}

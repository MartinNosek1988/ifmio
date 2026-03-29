import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString() @IsNotEmpty()
  body!: string;

  @IsArray() @IsOptional() @IsString({ each: true })
  mentionUserIds?: string[];
}

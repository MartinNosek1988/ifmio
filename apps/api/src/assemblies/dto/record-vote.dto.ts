import { IsString, IsEnum, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

class SingleVoteDto {
  @ApiProperty() @IsString()
  attendeeId!: string

  @ApiProperty() @IsEnum(['ANO', 'NE', 'ZDRZET'])
  choice!: string
}

export class RecordVotesDto {
  @ApiProperty({ type: [SingleVoteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleVoteDto)
  votes!: SingleVoteDto[]
}

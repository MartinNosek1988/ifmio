import { IsString, IsEnum, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

class BallotVoteDto {
  @ApiProperty() @IsString()
  itemId!: string

  @ApiProperty() @IsEnum(['ANO', 'NE', 'ZDRZET'])
  choice!: string
}

export class SubmitBallotDto {
  @ApiProperty({ type: [BallotVoteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BallotVoteDto)
  votes!: BallotVoteDto[]
}

export class ManualEntryDto {
  @ApiProperty({ type: [BallotVoteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BallotVoteDto)
  votes!: BallotVoteDto[]
}

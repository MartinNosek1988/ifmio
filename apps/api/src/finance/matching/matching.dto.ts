import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator'
import { MatchTarget } from '@prisma/client'

export class ManualMatchDto {
  @IsEnum(MatchTarget)
  target!: MatchTarget

  @IsOptional()
  @IsString()
  entityId?: string

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number

  @IsOptional()
  @IsString()
  note?: string
}

export class AutoMatchDto {
  @IsOptional()
  @IsString()
  propertyId?: string

  @IsOptional()
  @IsString()
  bankAccountId?: string
}

export class MatchAllDto {
  @IsString()
  propertyId!: string
}

export interface MatchResult {
  txId: string
  matchedTo: string | null
  confidence: 'exact' | 'vs_only' | 'amount_only' | 'none'
  target: MatchTarget | null
  amount: number
  note?: string
}

export interface AutoMatchResponse {
  total: number
  matched: number
  unmatched: number
  results: MatchResult[]
}

export interface MatchSuggestion {
  entityId: string
  entityType: 'prescription' | 'invoice'
  label: string
  amount: number
  vs?: string
  confidence: 'exact' | 'vs_match' | 'amount_match' | 'none'
  period?: string
  residentName?: string
  outstanding?: number
}

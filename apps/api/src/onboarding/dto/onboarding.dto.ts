import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, MaxLength } from 'class-validator'

export class OnboardingStep1Dto {
  @IsEnum(['SELF_MANAGED_HOA', 'MANAGEMENT_COMPANY', 'RENTAL_OWNER'])
  archetype!: string
}

export class OnboardingStep2Dto {
  @IsNotEmpty() @MaxLength(200)
  name!: string

  @IsOptional() @IsString() @MaxLength(8)
  ico?: string

  @IsOptional() @IsString() @MaxLength(12)
  dic?: string

  @IsOptional() @IsString()
  legalForm?: string
}

export class OnboardingStep3Dto {
  @IsNotEmpty() @MaxLength(200)
  name!: string

  @IsNotEmpty() @IsString()
  address!: string

  @IsNotEmpty() @IsString()
  city!: string

  @IsNotEmpty() @IsString()
  postalCode!: string

  @IsEnum(['SVJ', 'BD', 'RENTAL_RESIDENTIAL', 'RENTAL_MUNICIPAL', 'MIXED_USE', 'SINGLE_FAMILY'])
  type!: string

  @IsOptional() @IsString() @MaxLength(8)
  ico?: string
}

export class OnboardingStep4Dto {
  @IsOptional() @IsArray() @IsString({ each: true })
  actions?: string[]
}

import { Controller, Get, Post, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { OnboardingService } from './onboarding.service'
import { OnboardingStep1Dto, OnboardingStep2Dto, OnboardingStep3Dto, OnboardingStep4Dto } from './dto/onboarding.dto'
import type { AuthUser } from '@ifmio/shared-types'

@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Aktuální stav onboardingu' })
  getStatus(@CurrentUser() user: AuthUser) {
    return this.service.getStatus(user.tenantId)
  }

  @Post('step/1')
  @ApiOperation({ summary: 'Krok 1: Typ subjektu (archetype)' })
  step1(@CurrentUser() user: AuthUser, @Body() dto: OnboardingStep1Dto) {
    return this.service.completeStep1(user.tenantId, dto)
  }

  @Post('step/2')
  @ApiOperation({ summary: 'Krok 2: Údaje subjektu (Party + Principal)' })
  step2(@CurrentUser() user: AuthUser, @Body() dto: OnboardingStep2Dto) {
    return this.service.completeStep2(user.tenantId, dto)
  }

  @Post('step/3')
  @ApiOperation({ summary: 'Krok 3: První nemovitost (Property + ManagementContract + FinancialContext)' })
  step3(@CurrentUser() user: AuthUser, @Body() dto: OnboardingStep3Dto) {
    return this.service.completeStep3(user.tenantId, user.id, dto)
  }

  @Post('step/4')
  @ApiOperation({ summary: 'Krok 4: Výběr akcí (dokončení onboardingu)' })
  step4(@CurrentUser() user: AuthUser, @Body() dto: OnboardingStep4Dto) {
    return this.service.completeStep4(user.tenantId, dto)
  }
}

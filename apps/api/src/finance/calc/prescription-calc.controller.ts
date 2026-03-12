import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrescriptionCalcService } from './prescription-calc.service';
import type { CalcInput } from './prescription-calc.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_FINANCE, ROLES_FINANCE_DRAFT } from '../../common/constants/roles.constants';
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Prescription Calculator')
@ApiBearerAuth()
@Controller('finance/calc')
export class PrescriptionCalcController {
  constructor(private service: PrescriptionCalcService) {}

  @Post('preview')
  @HttpCode(200)
  @Roles(...ROLES_FINANCE_DRAFT)
  @ApiOperation({ summary: 'Nahlед rozložení nákladů na jednotky' })
  preview(@CurrentUser() user: AuthUser, @Body() body: CalcInput) {
    return this.service.preview(user, body);
  }

  @Post('execute')
  @HttpCode(200)
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvořit předpisy podle kalkulace' })
  execute(@CurrentUser() user: AuthUser, @Body() body: CalcInput) {
    return this.service.execute(user, body);
  }
}

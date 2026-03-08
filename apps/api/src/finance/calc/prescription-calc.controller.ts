import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrescriptionCalcService } from './prescription-calc.service';
import type { CalcInput } from './prescription-calc.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES_WRITE } from '../../common/constants/roles.constants';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('Prescription Calculator')
@ApiBearerAuth()
@Controller('finance/calc')
export class PrescriptionCalcController {
  constructor(private service: PrescriptionCalcService) {}

  @Post('preview')
  @HttpCode(200)
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Nahlед rozložení nákladů na jednotky' })
  preview(@CurrentUser() user: AuthUser, @Body() body: CalcInput) {
    return this.service.preview(user, body);
  }

  @Post('execute')
  @HttpCode(200)
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Vytvořit předpisy podle kalkulace' })
  execute(@CurrentUser() user: AuthUser, @Body() body: CalcInput) {
    return this.service.execute(user, body);
  }
}

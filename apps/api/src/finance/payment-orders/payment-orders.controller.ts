import { Controller, Get, Post, Delete, Param, Body, Res, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PaymentOrdersService } from './payment-orders.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ROLES_FINANCE } from '../../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'
import type { FastifyReply } from 'fastify'

@ApiTags('Payment Orders')
@ApiBearerAuth()
@Controller('finance/payment-orders')
export class PaymentOrdersController {
  constructor(private service: PaymentOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam příkazů k úhradě' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail příkazu' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getDetail(user, id)
  }

  @Post()
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Vytvořit příkaz k úhradě' })
  create(@CurrentUser() user: AuthUser, @Body() dto: {
    bankAccountId: string; financialContextId: string; note?: string;
    items: Array<{ counterpartyName?: string; counterpartyAccount: string; counterpartyBankCode: string; amount: number; variableSymbol?: string; specificSymbol?: string; constantSymbol?: string; description?: string; invoiceId?: string; prescriptionId?: string }>
  }) {
    return this.service.create(user, dto)
  }

  @Delete(':id')
  @Roles(...ROLES_FINANCE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Zrušit příkaz' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancel(user, id)
  }

  @Post(':id/export')
  @Roles(...ROLES_FINANCE)
  @ApiOperation({ summary: 'Exportovat příkaz (PDF/ABO)' })
  async exportOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { format: 'pdf' | 'abo' },
    @Res() reply?: FastifyReply,
  ) {
    const buffer = await this.service.exportOrder(user, id, body.format)
    const ext = body.format === 'pdf' ? 'pdf' : 'abo'
    const mime = body.format === 'pdf' ? 'application/pdf' : 'text/plain; charset=ascii'
    reply!.header('Content-Type', mime).header('Content-Disposition', `attachment; filename="prikaz-${id.slice(0, 8)}.${ext}"`).send(buffer)
  }
}

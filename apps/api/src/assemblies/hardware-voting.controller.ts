import { Controller, Get, Post, Delete, Body, Param, Headers, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import { ROLES_MANAGE } from '../common/constants/roles.constants'
import type { AuthUser } from '@ifmio/shared-types'
import { HardwareVotingService } from './hardware-voting.service'

@ApiTags('Hardware Voting')
@Controller()
export class HardwareVotingController {
  constructor(private service: HardwareVotingService) {}

  // ─── Session management (admin, auth required) ─────────────────

  @Post('assemblies/:id/hardware-session')
  @ApiBearerAuth()
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Vytvořit hardware session' })
  createSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.createSession(user, id)
  }

  @Get('assemblies/:id/hardware-session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stav hardware session' })
  getSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getSession(user, id)
  }

  @Delete('assemblies/:id/hardware-session')
  @ApiBearerAuth()
  @Roles(...ROLES_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deaktivovat hardware session' })
  deactivateSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivateSession(user, id)
  }

  // ─── Voting control (admin) ────────────────────────────────────

  @Post('assemblies/:id/hardware-session/open-voting')
  @ApiBearerAuth()
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Otevřít hlasování pro bod programu' })
  openVoting(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { agendaItemId: string },
  ) {
    return this.service.openVoting(user, id, body.agendaItemId)
  }

  @Post('assemblies/:id/hardware-session/reset-voting')
  @ApiBearerAuth()
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Opakovat hlasování (smazat hlasy a znovu otevřít)' })
  resetVoting(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.resetVoting(user, id)
  }

  @Post('assemblies/:id/hardware-session/close-voting')
  @ApiBearerAuth()
  @Roles(...ROLES_MANAGE)
  @ApiOperation({ summary: 'Uzavřít hlasování a vyhodnotit' })
  closeVoting(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.closeVoting(user, id)
  }

  // ─── Bridge agent endpoints (auth by X-Bridge-Api-Key) ─────────

  @Post('hardware/vote')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Přijmout hlas z bridge agenta' })
  receiveVote(
    @Headers('x-bridge-api-key') apiKey: string,
    @Body() body: { keypadId: string; choice: string; timestamp: number },
  ) {
    return this.service.receiveVote(apiKey, body)
  }

  @Post('hardware/ping')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Heartbeat z bridge agenta' })
  receivePing(
    @Headers('x-bridge-api-key') apiKey: string,
    @Body() body: { timestamp: number; keypadCount?: number },
  ) {
    return this.service.receivePing(apiKey, body)
  }
}

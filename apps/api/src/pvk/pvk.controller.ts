import {
  Controller, Get, Post, Delete, Body, Param, Req,
} from '@nestjs/common';
import { PvkService } from './pvk.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLES_MANAGE } from '../common/constants/roles.constants';
import type { AuthUser } from '@ifmio/shared-types';

@Controller('pvk')
export class PvkController {
  constructor(private pvk: PvkService) {}

  @Post('credentials')
  @Roles(...ROLES_MANAGE)
  saveCredentials(
    @Req() req: { user: AuthUser },
    @Body() body: { email: string; password: string },
  ) {
    return this.pvk.saveCredentials(req.user, body.email, body.password);
  }

  @Get('credentials')
  @Roles(...ROLES_MANAGE)
  getCredentials(@Req() req: { user: AuthUser }) {
    return this.pvk.getCredentials(req.user);
  }

  @Delete('credentials/:id')
  @Roles(...ROLES_MANAGE)
  deleteCredentials(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    return this.pvk.deleteCredentials(req.user, id);
  }

  @Post('sync')
  @Roles(...ROLES_MANAGE)
  async sync(@Req() req: { user: AuthUser }) {
    return this.pvk.syncTenant(req.user.tenantId);
  }

  @Get('sync/log')
  @Roles(...ROLES_MANAGE)
  getSyncLogs(@Req() req: { user: AuthUser }) {
    return this.pvk.getSyncLogs(req.user);
  }
}

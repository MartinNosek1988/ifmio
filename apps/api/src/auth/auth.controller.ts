import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { RequestMeta } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthUser } from '@ifmio/shared-types';

function extractMeta(req: any): RequestMeta {
  return {
    ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip,
    userAgent: req.headers?.['user-agent'],
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Registrace — vytvoří tenant + owner účet' })
  register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.auth.register(dto, extractMeta(req));
  }

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Přihlášení' })
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, extractMeta(req));
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Odhlášení' })
  logout(@CurrentUser() user: AuthUser, @Req() req: any) {
    return this.auth.logout(user.id, extractMeta(req));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktuální uživatel + tenant info' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @Get('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Avatar uživatele (base64 nebo 204)' })
  async avatar(@CurrentUser() user: AuthUser, @Res() reply: any) {
    const u = await this.auth.getAvatar(user.id);
    if (!u) {
      reply.status(204).send();
      return;
    }
    reply.header('Cache-Control', 'private, max-age=3600');
    reply.header('Content-Type', 'application/json');
    reply.send({ avatarBase64: u });
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktualizace profilu uživatele' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Změna hesla' })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.auth.changePassword(user.id, dto, extractMeta(req));
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obnovení access tokenu pomocí refresh tokenu' })
  refresh(@Body() body: { refreshToken: string }, @Req() req: any) {
    return this.auth.refresh(body.refreshToken, extractMeta(req));
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ověření emailu pomocí tokenu' })
  verifyEmail(@Body() body: { token: string }) {
    return this.auth.verifyEmail(body.token);
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Žádost o obnovu hesla' })
  async forgotPassword(@Body() body: { email: string }) {
    await this.auth.forgotPassword(body.email);
    return { message: 'ok' };
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nastavení nového hesla pomocí reset tokenu' })
  async resetPassword(@Body() body: { token: string; password: string }) {
    await this.auth.resetPassword(body.token, body.password);
    return { message: 'ok' };
  }

  @Public()
  @Get('invitation-info/:token')
  @ApiOperation({ summary: 'Informace o pozvánce' })
  getInvitationInfo(@Param('token') token: string) {
    return this.auth.getInvitationInfo(token);
  }

  @Public()
  @Post('accept-invitation')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Přijmout pozvánku a vytvořit účet' })
  acceptInvitation(@Body() body: { token: string; password: string; name?: string }) {
    return this.auth.acceptInvitation(body.token, body.password, body.name);
  }

  // ─── Sessions ──────────────────────────────────────────────

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktivní relace uživatele' })
  getSessions(@CurrentUser() user: AuthUser) {
    return this.auth.getSessions(user.id);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Odvolat konkrétní relaci' })
  revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.auth.revokeSession(user.id, id);
  }

  @Delete('sessions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Odvolat všechny ostatní relace' })
  revokeAllOtherSessions(
    @CurrentUser() user: AuthUser,
    @Body() body: { currentToken: string },
  ) {
    return this.auth.revokeAllOtherSessions(user.id, body.currentToken);
  }

  @Get('login-history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historie přihlášení' })
  getLoginHistory(@CurrentUser() user: AuthUser) {
    return this.auth.getLoginHistory(user.id);
  }

  // ─── 2FA ───────────────────────────────────────────────────

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Zahájit nastavení 2FA' })
  setup2fa(@CurrentUser() user: AuthUser) {
    return this.auth.setup2fa(user.id);
  }

  @Post('2fa/verify')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ověřit a aktivovat 2FA' })
  verify2fa(@CurrentUser() user: AuthUser, @Body() body: { code: string }) {
    return this.auth.verify2fa(user.id, body.code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deaktivovat 2FA' })
  disable2fa(
    @CurrentUser() user: AuthUser,
    @Body() body: { code: string; password: string },
  ) {
    return this.auth.disable2fa(user.id, body.code, body.password);
  }

  @Public()
  @Post('2fa/validate')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dokončit přihlášení s 2FA kódem' })
  validate2fa(@Body() body: { tempToken: string; code: string }, @Req() req: any) {
    return this.auth.validate2fa(body.tempToken, body.code, extractMeta(req));
  }

  // ─── OAuth SSO ─────────────────────────────────────────────

  @Public()
  @Post('oauth/token')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth token exchange — přihlášení přes Google/Facebook/Microsoft' })
  async oauthTokenExchange(
    @Body() body: { provider: string; accessToken: string },
    @Req() req: any,
  ) {
    const profile = await this.auth.verifyOAuthToken(body.provider, body.accessToken);
    return this.auth.handleOAuthLogin(profile, extractMeta(req));
  }

  @Public()
  @Post('oauth/accept-invitation')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Přijmout pozvánku přes OAuth' })
  async acceptInvitationWithOAuth(
    @Body() body: { token: string; provider: string; accessToken: string },
    @Req() req: any,
  ) {
    const profile = await this.auth.verifyOAuthToken(body.provider, body.accessToken);
    return this.auth.acceptInvitationWithOAuth(
      body.token, profile.provider, profile.oauthId, profile.email, profile.name,
      extractMeta(req),
    );
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
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
}

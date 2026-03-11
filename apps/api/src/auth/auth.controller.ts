import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrace — vytvoří tenant + owner účet' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Přihlášení' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Odhlášení' })
  logout(@CurrentUser() user: AuthUser) {
    return this.auth.logout(user.id);
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
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ověření emailu pomocí tokenu' })
  verifyEmail(@Body() body: { token: string }) {
    return this.auth.verifyEmail(body.token);
  }
}

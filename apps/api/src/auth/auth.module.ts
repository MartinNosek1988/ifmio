import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { TokenBlacklistService } from './token-blacklist.service';
import { ApiKeyService } from './api-key.service';
import { RiskScoringService } from './risk-scoring.service';
import { CryptoService } from '../common/crypto.service';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    MicrosoftStrategy,
    CryptoService,
    TokenBlacklistService,
    ApiKeyService,
    RiskScoringService,
  ],
  controllers: [AuthController, ApiKeyController],
  exports: [AuthService, TokenBlacklistService, ApiKeyService, RiskScoringService, JwtModule],
})
export class AuthModule {}

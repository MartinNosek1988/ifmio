import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured'
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured'
    const callbackBase = config.get<string>('OAUTH_CALLBACK_BASE') || 'http://localhost:3000/api/v1/auth/oauth'

    super({
      clientID,
      clientSecret,
      callbackURL: `${callbackBase}/google/callback`,
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    done(null, {
      provider: 'google',
      oauthId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    })
  }
}

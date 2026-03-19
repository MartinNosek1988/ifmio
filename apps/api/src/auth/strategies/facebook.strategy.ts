import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-facebook'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('FACEBOOK_APP_ID') || 'not-configured'
    const clientSecret = config.get<string>('FACEBOOK_APP_SECRET') || 'not-configured'
    const callbackBase = config.get<string>('OAUTH_CALLBACK_BASE') || 'http://localhost:3000/api/v1/auth/oauth'

    super({
      clientID,
      clientSecret,
      callbackURL: `${callbackBase}/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'displayName'],
      scope: ['email'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ) {
    done(null, {
      provider: 'facebook',
      oauthId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName || `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim(),
    })
  }
}

import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
// @ts-expect-error — passport-microsoft has no type declarations
import { Strategy } from 'passport-microsoft'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('MICROSOFT_CLIENT_ID') || config.get<string>('M365_CLIENT_ID') || 'not-configured'
    const clientSecret = config.get<string>('MICROSOFT_CLIENT_SECRET') || config.get<string>('M365_CLIENT_SECRET') || 'not-configured'
    const tenant = config.get<string>('MICROSOFT_TENANT_ID') || config.get<string>('M365_TENANT_ID') || 'common'
    const callbackBase = config.get<string>('OAUTH_CALLBACK_BASE') || 'http://localhost:3000/api/v1/auth/oauth'

    super({
      clientID,
      clientSecret,
      callbackURL: `${callbackBase}/microsoft/callback`,
      scope: ['user.read'],
      tenant,
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ) {
    done(null, {
      provider: 'microsoft',
      oauthId: profile.id,
      email: profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName,
      name: profile.displayName,
    })
  }
}

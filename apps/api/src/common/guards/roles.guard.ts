import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';
import { ROLE_MIGRATION_MAP } from '../constants/roles.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;

    const { user } = ctx.switchToHttp().getRequest();
    // Support old role names from pre-migration JWTs
    const role: UserRole = ROLE_MIGRATION_MAP[user?.role] ?? user?.role;
    if (!required.includes(role)) {
      throw new ForbiddenException('Nemáte oprávnění pro tuto akci');
    }
    return true;
  }
}

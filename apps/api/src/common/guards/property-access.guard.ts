import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../prisma/prisma.service'
import { PROPERTY_SCOPED_KEY } from '../decorators/property-scoped.decorator'
import type { AuthUser } from '@ifmio/shared-types'

const TENANT_WIDE_ROLES = ['tenant_owner', 'tenant_admin']

@Injectable()
export class PropertyAccessGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Only activate on @PropertyScoped() decorated endpoints
    const isScoped = this.reflector.getAllAndOverride<boolean>(PROPERTY_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!isScoped) return true

    const request = context.switchToHttp().getRequest()
    const user: AuthUser | undefined = request.user
    if (!user) return true // unauthenticated → JwtAuthGuard handles this

    // Owner and admin have tenant-wide access
    if (TENANT_WIDE_ROLES.includes(user.role)) return true

    // Extract propertyId from request
    const propertyId = request.params?.propertyId
      || request.params?.id
      || request.query?.propertyId
      || request.body?.propertyId

    if (!propertyId) return true // no property context

    // Check UserPropertyAssignment (existing mechanism)
    const assignment = await this.prisma.userPropertyAssignment.findFirst({
      where: { userId: user.id, propertyId },
    })

    if (assignment) return true

    // Check ManagementContract (contract-based scoping)
    const contract = await this.prisma.managementContract.findFirst({
      where: {
        tenantId: user.tenantId,
        propertyId,
        isActive: true,
      },
    })

    if (contract) return true

    throw new ForbiddenException('Nemáte přístup k této nemovitosti')
  }
}

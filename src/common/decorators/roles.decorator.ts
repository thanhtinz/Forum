import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  CanActivate,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);

const ROLE_HIERARCHY: Record<UserRole, number> = {
  GUEST: 0,
  MEMBER: 1,
  VIP: 2,
  MODERATOR: 3,
  ADMIN: 4,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Cần đăng nhập');

    const userLevel = ROLE_HIERARCHY[user.role as UserRole] ?? 0;
    const minRequired = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    }
    return true;
  }
}

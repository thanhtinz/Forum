import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from './permission.service';

export const PERMISSION_KEY = 'required_permission';
export const RequirePermission = (perm: string) => SetMetadata(PERMISSION_KEY, perm);

// Guard bổ sung: dùng cùng JwtAuthGuard. Kiểm tra user có quyền yêu cầu không.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly perms: PermissionService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Cần đăng nhập');
    if (req.user?.role === 'ADMIN') return true;
    const ok = await this.perms.can(userId, required);
    if (!ok) throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from './permission.service';
import { PrismaService } from '../../prisma/prisma.service';

export const PERMISSION_KEY = 'required_permission';
export const RequirePermission = (perm: string) => SetMetadata(PERMISSION_KEY, perm);

// Guard bổ sung: dùng cùng JwtAuthGuard. Kiểm tra user có quyền yêu cầu không,
// có tính đến quyền ghi đè riêng theo danh mục (categoryId) nếu xác định được.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly perms: PermissionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Cần đăng nhập');
    if (req.user?.role === 'ADMIN') return true;

    const categoryId = await this.resolveCategoryId(req);
    const ok = categoryId
      ? await this.perms.canInCategory(userId, required, categoryId)
      : await this.perms.can(userId, required);
    if (!ok) throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    return true;
  }

  /** Suy ra categoryId của hành động từ body/param để áp quyền ghi đè riêng theo danh mục. */
  private async resolveCategoryId(req: any): Promise<string | null> {
    const body = req.body || {};
    const params = req.params || {};
    if (body.categoryId) return body.categoryId;
    if (params.categoryId) return params.categoryId;
    if (body.threadId) {
      const t = await this.prisma.thread.findUnique({ where: { id: body.threadId }, select: { categoryId: true } }).catch(() => null);
      if (t) return t.categoryId;
    }
    if (params.id) {
      const t = await this.prisma.thread.findUnique({ where: { id: params.id }, select: { categoryId: true } }).catch(() => null);
      if (t) return t.categoryId;
    }
    return null;
  }
}

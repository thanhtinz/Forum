import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PermissionService } from './permission.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly perms: PermissionService) {}

  // Quyền hiệu lực của chính user (cho frontend ẩn/hiện UI)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('id') userId: string) {
    return { permissions: await this.perms.getUserPermissions(userId) };
  }

  @Get('catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  catalog() { return this.perms.listCatalog(); }

  @Get('groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  groups() { return this.perms.listGroups(); }

  @Post('groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() body: any) { return this.perms.createGroup(body); }

  @Patch('groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() body: any) { return this.perms.updateGroup(id, body); }

  @Delete('groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.perms.deleteGroup(id); }

  @Post('assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  assign(@Body() body: { userId: string; groupId: string }) { return this.perms.assignUser(body.userId, body.groupId); }

  @Post('unassign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  unassign(@Body() body: { userId: string; groupId: string }) { return this.perms.unassignUser(body.userId, body.groupId); }

  // Ghi đè quyền riêng theo từng danh mục/box (kiểu XenForo node permission)
  @Get('category/:categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  categoryOverrides(@Param('categoryId') categoryId: string) { return this.perms.listCategoryOverrides(categoryId); }

  @Post('category/:categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  setCategoryOverride(
    @Param('categoryId') categoryId: string,
    @Body() body: { groupId: string; permission: string; value: 'ALLOW' | 'DENY' | null },
  ) {
    return this.perms.setCategoryOverride(categoryId, body.groupId, body.permission, body.value);
  }
}

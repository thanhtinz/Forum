import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { VipService } from './vip.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { RolesGuard, Roles, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller()
export class VipController {
  constructor(private readonly vip: VipService) {}

  // Công khai: danh sách mốc + tiến trình của user
  @Get('vip/tiers')
  @UseGuards(OptionalJwtGuard)
  tiers(@CurrentUser('id') userId?: string) {
    return this.vip.listForUser(userId);
  }

  // ── Admin ──
  @Get('admin/vip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  list() { return this.vip.adminList(); }

  @Post('admin/vip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() data: any) { return this.vip.create(data); }

  @Patch('admin/vip/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() data: any) { return this.vip.update(id, data); }

  @Post('admin/vip/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) { return this.vip.remove(id); }
}

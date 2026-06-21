import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BannerService } from './banner.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/decorators/roles.decorator';

@Controller()
export class BannerController {
  constructor(private readonly banner: BannerService) {}

  // Công khai
  @Get('banners')
  active(@Query('position') position = 'home_top') {
    return this.banner.active(position);
  }

  // ── Admin ──
  @Get('admin/banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  list() { return this.banner.list(); }

  @Post('admin/banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() data: any) { return this.banner.create(data); }

  @Patch('admin/banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() data: any) { return this.banner.update(id, data); }

  @Post('admin/banners/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) { return this.banner.remove(id); }
}

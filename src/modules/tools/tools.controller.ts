import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ToolsService } from './tools.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/decorators/roles.decorator';

@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  list() {
    return this.tools.list();
  }

  @Get('popular')
  popular(@Query('limit') limit = 10) {
    return this.tools.popular(Number(limit));
  }

  // ── ADMIN ──
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminAll() {
    return this.tools.adminListAll();
  }

  @Post('admin/tool')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createTool(@Body() body: any) {
    return this.tools.createTool(body);
  }

  @Patch('admin/tool/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateTool(@Param('id') id: string, @Body() body: any) {
    return this.tools.updateTool(id, body);
  }

  @Delete('admin/tool/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteTool(@Param('id') id: string) {
    return this.tools.deleteTool(id);
  }

  @Post('admin/category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createCategory(@Body() body: any) {
    return this.tools.createCategory(body);
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.tools.getBySlug(slug);
  }

  @Post(':slug/use')
  use(@Param('slug') slug: string) {
    return this.tools.use(slug);
  }
}

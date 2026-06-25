import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';
import { ModAdminService } from './mod-admin.service';

// Kiểm duyệt nhanh theo username — dùng cho widget admin trên mọi trang
@Controller('mod')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR) // Moderator trở lên; Admin kế thừa
export class ModAdminController {
  constructor(private readonly mod: ModAdminService) {}

  @Get('user/:username')
  status(@Param('username') username: string) { return this.mod.status(username); }

  @Post('warn')
  warn(@CurrentUser('id') uid: string, @Body() b: { username: string; reason: string; points?: number }) {
    return this.mod.warn(uid, b.username, b.reason, b.points);
  }

  @Post('mute')
  mute(@CurrentUser('id') uid: string, @Body() b: { username: string; minutes: number; reason: string }) {
    return this.mod.mute(uid, b.username, Number(b.minutes), b.reason);
  }

  @Post('ban')
  @Roles(UserRole.ADMIN)
  ban(@CurrentUser('id') uid: string, @Body() b: { username: string; reason: string; days?: number }) {
    return this.mod.ban(uid, b.username, b.reason, b.days ? Number(b.days) : undefined);
  }

  @Post('unban')
  @Roles(UserRole.ADMIN)
  unban(@CurrentUser('id') uid: string, @Body() b: { username: string }) {
    return this.mod.unban(uid, b.username);
  }

  @Get('logs')
  getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.mod.getModLogs(page ? Number(page) : 1, limit ? Number(limit) : 50, actorId);
  }
}

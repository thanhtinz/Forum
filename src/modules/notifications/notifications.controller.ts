import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles, RolesGuard } from '../../common/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly push: PushService,
  ) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('page') page = 1) {
    return this.notifications.getUserNotifications(userId, Number(page));
  }

  // ── Web Push ──
  @Get('push/key')
  pushKey() { return this.push.getPublic(); }

  @Post('push/subscribe')
  subscribe(@CurrentUser('id') userId: string, @Body() sub: any) { return this.push.subscribe(userId, sub); }

  @Post('push/unsubscribe')
  unsubscribe(@Body('endpoint') endpoint: string) { return this.push.unsubscribe(endpoint); }

  // ── Tuỳ chọn email ──
  @Get('email-pref')
  getEmailPref(@CurrentUser('id') userId: string) { return this.notifications.getEmailNotify(userId); }

  @Post('email-pref')
  setEmailPref(@CurrentUser('id') userId: string, @Body('value') value: boolean) { return this.notifications.setEmailNotify(userId, !!value); }

  // ── Admin: cấu hình Web Push (VAPID) ──
  @Get('admin/push')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getPushConfig() { return this.push.getConfig(); }

  @Post('admin/push')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  setPushConfig(@Body() body: any) { return this.push.setConfig(body); }

  @Post('admin/push/generate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  generate() { return this.push.generateKeys(); }

  @Post(':id/read')
  read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(id, userId);
  }

  @Post('read-all')
  readAll(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }
}

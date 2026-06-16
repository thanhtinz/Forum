import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('page') page = 1) {
    return this.notifications.getUserNotifications(userId, Number(page));
  }

  @Post(':id/read')
  read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(id, userId);
  }

  @Post('read-all')
  readAll(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }
}

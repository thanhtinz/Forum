import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conv: ConversationService) {}

  @Get()
  listMine(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.conv.listMine(userId, Number(page), Number(limit));
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('id') userId: string) {
    return this.conv.unreadCount(userId).then((count) => ({ count }));
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: { recipientIds: string[]; title?: string; content: string },
  ) {
    return this.conv.create(userId, dto);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') convId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.conv.getMessages(convId, userId, Number(page), Number(limit));
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') convId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.conv.sendMessage(convId, userId, content);
  }

  @Delete(':id/messages/:msgId')
  deleteMessage(
    @Param('msgId') msgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.conv.deleteMessage(msgId, userId);
  }

  @Delete(':id/leave')
  leave(@Param('id') convId: string, @CurrentUser('id') userId: string) {
    return this.conv.leave(convId, userId);
  }
}

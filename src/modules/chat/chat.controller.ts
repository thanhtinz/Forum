import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('channels')
  getChannels(@CurrentUser('id') userId: string) {
    return this.chat.getUserChannels(userId);
  }

  @Get('global')
  getGlobal() {
    return this.chat.getGlobalChannel();
  }

  @Get('gifs')
  searchGifs(@Query('q') q: string) {
    return this.chat.searchGifs(q || '');
  }

  @Post('private')
  getPrivate(@CurrentUser('id') userId: string, @Body('targetUserId') targetUserId: string) {
    return this.chat.getOrCreatePrivateChannel(userId, targetUserId);
  }

  @Post('group')
  createGroup(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; memberIds: string[] },
  ) {
    return this.chat.createGroupChannel(userId, body.name, body.memberIds);
  }

  @Get('guild/:guildId')
  getGuildChannel(@CurrentUser('id') userId: string, @Param('guildId') guildId: string) {
    return this.chat.getGuildChannel(guildId, userId);
  }

  @Get('channels/:channelId/messages')
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Query('before') before?: string,
  ) {
    return this.chat.getMessages(channelId, userId, before);
  }

  @Get('stickers')
  getStickerPacks(@CurrentUser('id') userId: string) {
    return this.chat.getStickerPacks(userId);
  }
}

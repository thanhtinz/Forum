import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { BlockService } from './block.service';

@Controller('profile-extra')
export class ProfileExtraController {
  constructor(private readonly blocks: BlockService) {}

  // ── Block / Ignore users ──
  @Post('block/:userId')
  @UseGuards(JwtAuthGuard)
  toggleBlock(@CurrentUser('id') me: string, @Param('userId') userId: string) {
    return this.blocks.toggle(me, userId);
  }

  @Get('block/:userId/state')
  @UseGuards(JwtAuthGuard)
  async blockState(@CurrentUser('id') me: string, @Param('userId') userId: string) {
    return { blocked: await this.blocks.isBlocked(me, userId) };
  }

  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  listBlocked(@CurrentUser('id') me: string) {
    return this.blocks.listBlocked(me);
  }
}

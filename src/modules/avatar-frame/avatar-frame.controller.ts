import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AvatarFrameService } from './avatar-frame.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('avatar-frames')
export class AvatarFrameController {
  constructor(private readonly svc: AvatarFrameService) {}

  // Công khai — danh sách khung đang bán
  @Get()
  list() {
    return this.svc.listProducts();
  }

  @Get('inventory')
  @UseGuards(JwtAuthGuard)
  inventory(@CurrentUser('id') userId: string) {
    return this.svc.inventory(userId);
  }

  @Post('equip')
  @UseGuards(JwtAuthGuard)
  equip(@CurrentUser('id') userId: string, @Body() body: { frameId: string | null }) {
    return this.svc.equip(userId, body.frameId);
  }

  @Post(':id/buy')
  @UseGuards(JwtAuthGuard)
  buy(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: { currency: 'coin' | 'gem' }) {
    return this.svc.buy(userId, id, body.currency);
  }
}

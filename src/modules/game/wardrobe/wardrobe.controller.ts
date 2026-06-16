import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AvatarSlot } from '@prisma/client';
import { WardrobeService } from './wardrobe.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/roles.decorator';

@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobe: WardrobeService) {}

  // diện mạo công khai (cho render avatar người khác)
  @Get('look/:username')
  look(@Param('username') username: string) {
    return this.wardrobe.look(username);
  }

  @Get('shop')
  @UseGuards(JwtAuthGuard)
  shop(@CurrentUser('id') userId: string, @Query('slot') slot?: AvatarSlot) {
    return this.wardrobe.shop(userId, slot);
  }

  @Get('inventory')
  @UseGuards(JwtAuthGuard)
  inventory(@CurrentUser('id') userId: string) {
    return this.wardrobe.inventory(userId);
  }

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  buy(@CurrentUser('id') userId: string, @Body('slug') slug: string) {
    return this.wardrobe.buy(userId, slug);
  }

  @Post('equip')
  @UseGuards(JwtAuthGuard)
  equip(@CurrentUser('id') userId: string, @Body('slug') slug: string) {
    return this.wardrobe.equip(userId, slug);
  }

  @Post('unequip')
  @UseGuards(JwtAuthGuard)
  unequip(@CurrentUser('id') userId: string, @Body('slug') slug: string) {
    return this.wardrobe.unequip(userId, slug);
  }
}

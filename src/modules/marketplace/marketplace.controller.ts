import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateStorefrontDto, UpdateStorefrontDto } from './marketplace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  // ── Public ──
  @Get('storefronts')
  list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('q') q?: string,
  ) {
    return this.marketplace.listStorefronts(Number(page), Number(limit), q);
  }

  @Get('storefronts/:slug')
  @UseGuards(OptionalJwtGuard)
  getOne(@Param('slug') slug: string, @CurrentUser('id') viewerId?: string) {
    return this.marketplace.getStorefront(slug, viewerId);
  }

  // ── Seller dashboard ──
  @Get('me/storefront')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser('id') userId: string) {
    return this.marketplace.myStorefront(userId);
  }

  @Post('storefront')
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateStorefrontDto) {
    return this.marketplace.createStorefront(userId, dto);
  }

  @Patch('storefront')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateStorefrontDto) {
    return this.marketplace.updateStorefront(userId, dto);
  }

  // ── Follow ──
  @Post('storefronts/:id/follow')
  @UseGuards(JwtAuthGuard)
  follow(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.marketplace.follow(userId, id);
  }

  @Delete('storefronts/:id/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.marketplace.unfollow(userId, id);
  }
}

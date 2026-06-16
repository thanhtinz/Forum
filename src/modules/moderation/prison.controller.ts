import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrisonService } from './prison.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('prison')
@UseGuards(JwtAuthGuard)
export class PrisonController {
  constructor(private readonly prison: PrisonService) {}

  // ── Người chơi ──
  @Get('me')
  myStatus(@CurrentUser('id') userId: string) {
    return this.prison.myStatus(userId);
  }

  @Post('bail')
  bail(@CurrentUser('id') userId: string) {
    return this.prison.bail(userId);
  }

  // ── Giám thị (mod/admin) ──
  @Post('jail')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MODERATOR)
  jail(
    @CurrentUser('id') actorId: string,
    @Body() b: { username: string; minutes: number; reason: string; bailCoin?: number },
  ) {
    return this.prison.jail(actorId, b.username, Number(b.minutes), b.reason, Number(b.bailCoin ?? 0));
  }

  @Get('inmates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MODERATOR)
  inmates(@Query('page') page = 1, @Query('limit') limit = 25) {
    return this.prison.inmates(Number(page), Number(limit));
  }

  @Post('pardon/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MODERATOR)
  pardon(@Param('id') id: string) {
    return this.prison.pardon(id);
  }
}

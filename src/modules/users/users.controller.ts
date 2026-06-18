import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/ai')
  @UseGuards(JwtAuthGuard)
  getAiSettings(@CurrentUser('id') userId: string) {
    return this.usersService.getAiSettings(userId);
  }

  @Patch('me/ai')
  @UseGuards(JwtAuthGuard)
  updateAiSettings(
    @CurrentUser('id') userId: string,
    @Body() data: { provider?: string; model?: string; apiKey?: string; baseUrl?: string },
  ) {
    return this.usersService.updateAiSettings(userId, data);
  }

  @Get(':username')
  getProfile(@Param('username') username: string) {
    return this.usersService.getProfile(username);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() data: { displayName?: string; bio?: string; avatar?: string },
  ) {
    return this.usersService.updateProfile(userId, data);
  }
}

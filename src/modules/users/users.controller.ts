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

  // Thư viện avatar công khai để user chọn ảnh đại diện
  @Get('avatars/library')
  avatarLibrary() {
    return this.usersService.avatarLibrary();
  }

  // Thông tin giới thiệu của chính mình (cho trang cài đặt)
  @Get('me/about')
  @UseGuards(JwtAuthGuard)
  getMyAbout(@CurrentUser('id') userId: string) {
    return this.usersService.getMyAbout(userId);
  }

  @Get(':username')
  getProfile(@Param('username') username: string) {
    return this.usersService.getProfile(username);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() data: { displayName?: string; bio?: string; avatar?: string; location?: string; birthday?: string | null; showBirthday?: boolean },
  ) {
    return this.usersService.updateProfile(userId, data);
  }
}

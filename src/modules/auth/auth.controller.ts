import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, OAuthLoginDto } from './auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('oauth')
  oauth(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser('id') userId: string, @Body() b: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(userId, b.oldPassword, b.newPassword);
  }

  // ── 2FA ──
  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  twoFaStatus(@CurrentUser('id') userId: string) { return this.authService.twoFaStatus(userId); }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup2fa(@CurrentUser('id') userId: string) { return this.authService.setup2fa(userId); }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  enable2fa(@CurrentUser('id') userId: string, @Body('code') code: string) { return this.authService.enable2fa(userId, code); }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  disable2fa(@CurrentUser('id') userId: string, @Body('code') code: string) { return this.authService.disable2fa(userId, code); }
}

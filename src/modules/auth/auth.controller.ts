import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, GoogleLoginDto } from './auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Siết chặt riêng cho endpoint nhạy cảm (chống brute-force / spam) — chặt hơn
  // nhiều so với mức chung 120 req/phút mà các route thường dùng.
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 300_000 } }) // 5 tài khoản / 5 phút / IP
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 8, ttl: 60_000 } }) // 8 lần thử / phút / IP
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('oauth/google')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  oauthGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(@CurrentUser('id') userId: string, @Body() b: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(userId, b.oldPassword, b.newPassword);
  }

  // ── Email: xác thực & quên mật khẩu ──
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300_000 } }) // 3 email / 5 phút / IP (chống email-bombing)
  forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 8, ttl: 60_000 } }) // chống dò token
  resetPassword(@Body() b: { token: string; password: string }) {
    return this.authService.resetPassword(b.token, b.password);
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  resendVerification(@CurrentUser('id') userId: string) {
    return this.authService.resendVerification(userId);
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
  @Throttle({ default: { limit: 6, ttl: 60_000 } }) // chống dò mã 2FA
  enable2fa(@CurrentUser('id') userId: string, @Body('code') code: string) { return this.authService.enable2fa(userId, code); }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  disable2fa(@CurrentUser('id') userId: string, @Body('code') code: string) { return this.authService.disable2fa(userId, code); }
}

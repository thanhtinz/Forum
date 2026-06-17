import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CaptchaService } from './captcha.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/decorators/roles.decorator';

@Controller('security')
export class SecurityController {
  constructor(private readonly captcha: CaptchaService) {}

  // Công khai: frontend lấy để render widget
  @Get('captcha')
  publicConfig() {
    return this.captcha.getPublic();
  }

  @Get('admin/captcha')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getConfig() {
    return this.captcha.getConfig();
  }

  @Post('admin/captcha')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  setConfig(@Body() body: Record<string, any>) {
    return this.captcha.setConfig(body);
  }
}

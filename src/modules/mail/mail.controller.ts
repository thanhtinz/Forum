import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  @Get('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getConfig() {
    return this.mail.getConfig();
  }

  @Post('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  setConfig(@Body() body: Record<string, any>) {
    return this.mail.setConfig(body);
  }

  // Gửi email thử tới chính admin
  @Post('admin/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async test(@Body('to') to: string, @CurrentUser('email') email: string) {
    const dest = to || email;
    await this.mail.send(dest, 'Email thử nghiệm', this.mail.layout('Email hoạt động!', 'Cấu hình SMTP của diễn đàn đã hoạt động bình thường.'));
    return { ok: true, to: dest };
  }
}

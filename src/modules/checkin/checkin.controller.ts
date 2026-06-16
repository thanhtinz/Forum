import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CheckInService, CheckInConfigDto } from './checkin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('checkin')
export class CheckInController {
  constructor(private readonly checkin: CheckInService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser('id') userId: string) {
    return this.checkin.getStatus(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  checkIn(@CurrentUser('id') userId: string) {
    return this.checkin.checkIn(userId);
  }

  @Get('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getConfig() {
    return this.checkin.getConfig();
  }

  @Post('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  setConfig(@Body() dto: CheckInConfigDto) {
    return this.checkin.setConfig(dto);
  }
}

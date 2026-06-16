import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { VerificationService, SetRequirementsDto } from './verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  // ── User ──
  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser('id') userId: string) {
    return this.verification.getStatus(userId);
  }

  @Post('request')
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser('id') userId: string) {
    return this.verification.submitRequest(userId);
  }

  // ── Public ──
  @Get('requirements')
  requirements() {
    return this.verification.getRequirements();
  }

  // ── Admin ──
  @Get('admin/requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listRequests(@Query('status') status?: string) {
    return this.verification.listRequests(status);
  }

  @Post('admin/requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.verification.approve(id, adminId);
  }

  @Post('admin/requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('note') note?: string,
  ) {
    return this.verification.reject(id, adminId, note);
  }

  @Get('admin/requirements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getRequirements() {
    return this.verification.getRequirements();
  }

  @Post('admin/requirements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  setRequirements(@Body() dto: SetRequirementsDto) {
    return this.verification.setRequirements(dto);
  }
}

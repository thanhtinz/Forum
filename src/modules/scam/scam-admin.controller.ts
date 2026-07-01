import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles, CurrentUser } from '../../common/decorators/roles.decorator';
import { ScamCaseStatus } from '@prisma/client';
import { ScamAdminService } from './scam-admin.service';
import { AdminStatusDto, AppealActionDto, BlacklistDto, BroadcastDto } from './scam.dto';

@Controller('scam/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MODERATOR') // Moderator trở lên (Admin kế thừa)
export class ScamAdminController {
  constructor(private readonly admin: ScamAdminService) {}

  @Get('stats')
  stats() { return this.admin.stats(); }

  @Get('cases')
  cases(@Query('status') status?: ScamCaseStatus, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.admin.listCases({ status, q, page: Number(page), limit: Number(limit) });
  }

  @Patch('cases/:id/status')
  setStatus(@Param('id') id: string, @CurrentUser('id') uid: string, @Body() dto: AdminStatusDto) {
    return this.admin.updateStatus(id, uid, dto);
  }

  @Post('cases/:id/hide')
  hide(@Param('id') id: string, @CurrentUser('id') uid: string, @Body() b: { hidden: boolean }) {
    return this.admin.setHidden(id, !!b.hidden, uid);
  }

  @Delete('cases/:id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) { return this.admin.remove(id); }

  @Post('ban/:userId')
  @Roles('ADMIN')
  ban(@Param('userId') userId: string, @CurrentUser('id') uid: string) { return this.admin.banUser(userId, uid); }

  // Blacklist
  @Get('blacklist')
  listBlacklist(@Query('kind') kind?: string) { return this.admin.listBlacklist(kind); }
  @Post('blacklist')
  addBlacklist(@Body() dto: BlacklistDto, @CurrentUser('id') uid: string) { return this.admin.addBlacklist(dto, uid); }
  @Delete('blacklist/:id')
  rmBlacklist(@Param('id') id: string) { return this.admin.removeBlacklist(id); }

  // Khiếu nại
  @Get('appeals')
  appeals(@Query('status') status?: string) { return this.admin.listAppeals(status); }
  @Patch('appeals/:id')
  resolveAppeal(@Param('id') id: string, @CurrentUser('id') uid: string, @Body() dto: AppealActionDto) {
    return this.admin.resolveAppeal(id, dto.action, dto.modNote, uid);
  }

  @Post('broadcast')
  @Roles('ADMIN')
  broadcast(@Body() dto: BroadcastDto) { return this.admin.broadcast(dto); }

  @Get('export.csv')
  async export(@Res() res: Response, @Query('status') status?: ScamCaseStatus) {
    const csv = await this.admin.exportCsv(status);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="scam-cases.csv"');
    res.send('﻿' + csv); // BOM cho Excel hiển thị tiếng Việt
  }
}

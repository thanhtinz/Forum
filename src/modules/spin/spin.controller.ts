import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  SpinService,
  CreateWheelDto,
  UpdateWheelDto,
  SegmentDto,
} from './spin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  Roles,
  RolesGuard,
  CurrentUser,
} from '../../common/decorators/roles.decorator';

@Controller('spin')
export class SpinController {
  constructor(private readonly spin: SpinService) {}

  // ── Public ──
  @Get('wheel')
  wheel() {
    return this.spin.getActiveWheel();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  doSpin(@CurrentUser('id') userId: string) {
    return this.spin.spin(userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.spin.myHistory(userId, limit ? Number(limit) : 20);
  }

  // ── Admin ──
  @Get('admin/wheels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listWheels() {
    return this.spin.listWheels();
  }

  @Post('admin/wheels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createWheel(@Body() dto: CreateWheelDto) {
    return this.spin.createWheel(dto);
  }

  @Patch('admin/wheels/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateWheel(@Param('id') id: string, @Body() dto: UpdateWheelDto) {
    return this.spin.updateWheel(id, dto);
  }

  @Delete('admin/wheels/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteWheel(@Param('id') id: string) {
    return this.spin.deleteWheel(id);
  }

  @Post('admin/wheels/:id/segments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  addSegment(@Param('id') id: string, @Body() dto: SegmentDto) {
    return this.spin.addSegment(id, dto);
  }

  @Patch('admin/segments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateSegment(@Param('id') id: string, @Body() dto: SegmentDto) {
    return this.spin.updateSegment(id, dto);
  }

  @Delete('admin/segments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteSegment(@Param('id') id: string) {
    return this.spin.deleteSegment(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';
import { BlockService } from './block.service';
import {
  ProfileFieldService,
  CreateProfileFieldDto,
  UpdateProfileFieldDto,
} from './profile-field.service';

@Controller('profile-extra')
export class ProfileExtraController {
  constructor(
    private readonly blocks: BlockService,
    private readonly fields: ProfileFieldService,
  ) {}

  // ── Block / Ignore users ──
  @Post('block/:userId')
  @UseGuards(JwtAuthGuard)
  toggleBlock(@CurrentUser('id') me: string, @Param('userId') userId: string) {
    return this.blocks.toggle(me, userId);
  }

  @Get('block/:userId/state')
  @UseGuards(JwtAuthGuard)
  async blockState(@CurrentUser('id') me: string, @Param('userId') userId: string) {
    return { blocked: await this.blocks.isBlocked(me, userId) };
  }

  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  listBlocked(@CurrentUser('id') me: string) {
    return this.blocks.listBlocked(me);
  }

  // ── Custom profile fields (public read) ──
  @Get('fields')
  listFields() {
    return this.fields.listFields();
  }

  @Get('users/:userId/fields')
  getUserValues(@Param('userId') userId: string) {
    return this.fields.getUserValues(userId);
  }

  @Post('my-fields')
  @UseGuards(JwtAuthGuard)
  setMyValues(
    @CurrentUser('id') me: string,
    @Body() body: { values: { fieldId: string; value: string }[] },
  ) {
    return this.fields.setMyValues(me, body?.values ?? []);
  }

  // ── Admin: manage profile fields ──
  @Get('admin/fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminListFields() {
    return this.fields.listFields();
  }

  @Post('admin/fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createField(@Body() dto: CreateProfileFieldDto) {
    return this.fields.createField(dto);
  }

  @Patch('admin/fields/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateField(@Param('id') id: string, @Body() dto: UpdateProfileFieldDto) {
    return this.fields.updateField(id, dto);
  }

  @Delete('admin/fields/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteField(@Param('id') id: string) {
    return this.fields.deleteField(id);
  }
}

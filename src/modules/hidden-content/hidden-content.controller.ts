import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HiddenContentService } from './hidden-content.service';
import { CreateHiddenSectionDto, UpdateHiddenSectionDto, UnlockHiddenSectionDto } from './hidden-content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';

@Controller('hidden-content')
export class HiddenContentController {
  constructor(private readonly hiddenContentService: HiddenContentService) {}

  // Tạo hidden section cho một post
  @Post('sections')
  @UseGuards(JwtAuthGuard)
  async createSection(@Body() dto: CreateHiddenSectionDto, @Request() req: any) {
    return this.hiddenContentService.createSection(dto, req.user.id);
  }

  // Lấy danh sách hidden sections của một post (kèm trạng thái unlock)
  @Get('sections/post/:postId')
  @UseGuards(OptionalJwtGuard)
  async getSectionsForPost(
    @Param('postId') postId: string,
    @Query('threadId') threadId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id ?? null;
    return this.hiddenContentService.getSectionsForPost(postId, userId, threadId);
  }

  // Lấy đầy đủ hidden sections (kèm contentRaw) để sửa lại — chỉ tác giả bài viết hoặc mod/admin
  @Get('sections/post/:postId/edit')
  @UseGuards(JwtAuthGuard)
  async getSectionsForEdit(@Param('postId') postId: string, @Request() req: any) {
    return this.hiddenContentService.getSectionsForEdit(postId, req.user.id, req.user.role);
  }

  // Cập nhật 1 hidden section đã có (gọi khi sửa bài)
  @Patch('sections/:id')
  @UseGuards(JwtAuthGuard)
  async updateSection(@Param('id') id: string, @Body() dto: UpdateHiddenSectionDto, @Request() req: any) {
    return this.hiddenContentService.updateSection(id, dto, req.user.id, req.user.role);
  }

  // Mở khoá bằng Gem
  @Post('unlock/gem')
  @UseGuards(JwtAuthGuard)
  async unlockWithGem(@Body() dto: UnlockHiddenSectionDto, @Request() req: any) {
    return this.hiddenContentService.unlockWithGem(dto.hiddenSectionId, req.user.id);
  }
}

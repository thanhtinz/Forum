import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThreadPrefix, UserRole } from '@prisma/client';
import {
  ForumService,
  CreateThreadDto,
  CreatePostDto,
} from './forum.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('forum')
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  @Get('categories')
  categories() {
    return this.forum.listCategories();
  }

  // ── Threads ──
  @Get('threads')
  listThreads(
    @Query('categoryId') categoryId?: string,
    @Query('prefix') prefix?: ThreadPrefix,
    @Query('tagId') tagId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy?: 'lastPost' | 'createdAt' | 'views' | 'likes',
  ) {
    return this.forum.getThreadList({
      categoryId, prefix, tagId, page: Number(page), limit: Number(limit), sortBy,
    });
  }

  @Get('threads/:slug')
  @UseGuards(OptionalJwtGuard)
  getThread(@Param('slug') slug: string, @CurrentUser('id') userId?: string) {
    return this.forum.getThread(slug, userId);
  }

  @Post('threads')
  @UseGuards(JwtAuthGuard)
  createThread(@CurrentUser('id') userId: string, @Body() dto: CreateThreadDto) {
    return this.forum.createThread(dto, userId);
  }

  @Get('threads/:threadId/posts')
  @UseGuards(OptionalJwtGuard)
  getPosts(
    @Param('threadId') threadId: string,
    @CurrentUser('id') userId: string | undefined,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.forum.getPostsForThread(threadId, userId ?? null, Number(page), Number(limit));
  }

  // ── Posts ──
  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.forum.createPost(dto, userId);
  }

  @Post('posts/:id/react')
  @UseGuards(JwtAuthGuard)
  react(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body('emoji') emoji = 'like',
  ) {
    return this.forum.reactToPost(postId, userId, emoji);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body('reason') reason?: string,
  ) {
    return this.forum.deletePost(postId, userId, reason);
  }

  // ── Mod actions ──
  @Post('threads/:id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  pin(@Param('id') id: string, @Body('pin') pin = true) {
    return this.forum.pinThread(id, pin);
  }

  @Post('threads/:id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  lock(@Param('id') id: string, @Body('lock') lock = true) {
    return this.forum.lockThread(id, lock);
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BlockService } from '../profile-extra/block.service';
import { NotifType, UserRole } from '@prisma/client';

const AUTHOR_CARD = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
} as const;

@Injectable()
export class ProfilePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly block: BlockService,
  ) {}

  async create(authorId: string, wallId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('Nội dung không được để trống');
    if (text.length > 2000) throw new BadRequestException('Nội dung tối đa 2000 ký tự');

    const wall = await this.prisma.user.findUnique({
      where: { id: wallId },
      select: { id: true, username: true },
    });
    if (!wall) throw new NotFoundException('Không tìm thấy người dùng');

    const post = await this.prisma.profilePost.create({
      data: { authorId, wallId, content: text },
      include: {
        author: { select: AUTHOR_CARD },
        comments: { include: { author: { select: AUTHOR_CARD } } },
      },
    });

    if (authorId !== wallId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { username: true, displayName: true },
      });
      const actorName = actor?.displayName || actor?.username || 'Ai đó';
      await this.notifications.notify(wallId, {
        type: NotifType.SYSTEM,
        title: 'Bài viết mới trên tường nhà',
        body: `${actorName} đã viết lên tường nhà của bạn`,
        link: `/profile?u=${wall.username}`,
        actorId: authorId,
        targetType: 'profile_post',
        targetId: post.id,
      });
    }

    return post;
  }

  async list(wallId: string, page = 1, limit = 20, viewerId?: string) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where: any = { wallId };
    if (viewerId) {
      const blockedIds = await this.block.getBlockedIds(viewerId);
      if (blockedIds.length > 0) {
        where.authorId = { notIn: blockedIds };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.profilePost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          author: { select: AUTHOR_CARD },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: AUTHOR_CARD } },
          },
        },
      }),
      this.prisma.profilePost.count({ where }),
    ]);

    return { data, meta: { total, page: Number(page) || 1, limit: take } };
  }

  async addComment(postId: string, authorId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('Nội dung không được để trống');
    if (text.length > 2000) throw new BadRequestException('Nội dung tối đa 2000 ký tự');

    const post = await this.prisma.profilePost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, wallId: true, wall: { select: { username: true } } },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const comment = await this.prisma.profilePostComment.create({
      data: { profilePostId: postId, authorId, content: text },
      include: { author: { select: AUTHOR_CARD } },
    });

    if (post.authorId !== authorId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { username: true, displayName: true },
      });
      const actorName = actor?.displayName || actor?.username || 'Ai đó';
      await this.notifications.notify(post.authorId, {
        type: NotifType.SYSTEM,
        title: 'Bình luận mới',
        body: `${actorName} đã bình luận bài viết của bạn`,
        link: `/profile?u=${post.wall.username}`,
        actorId: authorId,
        targetType: 'profile_post',
        targetId: postId,
      });
    }

    return comment;
  }

  async remove(postId: string, userId: string, userRole: UserRole) {
    const post = await this.prisma.profilePost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, wallId: true },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const isMod = userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR;
    const canDelete = post.authorId === userId || post.wallId === userId || isMod;
    if (!canDelete) throw new ForbiddenException('Bạn không có quyền xóa bài viết này');

    await this.prisma.profilePost.delete({ where: { id: postId } });
    return { ok: true };
  }

  async like(postId: string, _userId: string) {
    const post = await this.prisma.profilePost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const updated = await this.prisma.profilePost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    });
    return updated;
  }
}

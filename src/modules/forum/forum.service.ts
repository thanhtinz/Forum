import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HiddenContentService } from '../hidden-content/hidden-content.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ThreadPrefix, ThreadStatus, UserRole } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { marked } from 'marked';
import slugify from 'slugify';
import { createId } from '@paralleldrive/cuid2';
import { CharacterService } from '../game/character/character.service';
import { TrophyService } from '../reputation/trophy.service';

export interface CreateThreadDto {
  categoryId: string;
  title: string;
  content: string; // raw BBCode/MD
  prefix?: ThreadPrefix;
  tagIds?: string[];
}

export interface CreatePostDto {
  threadId: string;
  content: string;
  parentId?: string; // quote reply
}

export interface ThreadListQuery {
  categoryId?: string;
  prefix?: ThreadPrefix;
  tagId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'lastPost' | 'createdAt' | 'views' | 'likes';
}

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hiddenContent: HiddenContentService,
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
    private readonly character: CharacterService,
    private readonly trophy: TrophyService,
  ) {}

  // ──────────────────────────────────────────────
  // THREADS
  // ──────────────────────────────────────────────

  async getThreadList(query: ThreadListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.prefix) where.prefix = query.prefix;
    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }

    const orderBy: any =
      query.sortBy === 'createdAt'
        ? { createdAt: 'desc' }
        : query.sortBy === 'views'
        ? { viewCount: 'desc' }
        : query.sortBy === 'likes'
        ? { likeCount: 'desc' }
        : { lastPostAt: 'desc' };

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, orderBy],
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          category: { select: { id: true, name: true, slug: true, color: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.thread.count({ where }),
    ]);

    return {
      data: threads,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getThread(slug: string, userId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, reputationScore: true, postCount: true, createdAt: true } },
        category: true,
        tags: { include: { tag: true } },
      },
    });
    if (!thread) throw new NotFoundException('Không tìm thấy bài viết');

    // Tăng view count (non-blocking)
    this.prisma.thread.update({
      where: { id: thread.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    // Ghi threadView cho user
    if (userId) {
      this.prisma.threadView.upsert({
        where: { userId_threadId: { userId, threadId: thread.id } },
        update: { viewedAt: new Date() },
        create: { userId, threadId: thread.id },
      }).catch(() => {});
    }

    return thread;
  }

  async createThread(dto: CreateThreadDto, authorId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category không tồn tại');

    const slug = await this.generateUniqueSlug(dto.title);
    const content = await this.renderContent(dto.content);

    const thread = await this.prisma.$transaction(async (tx) => {
      const t = await tx.thread.create({
        data: {
          categoryId: dto.categoryId,
          authorId,
          title: dto.title,
          slug,
          prefix: dto.prefix ?? ThreadPrefix.NONE,
          lastPostAt: new Date(),
          lastPostUserId: authorId,
        },
      });

      // Tạo post đầu tiên (= nội dung thread)
      await tx.post.create({
        data: {
          threadId: t.id,
          authorId,
          content,
          contentRaw: dto.content,
          isFirstPost: true,
        },
      });

      // Gắn tags
      if (dto.tagIds?.length) {
        await tx.threadTag.createMany({
          data: dto.tagIds.map((tagId) => ({ threadId: t.id, tagId })),
          skipDuplicates: true,
        });
        await tx.tag.updateMany({
          where: { id: { in: dto.tagIds } },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Update stats
      await tx.category.update({
        where: { id: dto.categoryId },
        data: { threadCount: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: authorId },
        data: { threadCount: { increment: 1 } },
      });

      return t;
    });

    this.events.emit('forum.thread.created', { threadId: thread.id, authorId });

    // Forum EXP → game level (cơ chế XenForo/Flarum)
    await this.character.addForumExp(authorId, 10, 'create_thread');
    // Kiểm tra & trao danh hiệu
    await this.trophy.checkAndAward(authorId);

    return thread;
  }

  // ──────────────────────────────────────────────
  // POSTS
  // ──────────────────────────────────────────────

  async getPostsForThread(threadId: string, userId: string | null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { threadId, isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true, username: true, displayName: true,
              avatar: true, role: true, postCount: true,
              reputationScore: true, createdAt: true,
            },
          },
          reactions: { select: { emoji: true, userId: true } },
          attachments: true,
        },
      }),
      this.prisma.post.count({ where: { threadId, isDeleted: false } }),
    ]);

    // Gắn hidden sections cho từng post
    const postsWithHidden = await Promise.all(
      posts.map(async (post) => {
        const hiddenSections = await this.hiddenContent.getSectionsForPost(
          post.id, userId, threadId,
        );
        return { ...post, hiddenSections };
      }),
    );

    return {
      data: postsWithHidden,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createPost(dto: CreatePostDto, authorId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: dto.threadId } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    if (thread.isLocked) throw new ForbiddenException('Thread đã bị khoá');

    const content = await this.renderContent(dto.content);

    const post = await this.prisma.$transaction(async (tx) => {
      const p = await tx.post.create({
        data: {
          threadId: dto.threadId,
          authorId,
          content,
          contentRaw: dto.content,
          parentId: dto.parentId ?? null,
        },
      });

      // Cập nhật thread
      await tx.thread.update({
        where: { id: dto.threadId },
        data: {
          replyCount: { increment: 1 },
          lastPostAt: new Date(),
          lastPostUserId: authorId,
        },
      });

      // Cập nhật category và user stats
      await tx.category.update({
        where: { id: thread.categoryId },
        data: { postCount: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: authorId },
        data: { postCount: { increment: 1 } },
      });

      return p;
    });

    // Auto-unlock hidden content dựa trên số comment mới
    const newCommentCount = thread.replyCount + 1;
    const firstPost = await this.prisma.post.findFirst({
      where: { threadId: dto.threadId, isFirstPost: true },
      select: { id: true, likeCount: true },
    });
    let unlockedSectionIds: string[] = [];
    if (firstPost) {
      unlockedSectionIds = await this.hiddenContent.checkAndAutoUnlock(
        firstPost.id,
        authorId,
        firstPost.likeCount,
        newCommentCount,
      );
    }

    // Emit events
    this.events.emit('forum.post.created', {
      postId: post.id,
      threadId: dto.threadId,
      authorId,
      threadAuthorId: thread.authorId,
      unlockedSectionIds,
    });

    // Forum EXP cho người trả lời
    await this.character.addForumExp(authorId, 5, 'create_post');
    await this.trophy.checkAndAward(authorId);

    // Notify thread author
    if (thread.authorId !== authorId) {
      await this.notifications.notify(thread.authorId, {
        type: 'THREAD_REPLY',
        title: 'Có người trả lời bài viết của bạn',
        body: thread.title,
        link: `/forum/${thread.slug}#post-${post.id}`,
        actorId: authorId,
      });
    }

    return post;
  }

  // ──────────────────────────────────────────────
  // REACTIONS (like/emoji)
  // ──────────────────────────────────────────────

  async reactToPost(postId: string, userId: string, emoji = 'like') {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, authorId: true, likeCount: true, thread: { select: { replyCount: true } } },
    });
    if (!post) throw new NotFoundException('Post không tồn tại');

    // Toggle reaction
    const existing = await this.prisma.postReaction.findUnique({
      where: { postId_userId_emoji: { postId, userId, emoji } },
    });

    let newLikeCount: number;

    if (existing) {
      // Bỏ reaction
      await this.prisma.$transaction([
        this.prisma.postReaction.delete({ where: { id: existing.id } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      newLikeCount = post.likeCount - 1;
    } else {
      // Thêm reaction
      await this.prisma.$transaction([
        this.prisma.postReaction.create({ data: { postId, userId, emoji } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      newLikeCount = post.likeCount + 1;

      // Check hidden content auto-unlock cho user này
      // (chỉ check section của post này khi có like mới)
      const unlockedIds = await this.hiddenContent.checkAndAutoUnlock(
        postId,
        userId,
        newLikeCount,
        post.thread.replyCount,
      );

      if (unlockedIds.length > 0) {
        this.events.emit('hidden.auto_unlocked', { userId, sectionIds: unlockedIds });
      }

      // Notify tác giả (không self-notify)
      if (post.authorId !== userId) {
        // Tác giả nhận EXP khi được like
        await this.character.addForumExp(post.authorId, 2, 'post_liked');
        await this.notifications.notify(post.authorId, {
          type: 'POST_LIKE',
          title: 'Bài viết của bạn được thích',
          link: `/forum/post/${postId}`,
          actorId: userId,
        });
      }
    }

    return { liked: !existing, likeCount: newLikeCount };
  }

  // ──────────────────────────────────────────────
  // ADMIN / MOD ACTIONS
  // ──────────────────────────────────────────────

  async pinThread(threadId: string, pin: boolean) {
    return this.prisma.thread.update({
      where: { id: threadId },
      data: { isPinned: pin },
    });
  }

  async lockThread(threadId: string, lock: boolean) {
    return this.prisma.thread.update({
      where: { id: threadId },
      data: { isLocked: lock },
    });
  }

  async deletePost(postId: string, deletedById: string, reason?: string) {
    return this.prisma.post.update({
      where: { id: postId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────

  private async generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title, { lower: true, strict: true, locale: 'vi' });
    const exists = await this.prisma.thread.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${createId().slice(0, 6)}`;
    return slug;
  }

  private async renderContent(raw: string): Promise<string> {
    return marked.parse(raw) as string;
  }
}

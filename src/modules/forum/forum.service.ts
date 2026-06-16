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
import { PrisonService } from '../moderation/prison.service';
import { ForumTextService } from './forum-text.service';
import { SubscriptionService } from './subscription.service';
import { TipService } from './tip.service';
import { UserRole as Role } from '@prisma/client';

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
    private readonly prison: PrisonService,
    private readonly text: ForumTextService,
    private readonly subs: SubscriptionService,
    private readonly tips: TipService,
  ) {}

  // ──────────────────────────────────────────────
  // THREADS
  // ──────────────────────────────────────────────

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, icon: true, color: true, threadCount: true, description: true },
    });
  }

  async getThreadList(query: ThreadListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = { isApproved: true };
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
    // Bài chờ duyệt: chỉ tác giả & mod xem được (mod xem qua queue bằng id)
    if (!thread.isApproved && thread.authorId !== userId) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

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
    await this.prison.assertNotJailed(authorId);
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category không tồn tại');

    const slug = await this.generateUniqueSlug(dto.title);
    const { html: content, mentioned } = await this.buildContent(dto.content, authorId);
    const pending = await this.needsApproval(authorId);

    const thread = await this.prisma.$transaction(async (tx) => {
      const t = await tx.thread.create({
        data: {
          categoryId: dto.categoryId,
          authorId,
          title: dto.title,
          slug,
          prefix: dto.prefix ?? ThreadPrefix.NONE,
          isApproved: !pending,
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
          isApproved: !pending,
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

      // Chỉ cập nhật thống kê khi đã được duyệt
      if (!pending) {
        await tx.category.update({ where: { id: dto.categoryId }, data: { threadCount: { increment: 1 } } });
        await tx.user.update({ where: { id: authorId }, data: { threadCount: { increment: 1 } } });
      }

      return t;
    });

    // Tác giả tự động theo dõi thread của mình
    await this.subs.ensure(thread.id, authorId);

    if (pending) {
      // Chờ duyệt: không phát event/EXP/notify cho tới khi mod duyệt
      return { ...thread, pendingApproval: true };
    }

    this.events.emit('forum.thread.created', { threadId: thread.id, authorId });
    await this.notifyMentions(mentioned, authorId, dto.title, `/forum/${slug}`);
    await this.character.addForumExp(authorId, 10, 'create_thread');
    await this.trophy.checkAndAward(authorId);

    return thread;
  }

  // FoF Approval: user cần duyệt nếu là MEMBER và postCount < ngưỡng cấu hình (0 = tắt)
  private async needsApproval(userId: string): Promise<boolean> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.approvalPostThreshold' } }).catch(() => null);
    const v = cfg?.value;
    const threshold = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
    if (!Number.isFinite(threshold) || threshold <= 0) return false;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, postCount: true, threadCount: true } });
    if (!user) return false;
    if (user.role !== Role.MEMBER) return false; // VIP/MOD/ADMIN miễn duyệt
    return (user.postCount + user.threadCount) < threshold;
  }

  // ──────────────────────────────────────────────
  // POSTS
  // ──────────────────────────────────────────────

  async getPostsForThread(threadId: string, userId: string | null, page = 1, limit = 20, canSeeUnapproved = false) {
    const skip = (page - 1) * limit;

    // Ẩn bài chờ duyệt với người khác (chỉ tác giả & mod thấy)
    const approvalFilter = canSeeUnapproved
      ? {}
      : { OR: [{ isApproved: true }, ...(userId ? [{ authorId: userId }] : [])] };
    const where = { threadId, isDeleted: false, ...approvalFilter };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
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
      this.prisma.post.count({ where }),
    ]);

    // Tổng donate theo từng post
    const tipTotals = await this.tips.totalsForPosts(posts.map((p) => p.id));

    // Gắn hidden sections + donate cho từng post
    const postsWithHidden = await Promise.all(
      posts.map(async (post) => {
        const hiddenSections = await this.hiddenContent.getSectionsForPost(
          post.id, userId, threadId,
        );
        const tip = tipTotals[post.id] || { total: 0, count: 0 };
        return { ...post, hiddenSections, tipTotal: tip.total, tipCount: tip.count };
      }),
    );

    return {
      data: postsWithHidden,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createPost(dto: CreatePostDto, authorId: string) {
    await this.prison.assertNotJailed(authorId);
    const thread = await this.prisma.thread.findUnique({ where: { id: dto.threadId } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    if (thread.isLocked) throw new ForbiddenException('Thread đã bị khoá');

    const { html: content, mentioned } = await this.buildContent(dto.content, authorId);
    const pending = await this.needsApproval(authorId);

    const post = await this.prisma.$transaction(async (tx) => {
      const p = await tx.post.create({
        data: {
          threadId: dto.threadId,
          authorId,
          content,
          contentRaw: dto.content,
          parentId: dto.parentId ?? null,
          isApproved: !pending,
        },
      });

      if (!pending) {
        await tx.thread.update({
          where: { id: dto.threadId },
          data: { replyCount: { increment: 1 }, lastPostAt: new Date(), lastPostUserId: authorId },
        });
        await tx.category.update({ where: { id: thread.categoryId }, data: { postCount: { increment: 1 } } });
        await tx.user.update({ where: { id: authorId }, data: { postCount: { increment: 1 } } });
      }

      return p;
    });

    // Người trả lời tự động theo dõi thread (kể cả khi chờ duyệt)
    await this.subs.ensure(dto.threadId, authorId);

    if (pending) {
      // Chờ duyệt: không cộng điểm/không thông báo cho tới khi mod duyệt
      return { ...post, pendingApproval: true };
    }

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

    // Thông báo cho người được @mention (trừ những người đã được notify dưới đây)
    const mentionedIds = mentioned.map((m) => m.id);
    await this.notifyMentions(mentioned.filter((m) => m.id !== thread.authorId), authorId, thread.title, `/forum/${thread.slug}#post-${post.id}`);
    // Thông báo cho người theo dõi thread (trừ tác giả & người được mention đã nhận)
    await this.subs.notifyNewReply(dto.threadId, thread.title, thread.slug, post.id, authorId, [thread.authorId, ...mentionedIds]);

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

      // Tự động chọn câu trả lời hay nhất khi đủ lượt reaction (FoF Best Answer auto)
      await this.maybeAutoBestAnswer(post.threadId, userId).catch(() => {});
    }

    return { liked: !existing, likeCount: newLikeCount };
  }

  // Admin: đọc / ghi ngưỡng tự chọn best answer
  async getAutoBestConfig() {
    return { threshold: await this.getAutoBestThreshold() };
  }
  async setAutoBestConfig(threshold: number) {
    const n = Number.isFinite(threshold) && threshold >= 0 ? Math.floor(threshold) : 10;
    await this.prisma.siteConfig.upsert({
      where: { key: 'forum.autoBestAnswerLikes' },
      update: { value: n },
      create: { key: 'forum.autoBestAnswerLikes', value: n },
    });
    return { threshold: n };
  }

  // Lấy ngưỡng like tự chọn best answer (0 = tắt)
  private async getAutoBestThreshold(): Promise<number> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.autoBestAnswerLikes' } }).catch(() => null);
    const v = cfg?.value;
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 10;
    return Number.isFinite(n) && n >= 0 ? n : 10;
  }

  // Nếu chưa có ai chọn thủ công, tự chọn (hoặc cập nhật) reply được like nhiều nhất làm best answer
  private async maybeAutoBestAnswer(threadId: string, actorId: string) {
    const threshold = await this.getAutoBestThreshold();
    if (threshold <= 0) return;

    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, slug: true, title: true, bestAnswerId: true, bestAnswerAuto: true },
    });
    if (!thread) return;
    // Tôn trọng lựa chọn thủ công — không ghi đè
    if (thread.bestAnswerId && !thread.bestAnswerAuto) return;

    // Reply được like nhiều nhất (không tính bài gốc)
    const top = await this.prisma.post.findFirst({
      where: { threadId, isFirstPost: false, isDeleted: false },
      orderBy: { likeCount: 'desc' },
      select: { id: true, authorId: true, likeCount: true },
    });
    if (!top || top.likeCount < threshold) return;
    if (top.id === thread.bestAnswerId) return; // đã là best answer rồi

    // Bỏ cờ bài auto cũ (nếu có)
    if (thread.bestAnswerId && thread.bestAnswerAuto) {
      await this.prisma.post.update({ where: { id: thread.bestAnswerId }, data: { isHelpful: false } }).catch(() => {});
    }

    await this.prisma.$transaction([
      this.prisma.thread.update({ where: { id: threadId }, data: { bestAnswerId: top.id, bestAnswerAuto: true } }),
      this.prisma.post.update({ where: { id: top.id }, data: { isHelpful: true } }),
    ]);

    // Thưởng + thông báo cho người trả lời (không tự thưởng cho actor đang like)
    if (top.authorId !== actorId) {
      await this.character.addForumExp(top.authorId, 15, 'best_answer_auto').catch(() => {});
    }
    await this.notifications.notify(top.authorId, {
      type: 'BEST_ANSWER',
      title: 'Câu trả lời của bạn được cộng đồng bình chọn là hay nhất! 🏆',
      body: thread.title,
      link: `/forum/${thread.slug}#post-${top.id}`,
      actorId,
    }).catch(() => {});
    await this.trophy.checkAndAward(top.authorId).catch(() => {});
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

  // ── Move (chuyển chuyên mục) ──
  async moveThread(threadId: string, categoryId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true, categoryId: true, replyCount: true } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    const target = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!target) throw new NotFoundException('Chuyên mục không tồn tại');
    if (thread.categoryId === categoryId) return thread;

    const postCount = await this.prisma.post.count({ where: { threadId, isDeleted: false } });
    await this.prisma.$transaction([
      this.prisma.thread.update({ where: { id: threadId }, data: { categoryId } }),
      this.prisma.category.update({ where: { id: thread.categoryId }, data: { threadCount: { decrement: 1 }, postCount: { decrement: postCount } } }),
      this.prisma.category.update({ where: { id: categoryId }, data: { threadCount: { increment: 1 }, postCount: { increment: postCount } } }),
    ]);
    return this.prisma.thread.findUnique({ where: { id: threadId } });
  }

  // ── Merge (gộp source vào target) ──
  async mergeThreads(sourceId: string, targetId: string) {
    if (sourceId === targetId) throw new BadRequestException('Không thể gộp chính nó');
    const [source, target] = await Promise.all([
      this.prisma.thread.findUnique({ where: { id: sourceId }, select: { id: true, categoryId: true, slug: true } }),
      this.prisma.thread.findUnique({ where: { id: targetId }, select: { id: true, categoryId: true } }),
    ]);
    if (!source || !target) throw new NotFoundException('Thread không tồn tại');

    // Bài gốc của source trở thành trả lời thường trong target
    const movedPosts = await this.prisma.post.count({ where: { threadId: sourceId, isDeleted: false } });

    await this.prisma.$transaction(async (tx) => {
      await tx.post.updateMany({ where: { threadId: sourceId }, data: { threadId: targetId, isFirstPost: false } });
      // Gộp subscriptions/bookmarks (bỏ trùng)
      const subs = await tx.threadSubscription.findMany({ where: { threadId: sourceId }, select: { userId: true } });
      for (const s of subs) await tx.threadSubscription.upsert({ where: { threadId_userId: { threadId: targetId, userId: s.userId } }, update: {}, create: { threadId: targetId, userId: s.userId } });
      await tx.threadSubscription.deleteMany({ where: { threadId: sourceId } });

      // Cập nhật số liệu target
      const total = await tx.post.count({ where: { threadId: targetId, isDeleted: false } });
      await tx.thread.update({ where: { id: targetId }, data: { replyCount: Math.max(0, total - 1), lastPostAt: new Date() } });
      // Giảm thống kê chuyên mục của source và xoá source
      await tx.category.update({ where: { id: source.categoryId }, data: { threadCount: { decrement: 1 } } });
      await tx.thread.delete({ where: { id: sourceId } });
    });

    return { mergedInto: targetId, movedPosts };
  }

  // ──────────────────────────────────────────────
  // APPROVAL QUEUE (FoF Approval)
  // ──────────────────────────────────────────────
  async listPendingApproval() {
    const [threads, posts] = await Promise.all([
      this.prisma.thread.findMany({
        where: { isApproved: false },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          category: { select: { name: true } },
          posts: { where: { isFirstPost: true }, select: { content: true }, take: 1 },
        },
      }),
      this.prisma.post.findMany({
        where: { isApproved: false, isFirstPost: false, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          thread: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);
    return { threads, posts };
  }

  async approveThread(threadId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    if (thread.isApproved) return thread;

    await this.prisma.$transaction([
      this.prisma.thread.update({ where: { id: threadId }, data: { isApproved: true } }),
      this.prisma.post.updateMany({ where: { threadId, isFirstPost: true }, data: { isApproved: true } }),
      this.prisma.category.update({ where: { id: thread.categoryId }, data: { threadCount: { increment: 1 } } }),
      this.prisma.user.update({ where: { id: thread.authorId }, data: { threadCount: { increment: 1 } } }),
    ]);

    this.events.emit('forum.thread.created', { threadId, authorId: thread.authorId });
    await this.character.addForumExp(thread.authorId, 10, 'create_thread').catch(() => {});
    await this.trophy.checkAndAward(thread.authorId).catch(() => {});
    await this.notifications.notify(thread.authorId, {
      type: 'SYSTEM', title: 'Bài viết của bạn đã được duyệt ✓', body: thread.title,
      link: `/forum/${thread.slug}`,
    }).catch(() => {});
    return { ...thread, isApproved: true };
  }

  async approvePost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { thread: { select: { id: true, categoryId: true, slug: true, title: true, authorId: true } } },
    });
    if (!post) throw new NotFoundException('Post không tồn tại');
    if (post.isApproved) return post;

    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id: postId }, data: { isApproved: true } }),
      this.prisma.thread.update({ where: { id: post.threadId }, data: { replyCount: { increment: 1 }, lastPostAt: new Date(), lastPostUserId: post.authorId } }),
      this.prisma.category.update({ where: { id: post.thread.categoryId }, data: { postCount: { increment: 1 } } }),
      this.prisma.user.update({ where: { id: post.authorId }, data: { postCount: { increment: 1 } } }),
    ]);

    await this.character.addForumExp(post.authorId, 5, 'create_post').catch(() => {});
    await this.trophy.checkAndAward(post.authorId).catch(() => {});

    // Thông báo trả lời mới + mention + subscribers (giờ mới phát vì đã duyệt)
    const mentioned = await this.text.resolveMentionedUsers(this.text.extractMentions(post.contentRaw), post.authorId);
    const mentionedIds = mentioned.map((m) => m.id);
    if (post.thread.authorId !== post.authorId) {
      await this.notifications.notify(post.thread.authorId, {
        type: 'THREAD_REPLY', title: 'Có người trả lời bài viết của bạn', body: post.thread.title,
        link: `/forum/${post.thread.slug}#post-${post.id}`, actorId: post.authorId,
      }).catch(() => {});
    }
    await this.notifyMentions(mentioned.filter((m) => m.id !== post.thread.authorId), post.authorId, post.thread.title, `/forum/${post.thread.slug}#post-${post.id}`);
    await this.subs.notifyNewReply(post.threadId, post.thread.title, post.thread.slug, post.id, post.authorId, [post.thread.authorId, ...mentionedIds]);
    await this.notifications.notify(post.authorId, {
      type: 'SYSTEM', title: 'Trả lời của bạn đã được duyệt ✓', body: post.thread.title,
      link: `/forum/${post.thread.slug}#post-${post.id}`,
    }).catch(() => {});
    return { ...post, isApproved: true };
  }

  async rejectContent(kind: 'thread' | 'post', id: string) {
    if (kind === 'thread') {
      const thread = await this.prisma.thread.findUnique({ where: { id }, select: { id: true, authorId: true, title: true, isApproved: true } });
      if (!thread) throw new NotFoundException('Thread không tồn tại');
      await this.prisma.thread.delete({ where: { id } });
      await this.notifications.notify(thread.authorId, { type: 'SYSTEM', title: 'Bài viết của bạn không được duyệt', body: thread.title }).catch(() => {});
    } else {
      const post = await this.prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
      if (!post) throw new NotFoundException('Post không tồn tại');
      await this.prisma.post.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      await this.notifications.notify(post.authorId, { type: 'SYSTEM', title: 'Trả lời của bạn không được duyệt' }).catch(() => {});
    }
    return { rejected: true };
  }

  // Admin: đọc/ghi ngưỡng duyệt bài (số bài tối thiểu để miễn duyệt; 0 = tắt)
  async getApprovalConfig() {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.approvalPostThreshold' } }).catch(() => null);
    const v = cfg?.value;
    const threshold = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : 0;
    return { threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 0 };
  }
  async setApprovalConfig(threshold: number) {
    const n = Number.isFinite(threshold) && threshold >= 0 ? Math.floor(threshold) : 0;
    await this.prisma.siteConfig.upsert({
      where: { key: 'forum.approvalPostThreshold' },
      update: { value: n }, create: { key: 'forum.approvalPostThreshold', value: n },
    });
    return { threshold: n };
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
    const censored = await this.text.censor(raw);
    return marked.parse(censored) as string;
  }

  // Render + lọc từ cấm + link @mention, trả về cả danh sách user được nhắc
  private async buildContent(raw: string, excludeUserId: string): Promise<{ html: string; mentioned: { id: string; username: string }[] }> {
    const censored = await this.text.censor(raw);
    let html = marked.parse(censored) as string;
    const usernames = this.text.extractMentions(censored);
    const mentioned = await this.text.resolveMentionedUsers(usernames, excludeUserId);
    if (mentioned.length) {
      const map = new Map(mentioned.map((u) => [u.username.toLowerCase(), u.username]));
      html = this.text.linkMentions(html, map);
    }
    return { html, mentioned };
  }

  private async notifyMentions(mentioned: { id: string }[], actorId: string, threadTitle: string, link: string) {
    await Promise.all(mentioned.map((u) =>
      this.notifications.notify(u.id, {
        type: 'POST_MENTION',
        title: 'Bạn được nhắc đến trong một bài viết',
        body: threadTitle,
        link,
        actorId,
      }).catch(() => {}),
    ));
  }

  // ──────────────────────────────────────────────
  // BEST ANSWER (Q&A) — chọn câu trả lời hay nhất
  // ──────────────────────────────────────────────
  async toggleBestAnswer(threadId: string, postId: string, userId: string, role: Role) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true, authorId: true, bestAnswerId: true, slug: true, title: true } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    const isMod = role === Role.ADMIN || role === Role.MODERATOR;
    if (thread.authorId !== userId && !isMod) throw new ForbiddenException('Chỉ tác giả hoặc mod chọn câu trả lời hay nhất');

    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true, threadId: true, authorId: true, isFirstPost: true } });
    if (!post || post.threadId !== threadId) throw new NotFoundException('Post không thuộc thread này');
    if (post.isFirstPost) throw new BadRequestException('Không thể chọn bài gốc làm câu trả lời');

    // Bỏ chọn bài cũ
    if (thread.bestAnswerId) {
      await this.prisma.post.update({ where: { id: thread.bestAnswerId }, data: { isHelpful: false } }).catch(() => {});
    }

    // Toggle: nếu bấm lại đúng bài đang chọn → bỏ chọn
    if (thread.bestAnswerId === postId) {
      await this.prisma.thread.update({ where: { id: threadId }, data: { bestAnswerId: null, bestAnswerAuto: false } });
      return { bestAnswerId: null };
    }

    await this.prisma.$transaction([
      // bestAnswerAuto=false → khoá lựa chọn thủ công, auto sẽ không ghi đè
      this.prisma.thread.update({ where: { id: threadId }, data: { bestAnswerId: postId, bestAnswerAuto: false } }),
      this.prisma.post.update({ where: { id: postId }, data: { isHelpful: true } }),
    ]);

    // Thưởng EXP + thông báo cho người trả lời
    if (post.authorId !== userId) {
      await this.character.addForumExp(post.authorId, 15, 'best_answer').catch(() => {});
      await this.notifications.notify(post.authorId, {
        type: 'BEST_ANSWER',
        title: 'Câu trả lời của bạn được chọn là hay nhất! 🏆',
        body: thread.title,
        link: `/forum/${thread.slug}#post-${postId}`,
        actorId: userId,
      }).catch(() => {});
    }
    await this.trophy.checkAndAward(post.authorId).catch(() => {});

    return { bestAnswerId: postId };
  }
}
